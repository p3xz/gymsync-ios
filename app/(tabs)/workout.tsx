// Workout tab: today's exercises with check-off, per-exercise weight and
// notes inputs, a live timer, a progress bar, and a finish flow that saves
// the session and shows a summary sheet. Respects the weekly schedule,
// so custom routines assigned to today appear here automatically.

import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import {
  Alert,
  KeyboardAvoidingView,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, radius, spacing } from '../../lib/theme';
import {
  formatElapsed,
  getTodaysWorkout,
  persistFinishedWorkout,
  toDateKey,
  type ExerciseDef,
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

export default function Workout() {
  const router = useRouter();
  const [workout, setWorkout] = useState<ResolvedWorkout | null>(null);
  const [exercises, setExercises] = useState<ExerciseState[]>([]);
  const [elapsedMs, setElapsedMs] = useState(0);
  const [sessionDateKey, setSessionDateKey] = useState<string | null>(null);
  const [loggedToday, setLoggedToday] = useState(false);
  const [summary, setSummary] = useState<Summary | null>(null);
  const [finishing, setFinishing] = useState(false);
  const startTimeRef = useRef<number>(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const stopTimer = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  const startSession = useCallback(
    (resolved: ResolvedWorkout, dateKey: string) => {
      stopTimer();
      startTimeRef.current = Date.now();
      setElapsedMs(0);
      setExercises(
        resolved.exercises.map((def) => ({ def, completed: false, weight: '', notes: '' }))
      );
      setSessionDateKey(dateKey);
      setLoggedToday(false);
      timerRef.current = setInterval(() => {
        setElapsedMs(Date.now() - startTimeRef.current);
      }, 1000);
    },
    [stopTimer]
  );

  // Every time the tab is focused: start a fresh session for a new day,
  // otherwise leave the in-progress session exactly as the user left it.
  // This mirrors the web app's "only set up once per day" guard.
  useFocusEffect(
    useCallback(() => {
      let cancelled = false;
      (async () => {
        const todayKey = toDateKey(new Date());
        if (todayKey === sessionDateKey) return; // resume, do not reset
        const resolved = await getTodaysWorkout();
        if (cancelled) return;
        setWorkout(resolved);
        if (!resolved.isRest) startSession(resolved, todayKey);
        else setSessionDateKey(todayKey);
      })();
      return () => {
        cancelled = true;
      };
    }, [sessionDateKey, startSession])
  );

  useEffect(() => stopTimer, [stopTimer]);

  const toggleExercise = (index: number) => {
    setExercises((prev) =>
      prev.map((ex, i) => (i === index ? { ...ex, completed: !ex.completed } : ex))
    );
  };

  const updateField = (index: number, field: 'weight' | 'notes', value: string) => {
    setExercises((prev) =>
      prev.map((ex, i) => (i === index ? { ...ex, [field]: value } : ex))
    );
  };

  const completedCount = exercises.filter((ex) => ex.completed).length;
  const progress = exercises.length === 0 ? 0 : completedCount / exercises.length;

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
    Alert.alert(
      'Finish workout?',
      'Your progress will be saved to history.',
      [
        { text: 'Keep Going', style: 'cancel' },
        { text: 'Finish', style: 'default', onPress: () => void finishWorkout() },
      ]
    );
  };

  if (!workout) {
    return (
      <View style={styles.centered}>
        <Text style={styles.muted}>Loading today's workout</Text>
      </View>
    );
  }

  if (workout.isRest) {
    return (
      <View style={styles.centered}>
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Rest Day</Text>
          <Text style={styles.muted}>Nothing scheduled today. Recovery is part of the process.</Text>
        </View>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={styles.screen}
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
          <View style={styles.timer}>
            <View style={styles.timerDot} />
            <Text style={styles.timerText}>{formatElapsed(elapsedMs)}</Text>
          </View>
        </View>

        <View style={styles.progressTrack}>
          <View style={[styles.progressFill, { width: `${Math.round(progress * 100)}%` }]} />
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
              <TouchableOpacity
                style={[styles.checkbox, ex.completed && styles.checkboxChecked]}
                onPress={() => toggleExercise(index)}
                accessibilityLabel={`Mark ${ex.def.name} complete`}
                activeOpacity={0.7}
              >
                {ex.completed && <Ionicons name="checkmark" size={20} color="#ffffff" />}
              </TouchableOpacity>
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
          <View style={styles.modalCard}>
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
            <TouchableOpacity
              style={styles.startButton}
              onPress={() => {
                setSummary(null);
                router.navigate('/');
              }}
              activeOpacity={0.85}
            >
              <Text style={styles.startButtonText}>Done</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.background,
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
  startButton: {
    backgroundColor: colors.primary,
    borderRadius: radius.md,
    padding: spacing.md,
    alignItems: 'center',
  },
  startButtonText: {
    color: '#ffffff',
    fontSize: 17,
    fontWeight: '600',
  },
});
