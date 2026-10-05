// Workout tab: today's exercises with check-off, per-exercise weight and
// notes inputs, a live timer, a progress bar, and a finish flow that saves
// the session and shows a summary sheet. Respects the weekly schedule,
// so custom routines assigned to today appear here automatically.
//
// The in-progress session is persisted to AsyncStorage on every change, so
// killing the app mid-workout loses nothing: reopening the tab today
// restores the session and resumes the timer from the original start time.

import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react';
import {
  ActivityIndicator,
  Alert,
  Animated,
  Easing,
  KeyboardAvoidingView,
  Modal,
  Platform,
  ScrollView,
  Share,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors, radius, spacing } from '../../lib/theme';
import { Storage } from '../../lib/storage';
import { toast } from '../../lib/toast';
import { impactLight, notifySuccess } from '../../lib/haptics';
import { keepAwakeOff, keepAwakeOn } from '../../lib/keepAwake';
import RestTimer from '../../components/RestTimer';
import { bestWeightByExercise } from '../../lib/records';
import {
  endWorkoutIsland,
  startWorkoutIsland,
  updateWorkoutIsland,
} from '../../lib/liveActivity';
import {
  formatElapsed,
  getRepeatPayload,
  getTodaysWorkout,
  persistFinishedWorkout,
  toDateKey,
  type ExerciseDef,
  type HistoryEntry,
  type RepeatPayload,
  type ResolvedWorkout,
} from '../../lib/workout';

interface ExerciseState {
  def: ExerciseDef;
  completed: boolean;
  weight: string;
  notes: string;
}

interface Summary {
  title: string;
  durationLabel: string;
  exercisesCompleted: number;
  totalExercises: number;
  calories: number;
}

/** What gets written to storage so an interrupted workout can resume. */
interface PersistedSession {
  dateKey: string;
  startedAt: number;
  title: string;
  exercises: ExerciseState[];
}

const SESSION_KEY = 'inProgressWorkout';

/** Maps a Live Activity failure to something the user can act on. */
function friendlyIslandError(reason: string | null): string {
  if (reason?.includes('disabled in iOS Settings')) {
    return 'Live Activities are off: Settings > Face ID & Passcode > Live Activities.';
  }
  if (reason?.includes('bridge')) {
    return 'Workout island failed to start. Reinstall the app and try again.';
  }
  return 'Live Activity could not start on this iPhone.';
}

/**
 * Starts the Dynamic Island activity and tells the user when it fails,
 * instead of leaving an empty island with no explanation. A few seconds
 * after a successful start, verifies iOS didn't kill the activity
 * immediately; if it did and it can't come back, say so.
 */
async function startIslandWithFeedback(
  title: string,
  total: number,
  startedAtMs: number,
  completed: number,
  isStillActive: () => boolean
): Promise<void> {
  try {
    const res = await startWorkoutIsland(title, total, startedAtMs, completed);
    if (!res.ok) {
      if (res.reason) toast(friendlyIslandError(res.reason));
      return;
    }
    setTimeout(async () => {
      if (!isStillActive()) return;
      try {
        const alive = await updateWorkoutIsland(completed, total, startedAtMs);
        if (!alive) {
          toast(
            'iOS dismissed the workout island. Check Settings > Face ID & Passcode > Live Activities.'
          );
        }
      } catch {
        // The workout never depends on the island.
      }
    }, 3000);
  } catch {
    // The workout never depends on the island.
  }
}

/** Checkbox that springs (scale 1 -> 1.3 -> 1) on toggle. A separate component
 *  so each row animates independently without re-rendering siblings. */
function CheckButton({
  completed,
  onToggle,
  label,
}: {
  completed: boolean;
  onToggle: () => void;
  label: string;
}) {
  const scale = useRef(new Animated.Value(1)).current;
  const prevCompleted = useRef(completed);

  useEffect(() => {
    if (completed !== prevCompleted.current) {
      prevCompleted.current = completed;
      Animated.sequence([
        Animated.timing(scale, {
          toValue: 1.3,
          duration: 150,
          easing: Easing.out(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(scale, {
          toValue: 1,
          duration: 150,
          easing: Easing.out(Easing.ease),
          useNativeDriver: true,
        }),
      ]).start();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [completed]);

  return (
    <Animated.View style={{ transform: [{ scale }] }}>
      <TouchableOpacity
        style={[styles.checkbox, completed && styles.checkboxChecked]}
        onPress={onToggle}
        accessibilityLabel={label}
        activeOpacity={0.7}
      >
        {completed && <Ionicons name="checkmark" size={20} color="#ffffff" />}
      </TouchableOpacity>
    </Animated.View>
  );
}

/** Springs the workout summary card in when the modal appears. */
function ScaleIn({ children }: { children: ReactNode }) {
  const scale = useRef(new Animated.Value(0.9)).current;
  const opacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.spring(scale, { toValue: 1, useNativeDriver: true, tension: 140, friction: 12 }),
      Animated.timing(opacity, { toValue: 1, duration: 150, useNativeDriver: true }),
    ]).start();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <Animated.View style={[styles.modalCard, { opacity, transform: [{ scale }] }]}>
      {children}
    </Animated.View>
  );
}

export default function Workout() {
  const router = useRouter();
  const [workout, setWorkout] = useState<ResolvedWorkout | null>(null);
  const [exercises, setExercises] = useState<ExerciseState[]>([]);
  const [elapsedMs, setElapsedMs] = useState(0);
  const [sessionDateKey, setSessionDateKey] = useState<string | null>(null);
  const [loggedToday, setLoggedToday] = useState(false);
  const [summary, setSummary] = useState<Summary | null>(null);
  const [finishing, setFinishing] = useState(false);
  const [restVisible, setRestVisible] = useState(false);
  const [restSecs, setRestSecs] = useState(60);
  const [restAuto, setRestAuto] = useState(true);
  // Best completed weight per exercise, for mid-workout PR detection.
  const recordsRef = useRef<Map<string, number>>(new Map());
  const startTimeRef = useRef<number>(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  // Non-reactive mirror used by event handlers to persist without stale closures.
  const sessionRef = useRef<{ dateKey: string; startedAt: number; title: string } | null>(null);

  const stopTimer = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  /** Writes the current session to storage; silent no-op when there is none. */
  const writeSession = (exercisesToSave: ExerciseState[]) => {
    const meta = sessionRef.current;
    if (!meta) return;
    const payload: PersistedSession = {
      dateKey: meta.dateKey,
      startedAt: meta.startedAt,
      title: meta.title,
      exercises: exercisesToSave,
    };
    void Storage.set(SESSION_KEY, payload);
  };

  const startTicking = useCallback(() => {
    stopTimer();
    timerRef.current = setInterval(() => {
      setElapsedMs(Date.now() - startTimeRef.current);
    }, 1000);
  }, [stopTimer]);

  const startSession = useCallback(
    (resolved: ResolvedWorkout, dateKey: string, startedAt?: number, prefillWeights?: string[]) => {
      const start = startedAt ?? Date.now();
      startTimeRef.current = start;
      sessionRef.current = { dateKey, startedAt: start, title: resolved.title };
      const fresh = resolved.exercises.map((def, i) => ({
        def,
        completed: false,
        weight: prefillWeights?.[i] ?? '',
        notes: '',
      }));
      setElapsedMs(startedAt ? Date.now() - start : 0);
      setExercises(fresh);
      setSessionDateKey(dateKey);
      setLoggedToday(false);
      writeSession(fresh);
      void keepAwakeOn();
      startTicking();
      void startIslandWithFeedback(
        resolved.title,
        fresh.length,
        start,
        0,
        () => sessionRef.current?.startedAt === start
      );
    },
    [startTicking]
  );

  /** Restores an interrupted session stored earlier today. */
  const restoreSession = useCallback(
    (stored: PersistedSession, dateKey: string) => {
      startTimeRef.current = stored.startedAt;
      sessionRef.current = { dateKey, startedAt: stored.startedAt, title: stored.title };
      setWorkout({
        title: stored.title,
        isRest: false,
        exercises: stored.exercises.map((ex) => ex.def),
        subtitle: `${stored.exercises.length} exercise${stored.exercises.length === 1 ? '' : 's'}`,
      });
      setExercises(stored.exercises);
      setElapsedMs(Date.now() - stored.startedAt);
      setSessionDateKey(dateKey);
      setLoggedToday(false);
      void keepAwakeOn();
      startTicking();
      const doneCount = stored.exercises.filter((ex) => ex.completed).length;
      void startIslandWithFeedback(
        stored.title,
        stored.exercises.length,
        stored.startedAt,
        doneCount,
        () => sessionRef.current?.startedAt === stored.startedAt
      );
    },
    [startTicking]
  );

  // Every time the tab is focused: start a fresh session for a new day,
  // restore an interrupted session from today, otherwise leave the
  // in-progress session exactly as the user left it.
  useFocusEffect(
    useCallback(() => {
      let cancelled = false;
      (async () => {
        const todayKey = toDateKey(new Date());
        if (todayKey === sessionDateKey) return; // resume, do not reset
        const [resolved, storedRestSecs, storedRestAuto, history, pending] = await Promise.all([
          getTodaysWorkout(),
          Storage.get<number>('restTimerSecs', 60),
          Storage.get<boolean>('restTimerAuto', true),
          Storage.get<HistoryEntry[]>('workoutHistory', []),
          Storage.get<RepeatPayload | null>('pendingRepeat', null),
        ]);
        if (cancelled) return;
        setRestSecs(storedRestSecs);
        setRestAuto(storedRestAuto);
        recordsRef.current = bestWeightByExercise(history);
        if (pending && pending.defs.length > 0) {
          // One-tap repeat from Home: redo the last session with its weights.
          await Storage.remove('pendingRepeat');
          const repeatResolved: ResolvedWorkout = {
            title: pending.title,
            isRest: false,
            exercises: pending.defs,
            subtitle: `${pending.defs.length} exercises · repeating last session`,
          };
          setWorkout(repeatResolved);
          startSession(repeatResolved, todayKey, undefined, pending.weights);
          return;
        }
        setWorkout(resolved);
        if (resolved.isRest) {
          // Rest days never hold a session; drop anything stale.
          setSessionDateKey(todayKey);
          sessionRef.current = null;
          await Storage.remove(SESSION_KEY);
          await keepAwakeOff();
          return;
        }
        const stored = await Storage.get<PersistedSession | null>(SESSION_KEY, null);
        if (cancelled) return;
        if (stored && stored.dateKey === todayKey && stored.exercises.length > 0) {
          restoreSession(stored, todayKey);
        } else {
          if (stored) await Storage.remove(SESSION_KEY); // stale session, discard silently
          startSession(resolved, todayKey);
        }
      })();
      return () => {
        cancelled = true;
      };
    }, [sessionDateKey, restoreSession, startSession])
  );

  useEffect(
    () => () => {
      stopTimer();
      void keepAwakeOff();
    },
    [stopTimer]
  );

  const toggleExercise = (index: number) => {
    const wasCompleted = exercises[index].completed;
    const next = exercises.map((ex, i) =>
      i === index ? { ...ex, completed: !ex.completed } : ex
    );
    setExercises(next);
    writeSession(next);
    void impactLight();
    if (!wasCompleted) {
      // New personal record? Only counts when there is a previous best to beat.
      const w = parseFloat(exercises[index].weight);
      if (!Number.isNaN(w) && w > 0) {
        const name = exercises[index].def.name;
        const prevBest = recordsRef.current.get(name) ?? 0;
        if (prevBest > 0 && w > prevBest) {
          recordsRef.current.set(name, w);
          void notifySuccess();
          toast(`New PR! ${name}: ${w} kg`);
        }
      }
      // Checking off a set starts the rest timer when auto-rest is on.
      if (restAuto) setRestVisible(true);
    }
    void updateWorkoutIsland(
      next.filter((ex) => ex.completed).length,
      next.length,
      startTimeRef.current
    );
  };

  const updateField = (index: number, field: 'weight' | 'notes', value: string) => {
    const next = exercises.map((ex, i) => (i === index ? { ...ex, [field]: value } : ex));
    setExercises(next);
    writeSession(next);
  };

  const completedCount = exercises.filter((ex) => ex.completed).length;
  const progress = exercises.length === 0 ? 0 : completedCount / exercises.length;

  // Animated progress bar: eases to the new value over 250ms instead of jumping.
  const progressAnim = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.timing(progressAnim, {
      toValue: progress,
      duration: 250,
      easing: Easing.ease,
      useNativeDriver: false,
    }).start();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [progress]);
  const progressWidth = progressAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0%', '100%'],
  });

  const finishWorkout = async () => {
    if (!workout || finishing) return;
    setFinishing(true);
    stopTimer();
    const durationMs = Date.now() - startTimeRef.current;

    const exerciseData = exercises.map((ex) => ({
      name: ex.def.name,
      completed: ex.completed,
      weight: ex.weight.trim() ? Number(ex.weight) : null,
      notes: ex.notes.trim() || null,
    }));

    const { durationLabel, calories } = await persistFinishedWorkout({
      title: workout.title,
      exercisesCompleted: completedCount,
      totalExercises: exercises.length,
      durationMs,
      exerciseData,
    });

    // Session is done: clear the persisted copy, release the wake lock,
    // and dismiss the Dynamic Island activity.
    sessionRef.current = null;
    await Storage.remove(SESSION_KEY);
    await keepAwakeOff();
    void endWorkoutIsland();
    void notifySuccess();
    toast('Workout saved to history');

    setLoggedToday(true);
    setFinishing(false);
    setSummary({
      title: workout.title,
      durationLabel,
      exercisesCompleted: completedCount,
      totalExercises: exercises.length,
      calories,
    });
  };

  const confirmFinish = () => {
    Alert.alert('Finish workout?', 'Your progress will be saved to history.', [
      { text: 'Keep Going', style: 'cancel' },
      { text: 'Finish', style: 'default', onPress: () => void finishWorkout() },
    ]);
  };

  const shareSummary = async () => {
    if (!summary) return;
    const message =
      `Just finished ${summary.title} with GymSync: ` +
      `${summary.exercisesCompleted}/${summary.totalExercises} exercises, ` +
      `${summary.durationLabel}, ~${summary.calories} kcal.`;
    try {
      await Share.share({ message });
    } catch {
      // Dismissed or failed; stay silent.
    }
  };

  if (!workout) {
    return (
      <SafeAreaView style={styles.centered} edges={['top']}>
        <ActivityIndicator size="large" color={colors.primaryStrong} />
      </SafeAreaView>
    );
  }

  if (workout.isRest) {
    return (
      <SafeAreaView style={styles.centered} edges={['top']}>
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Rest Day</Text>
          <Text style={styles.muted}>Nothing scheduled today. Recovery is part of the process.</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.screen} edges={['top']}>
      <KeyboardAvoidingView
        style={styles.scroll}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <View style={styles.header}>
          <View>
            <Text style={styles.headerLabel}>{workout.title}</Text>
            <Text style={styles.headerTitle}>
              {workout.title.charAt(0) + workout.title.slice(1).toLowerCase()} Day
            </Text>
          </View>
          <View style={styles.headerRight}>
            <TouchableOpacity
              style={styles.restButton}
              onPress={() => router.push('/plate-calculator')}
              activeOpacity={0.8}
              accessibilityLabel="Open plate calculator"
            >
              <Ionicons name="disc-outline" size={18} color={colors.primaryStrong} />
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.restButton}
              onPress={() => {
                void impactLight();
                setRestVisible(true);
              }}
              activeOpacity={0.8}
              accessibilityLabel="Start rest timer"
            >
              <Ionicons name="timer-outline" size={18} color={colors.primaryStrong} />
              <Text style={styles.restButtonText}>Rest</Text>
            </TouchableOpacity>
            <View style={styles.timer}>
              <View style={styles.timerDot} />
              <Text style={styles.timerText}>{formatElapsed(elapsedMs)}</Text>
            </View>
          </View>
        </View>

        <View style={styles.progressTrack}>
          <Animated.View style={[styles.progressFill, { width: progressWidth }]} />
        </View>
        <Text style={styles.progressLabel}>
          {completedCount} of {exercises.length} exercises completed
        </Text>

        {loggedToday && (
          <View style={styles.loggedBanner}>
            <Ionicons name="checkmark-circle" size={18} color={colors.primaryStrong} />
            <Text style={styles.loggedText}>Today's workout is already logged. See you tomorrow.</Text>
          </View>
        )}

        {exercises.map((ex, index) => (
          <View key={ex.def.id} style={styles.card}>
            <View style={styles.exerciseTop}>
              <View style={styles.exerciseInfo}>
                <Text style={styles.exerciseName}>{ex.def.name}</Text>
                <Text style={styles.exerciseTarget}>
                  {ex.def.targetSets} sets x {ex.def.targetReps} reps
                </Text>
              </View>
              <CheckButton
                completed={ex.completed}
                onToggle={() => toggleExercise(index)}
                label={`Mark ${ex.def.name} complete`}
              />
            </View>
            <View style={styles.inputRow}>
              <View style={styles.inputWrap}>
                <Text style={styles.inputLabel}>Weight (kg)</Text>
                <TextInput
                  style={styles.input}
                  value={ex.weight}
                  onChangeText={(v) => updateField(index, 'weight', v)}
                  placeholder="0"
                  placeholderTextColor={colors.textTertiary}
                  keyboardType="decimal-pad"
                />
              </View>
              <View style={[styles.inputWrap, styles.notesWrap]}>
                <Text style={styles.inputLabel}>Notes</Text>
                <TextInput
                  style={styles.input}
                  value={ex.notes}
                  onChangeText={(v) => updateField(index, 'notes', v)}
                  placeholder="Optional notes"
                  placeholderTextColor={colors.textTertiary}
                  maxLength={80}
                />
              </View>
            </View>
          </View>
        ))}

        <TouchableOpacity
          style={[styles.finishButton, loggedToday && styles.finishButtonDisabled]}
          onPress={confirmFinish}
          disabled={loggedToday || finishing}
          activeOpacity={0.85}
        >
          <Text style={styles.finishButtonText}>{finishing ? 'Saving' : 'Finish Workout'}</Text>
        </TouchableOpacity>
      </ScrollView>

      {/* Summary sheet after finishing, like the web app's overlay. */}
      <Modal visible={summary !== null} transparent animationType="fade">
        <View style={styles.modalBackdrop}>
          <ScaleIn>
            <Text style={styles.modalTitle}>Workout Complete</Text>
            <Text style={styles.modalSubtitle}>{summary?.title}</Text>
            <View style={styles.summaryRow}>
              <View style={styles.summaryStat}>
                <Text style={styles.summaryValue}>{summary?.durationLabel}</Text>
                <Text style={styles.summaryLabel}>Duration</Text>
              </View>
              <View style={styles.summaryStat}>
                <Text style={styles.summaryValue}>
                  {summary?.exercisesCompleted}/{summary?.totalExercises}
                </Text>
                <Text style={styles.summaryLabel}>Exercises</Text>
              </View>
              <View style={styles.summaryStat}>
                <Text style={styles.summaryValue}>{summary?.calories}</Text>
                <Text style={styles.summaryLabel}>Calories</Text>
              </View>
            </View>
            <Text style={styles.modalNote}>Great work. Your progress has been saved.</Text>
            <View style={styles.summaryActions}>
              <TouchableOpacity
                style={[styles.summaryButton, styles.shareButton]}
                onPress={() => void shareSummary()}
                activeOpacity={0.85}
              >
                <Ionicons name="share-outline" size={18} color={colors.primaryStrong} />
                <Text style={styles.shareButtonText}>Share</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.summaryButton, styles.startButton]}
                onPress={() => {
                  setSummary(null);
                  router.navigate('/');
                }}
                activeOpacity={0.85}
              >
                <Text style={styles.startButtonText}>Done</Text>
              </TouchableOpacity>
            </View>
          </ScaleIn>
        </View>
      </Modal>
    </KeyboardAvoidingView>

      <RestTimer
        visible={restVisible}
        initialSecs={restSecs}
        onClose={() => setRestVisible(false)}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.background,
  },
  scroll: {
    flex: 1,
  },
  content: {
    padding: spacing.lg,
    paddingBottom: spacing.xl,
    gap: spacing.md,
  },
  centered: {
    flex: 1,
    backgroundColor: colors.background,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.lg,
  },
  card: {
    backgroundColor: colors.card,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: radius.lg,
    padding: spacing.md,
  },
  cardTitle: {
    color: colors.text,
    fontSize: 22,
    fontWeight: '700',
    marginBottom: spacing.xs,
  },
  muted: {
    color: colors.textSecondary,
    fontSize: 15,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: spacing.md,
  },
  headerLabel: {
    color: colors.textSecondary,
    fontSize: 13,
    letterSpacing: 1,
  },
  headerTitle: {
    color: colors.text,
    fontSize: 26,
    fontWeight: '700',
  },
  timer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    backgroundColor: colors.card,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: radius.md,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  restButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: colors.card,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: radius.md,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
  },
  restButtonText: {
    color: colors.primaryStrong,
    fontSize: 14,
    fontWeight: '600',
  },
  timerDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.primaryStrong,
  },
  timerText: {
    color: colors.text,
    fontSize: 16,
    fontWeight: '600',
    fontVariant: ['tabular-nums'],
  },
  progressTrack: {
    height: 8,
    backgroundColor: colors.card,
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: colors.primaryStrong,
    borderRadius: 4,
  },
  progressLabel: {
    color: colors.textSecondary,
    fontSize: 13,
    marginTop: -spacing.xs,
  },
  loggedBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    backgroundColor: colors.card,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: radius.md,
    padding: spacing.sm,
  },
  loggedText: {
    color: colors.textSecondary,
    fontSize: 14,
    flex: 1,
  },
  exerciseTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  exerciseInfo: {
    flex: 1,
  },
  exerciseName: {
    color: colors.text,
    fontSize: 17,
    fontWeight: '600',
  },
  exerciseTarget: {
    color: colors.textSecondary,
    fontSize: 14,
    marginTop: 2,
  },
  checkbox: {
    width: 34,
    height: 34,
    borderRadius: 17,
    borderWidth: 2,
    borderColor: colors.borderStrong,
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkboxChecked: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  inputRow: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  inputWrap: {
    flex: 1,
  },
  notesWrap: {
    flex: 2,
  },
  inputLabel: {
    color: colors.textTertiary,
    fontSize: 12,
    marginBottom: 4,
  },
  input: {
    backgroundColor: colors.elevated,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: radius.sm,
    color: colors.text,
    fontSize: 15,
    padding: spacing.sm,
  },
  finishButton: {
    backgroundColor: colors.primary,
    borderRadius: radius.md,
    padding: spacing.md,
    alignItems: 'center',
    marginTop: spacing.sm,
  },
  finishButtonDisabled: {
    opacity: 0.5,
  },
  finishButtonText: {
    color: '#ffffff',
    fontSize: 17,
    fontWeight: '600',
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    padding: spacing.lg,
  },
  modalCard: {
    backgroundColor: colors.elevated,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: radius.lg,
    padding: spacing.lg,
  },
  modalTitle: {
    color: colors.text,
    fontSize: 24,
    fontWeight: '700',
    textAlign: 'center',
  },
  modalSubtitle: {
    color: colors.textSecondary,
    fontSize: 15,
    textAlign: 'center',
    marginTop: 4,
    marginBottom: spacing.md,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: spacing.md,
  },
  summaryStat: {
    alignItems: 'center',
  },
  summaryValue: {
    color: colors.text,
    fontSize: 22,
    fontWeight: '700',
    fontVariant: ['tabular-nums'],
  },
  summaryLabel: {
    color: colors.textSecondary,
    fontSize: 13,
    marginTop: 2,
  },
  modalNote: {
    color: colors.textSecondary,
    fontSize: 14,
    textAlign: 'center',
    marginBottom: spacing.md,
  },
  summaryActions: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  summaryButton: {
    flex: 1,
    borderRadius: radius.md,
    padding: spacing.md,
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
    gap: spacing.xs,
  },
  shareButton: {
    backgroundColor: colors.card,
    borderColor: colors.border,
    borderWidth: 1,
  },
  shareButtonText: {
    color: colors.primaryStrong,
    fontSize: 17,
    fontWeight: '600',
  },
  startButton: {
    backgroundColor: colors.primary,
  },
  startButtonText: {
    color: '#ffffff',
    fontSize: 17,
    fontWeight: '600',
  },
});
