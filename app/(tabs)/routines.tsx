// Routines tab: build your own routines (name + exercises with sets/reps),
// edit or delete them, and assign each weekday either a built-in split or
// one of your custom routines. The Home and Workout tabs read this schedule.

import { useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Keyboard,
  KeyboardAvoidingView,
  Modal,
  Platform,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  TouchableWithoutFeedback,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import FadeIn from '../../components/FadeIn';
import { colors, radius, spacing } from '../../lib/theme';
import { toast } from '../../lib/toast';
import { impactMedium, notifyError, notifySuccess } from '../../lib/haptics';
import { editRoutineWithAi, generateRoutineFromText, getGeminiKey } from '../../lib/gemini';
import {
  DEFAULT_SCHEDULE,
  WEEKDAY_NAMES,
  dayPlanLabel,
  getCustomRoutines,
  getWeeklySchedule,
  makeExerciseId,
  makeRoutineId,
  saveCustomRoutines,
  saveWeeklySchedule,
  type CustomRoutine,
  type DayPlan,
  type ExerciseDef,
} from '../../lib/workout';

interface DraftExercise {
  key: string;
  name: string;
  sets: string;
  reps: string;
}

const BUILT_IN_OPTIONS: DayPlan[] = [
  { kind: 'split', split: 'REST' },
  { kind: 'split', split: 'PUSH' },
  { kind: 'split', split: 'PULL' },
  { kind: 'split', split: 'LEGS' },
];

export default function Routines() {
  const [routines, setRoutines] = useState<CustomRoutine[]>([]);
  const [schedule, setSchedule] = useState<DayPlan[]>(DEFAULT_SCHEDULE);

  // Which weekday's assignment picker is open (0 = Sunday). Null = closed.
  const [pickerDay, setPickerDay] = useState<number | null>(null);
  // Routine being created/edited in the editor modal. Null = closed.
  const [editing, setEditing] = useState<CustomRoutine | null>(null);
  const [draftName, setDraftName] = useState('');
  const [draftExercises, setDraftExercises] = useState<DraftExercise[]>([]);

  // AI coach modal. Null = closed; otherwise generating a new routine or
  // editing the given one from a plain-words prompt.
  const [aiTarget, setAiTarget] = useState<null | { mode: 'new' } | { mode: 'edit'; routine: CustomRoutine }>(null);
  const [aiPrompt, setAiPrompt] = useState('');
  const [aiBusy, setAiBusy] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);

  const [initialLoading, setInitialLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadError, setLoadError] = useState(false);

  const reload = useCallback(async () => {
    try {
      const [r, s] = await Promise.all([getCustomRoutines(), getWeeklySchedule()]);
      setRoutines(r);
      setSchedule(s);
      setLoadError(false);
    } catch {
      setLoadError(true);
    } finally {
      setInitialLoading(false);
    }
  }, []);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await reload();
    setRefreshing(false);
  }, [reload]);

  useFocusEffect(
    useCallback(() => {
      void reload();
    }, [reload])
  );

  /* ---------------- weekly schedule ---------------- */

  const assignDay = async (dayIndex: number, plan: DayPlan) => {
    const next = schedule.map((p, i) => (i === dayIndex ? plan : p));
    setSchedule(next);
    await saveWeeklySchedule(next);
    setPickerDay(null);
  };

  /* ---------------- routine editor ---------------- */

  const openNewRoutine = () => {
    setEditing({ id: makeRoutineId(), name: '', exercises: [] });
    setDraftName('');
    setDraftExercises([{ key: 'new-0', name: '', sets: '3', reps: '8-12' }]);
  };

  const openEditRoutine = (routine: CustomRoutine) => {
    setEditing(routine);
    setDraftName(routine.name);
    setDraftExercises(
      routine.exercises.map((ex, i) => ({
        key: `${routine.id}-${i}`,
        name: ex.name,
        sets: String(ex.targetSets),
        reps: ex.targetReps,
      }))
    );
  };

  const updateDraftExercise = (key: string, field: keyof DraftExercise, value: string) => {
    setDraftExercises((prev) => prev.map((ex) => (ex.key === key ? { ...ex, [field]: value } : ex)));
  };

  const addDraftExercise = () => {
    setDraftExercises((prev) => [
      ...prev,
      { key: `new-${Date.now()}-${prev.length}`, name: '', sets: '3', reps: '8-12' },
    ]);
  };

  const removeDraftExercise = (key: string) => {
    setDraftExercises((prev) => prev.filter((ex) => ex.key !== key));
  };

  const saveRoutine = async () => {
    if (!editing) return;
    const name = draftName.trim();
    if (!name) {
      void notifyError();
      Alert.alert('Name required', 'Give your routine a name first.');
      return;
    }
    const exercises: ExerciseDef[] = draftExercises
      .filter((ex) => ex.name.trim().length > 0)
      .map((ex, i) => ({
        id: makeExerciseId(editing.id, i),
        name: ex.name.trim(),
        targetSets: Math.max(1, parseInt(ex.sets, 10) || 3),
        targetReps: ex.reps.trim() || '8-12',
      }));
    if (exercises.length === 0) {
      void notifyError();
      Alert.alert('No exercises', 'Add at least one exercise to the routine.');
      return;
    }

    const updated: CustomRoutine = { id: editing.id, name, exercises };
    const next = routines.some((r) => r.id === editing.id)
      ? routines.map((r) => (r.id === editing.id ? updated : r))
      : [...routines, updated];
    setRoutines(next);
    await saveCustomRoutines(next);
    setEditing(null);
    toast('Routine saved');
  };

  const deleteRoutine = (routine: CustomRoutine) => {
    Alert.alert('Delete routine?', `"${routine.name}" will be removed. Days using it return to the default split.`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          void impactMedium();
          const nextRoutines = routines.filter((r) => r.id !== routine.id);
          // Days that pointed at the deleted routine fall back to the default split.
          const nextSchedule = schedule.map((plan, i) =>
            plan.kind === 'custom' && plan.routineId === routine.id ? DEFAULT_SCHEDULE[i] : plan
          );
          setRoutines(nextRoutines);
          setSchedule(nextSchedule);
          await saveCustomRoutines(nextRoutines);
          await saveWeeklySchedule(nextSchedule);
          toast('Routine deleted');
        },
      },
    ]);
  };

  /* ---------------- AI coach ---------------- */

  const openAiNew = () => {
    setAiTarget({ mode: 'new' });
    setAiPrompt('');
    setAiError(null);
  };

  const openAiEdit = (routine: CustomRoutine) => {
    setAiTarget({ mode: 'edit', routine });
    setAiPrompt('');
    setAiError(null);
  };

  /** Runs the AI request, then drops the result into the routine editor as a draft. */
  const runAiGenerate = async () => {
    if (!aiTarget || aiBusy) return;
    const prompt = aiPrompt.trim();
    if (!prompt) {
      setAiError(
        aiTarget.mode === 'new'
          ? 'Describe the routine you want first.'
          : 'Tell the AI what to change first.'
      );
      return;
    }
    const apiKey = await getGeminiKey();
    if (!apiKey) {
      setAiError('Add your Gemini API key in the Profile tab to use AI features.');
      return;
    }
    setAiBusy(true);
    setAiError(null);
    try {
      const result =
        aiTarget.mode === 'new'
          ? await generateRoutineFromText(prompt, apiKey)
          : await editRoutineWithAi(aiTarget.routine, prompt, apiKey);
      // Load the AI result into the normal editor so the user reviews it before saving.
      const routineId = aiTarget.mode === 'new' ? makeRoutineId() : aiTarget.routine.id;
      setEditing({ id: routineId, name: result.name, exercises: [] });
      setDraftName(result.name);
      setDraftExercises(
        result.exercises.map((ex, i) => ({
          key: `ai-${routineId}-${i}`,
          name: ex.name,
          sets: String(ex.targetSets),
          reps: ex.targetReps,
        }))
      );
      setAiTarget(null);
      void notifySuccess();
    } catch (error) {
      setAiError(error instanceof Error ? error.message : 'Something went wrong. Try again.');
    } finally {
      setAiBusy(false);
    }
  };

  /* ---------------- render ---------------- */

  if (initialLoading) {
    return (
      <View style={styles.screen}>
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={colors.primaryStrong} />
        </View>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.screen} edges={['top']}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => void onRefresh()}
            tintColor={colors.primaryStrong}
          />
        }
      >
        <Text style={styles.title}>Routines</Text>

        {loadError && (
          <View style={styles.card}>
            <Text style={styles.errorTitle}>Couldn't load your data.</Text>
            <TouchableOpacity style={styles.retryButton} onPress={() => void reload()} activeOpacity={0.8}>
              <Text style={styles.retryButtonText}>Retry</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Weekly schedule */}
        <Text style={styles.sectionLabel}>Weekly Schedule</Text>
        <FadeIn delay={0}>
          <View style={styles.card}>
            {schedule.map((plan, dayIndex) => (
              <TouchableOpacity
                key={dayIndex}
                style={[styles.dayRow, dayIndex < 6 && styles.dayRowBorder]}
                onPress={() => setPickerDay(dayIndex)}
                activeOpacity={0.7}
              >
                <Text style={styles.dayName}>{WEEKDAY_NAMES[dayIndex]}</Text>
                <View style={styles.dayPlan}>
                  <Text style={styles.dayPlanText}>{dayPlanLabel(plan, routines)}</Text>
                  <Ionicons name="chevron-forward" size={16} color={colors.textTertiary} />
                </View>
              </TouchableOpacity>
            ))}
          </View>
        </FadeIn>

        {/* Custom routines */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionLabel}>My Routines</Text>
          <View style={styles.sectionActions}>
            <TouchableOpacity style={styles.aiButton} onPress={openAiNew} activeOpacity={0.8}>
              <Ionicons name="sparkles" size={16} color="#ffffff" />
              <Text style={styles.addButtonText}>AI</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.addButton} onPress={openNewRoutine} activeOpacity={0.8}>
              <Ionicons name="add" size={16} color="#ffffff" />
              <Text style={styles.addButtonText}>New</Text>
            </TouchableOpacity>
          </View>
        </View>

        {routines.length === 0 ? (
          <FadeIn delay={60}>
            <View style={styles.card}>
              <Text style={styles.muted}>
                No custom routines yet. Create one and assign it to any weekday above.
              </Text>
            </View>
          </FadeIn>
        ) : (
          routines.map((routine, index) => (
            <FadeIn key={routine.id} delay={60 + Math.min(index, 8) * 60}>
            <View style={styles.card}>
              <View style={styles.routineTop}>
                <View style={styles.routineInfo}>
                  <Text style={styles.routineName}>{routine.name}</Text>
                  <Text style={styles.muted}>
                    {routine.exercises.length} exercise{routine.exercises.length === 1 ? '' : 's'}
                  </Text>
                </View>
                <TouchableOpacity onPress={() => openAiEdit(routine)} hitSlop={8} activeOpacity={0.7}>
                  <Ionicons name="sparkles-outline" size={18} color={colors.primaryStrong} />
                </TouchableOpacity>
                <TouchableOpacity onPress={() => openEditRoutine(routine)} hitSlop={8} activeOpacity={0.7}>
                  <Ionicons name="pencil" size={18} color={colors.primaryStrong} />
                </TouchableOpacity>
                <TouchableOpacity onPress={() => deleteRoutine(routine)} hitSlop={8} activeOpacity={0.7}>
                  <Ionicons name="trash" size={18} color={colors.danger} />
                </TouchableOpacity>
              </View>
              {routine.exercises.map((ex) => (
                <Text key={ex.id} style={styles.routineExercise}>
                  {ex.name} · {ex.targetSets} x {ex.targetReps}
                </Text>
              ))}
            </View>
            </FadeIn>
          ))
        )}
      </ScrollView>

      {/* Day assignment picker */}
      <Modal visible={pickerDay !== null} transparent animationType="fade">
        <TouchableOpacity style={styles.modalBackdrop} activeOpacity={1} onPress={() => setPickerDay(null)}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>
              {pickerDay !== null ? WEEKDAY_NAMES[pickerDay] : ''}
            </Text>
            <FlatList
              data={[
                ...BUILT_IN_OPTIONS.map((plan) => ({ plan, label: dayPlanLabel(plan, routines) })),
                ...routines.map((r) => ({
                  plan: { kind: 'custom', routineId: r.id } as DayPlan,
                  label: r.name,
                })),
              ]}
              keyExtractor={(item) =>
                item.plan.kind === 'split' ? `split-${item.plan.split}` : `custom-${item.plan.routineId}`
              }
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={styles.optionRow}
                  onPress={() => pickerDay !== null && void assignDay(pickerDay, item.plan)}
                  activeOpacity={0.7}
                >
                  <Text style={styles.optionText}>{item.label}</Text>
                </TouchableOpacity>
              )}
            />
          </View>
        </TouchableOpacity>
      </Modal>

      {/* Routine editor */}
      <Modal visible={editing !== null} transparent animationType="slide">
        <TouchableWithoutFeedback onPress={Keyboard.dismiss} accessible={false}>
          <KeyboardAvoidingView
            style={styles.modalBackdrop}
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          >
          <View style={[styles.modalCard, styles.editorCard]}>
            <Text style={styles.modalTitle}>{editing && routines.some((r) => r.id === editing.id) ? 'Edit Routine' : 'New Routine'}</Text>
            <Text style={styles.inputLabel}>Routine name</Text>
            <TextInput
              style={styles.input}
              value={draftName}
              onChangeText={setDraftName}
              placeholder="e.g. Upper Body Pump"
              placeholderTextColor={colors.textTertiary}
              maxLength={40}
            />

            <Text style={styles.inputLabel}>Exercises</Text>
            <ScrollView style={styles.draftList} keyboardShouldPersistTaps="handled">
              {draftExercises.map((ex) => (
                <View key={ex.key} style={styles.draftRow}>
                  <TextInput
                    style={[styles.input, styles.draftName]}
                    value={ex.name}
                    onChangeText={(v) => updateDraftExercise(ex.key, 'name', v)}
                    placeholder="Exercise name"
                    placeholderTextColor={colors.textTertiary}
                    maxLength={60}
                  />
                  <TextInput
                    style={[styles.input, styles.draftSmall]}
                    value={ex.sets}
                    onChangeText={(v) => updateDraftExercise(ex.key, 'sets', v)}
                    placeholder="Sets"
                    placeholderTextColor={colors.textTertiary}
                    keyboardType="number-pad"
                    maxLength={2}
                  />
                  <TextInput
                    style={[styles.input, styles.draftSmall]}
                    value={ex.reps}
                    onChangeText={(v) => updateDraftExercise(ex.key, 'reps', v)}
                    placeholder="Reps"
                    placeholderTextColor={colors.textTertiary}
                    maxLength={8}
                  />
                  <TouchableOpacity onPress={() => removeDraftExercise(ex.key)} hitSlop={8} activeOpacity={0.7}>
                    <Ionicons name="close-circle" size={22} color={colors.danger} />
                  </TouchableOpacity>
                </View>
              ))}
              <TouchableOpacity style={styles.addExercise} onPress={addDraftExercise} activeOpacity={0.7}>
                <Ionicons name="add-circle-outline" size={18} color={colors.primaryStrong} />
                <Text style={styles.addExerciseText}>Add exercise</Text>
              </TouchableOpacity>
            </ScrollView>

            <View style={styles.editorActions}>
              <TouchableOpacity
                style={[styles.editorButton, styles.cancelButton]}
                onPress={() => setEditing(null)}
                activeOpacity={0.8}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.editorButton, styles.saveButton]}
                onPress={() => void saveRoutine()}
                activeOpacity={0.8}
              >
                <Text style={styles.saveButtonText}>Save</Text>
              </TouchableOpacity>
            </View>
          </View>
          </KeyboardAvoidingView>
        </TouchableWithoutFeedback>
      </Modal>

      {/* AI coach: describe what you want, get a routine back */}
      <Modal visible={aiTarget !== null} transparent animationType="slide">
        <TouchableWithoutFeedback onPress={Keyboard.dismiss} accessible={false}>
          <KeyboardAvoidingView
            style={styles.modalBackdrop}
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          >
          <View style={[styles.modalCard, styles.editorCard]}>
            <View style={styles.aiTitleRow}>
              <Ionicons name="sparkles" size={20} color={colors.primaryStrong} />
              <Text style={styles.modalTitle}>
                {aiTarget?.mode === 'edit' ? 'Edit with AI' : 'Generate with AI'}
              </Text>
            </View>
            {aiTarget?.mode === 'edit' && (
              <Text style={styles.muted}>Editing "{aiTarget.routine.name}"</Text>
            )}
            <Text style={styles.inputLabel}>
              {aiTarget?.mode === 'edit'
                ? 'What should change?'
                : 'Describe the routine you want'}
            </Text>
            <TextInput
              style={[styles.input, styles.aiInput]}
              value={aiPrompt}
              onChangeText={setAiPrompt}
              placeholder={
                aiTarget?.mode === 'edit'
                  ? 'e.g. make it harder, dumbbells only'
                  : 'e.g. push day focused on chest, 45 minutes, intermediate'
              }
              placeholderTextColor={colors.textTertiary}
              multiline
              numberOfLines={4}
              maxLength={500}
              editable={!aiBusy}
            />
            {aiError && <Text style={styles.aiError}>{aiError}</Text>}
            <View style={styles.editorActions}>
              <TouchableOpacity
                style={[styles.editorButton, styles.cancelButton]}
                onPress={() => setAiTarget(null)}
                activeOpacity={0.8}
                disabled={aiBusy}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.editorButton, styles.saveButton, aiBusy && styles.disabledButton]}
                onPress={() => void runAiGenerate()}
                activeOpacity={0.8}
                disabled={aiBusy}
              >
                {aiBusy ? (
                  <ActivityIndicator color="#ffffff" size="small" />
                ) : (
                  <Text style={styles.saveButtonText}>Generate</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
          </KeyboardAvoidingView>
        </TouchableWithoutFeedback>
      </Modal>
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
  centered: {
    flex: 1,
    backgroundColor: colors.background,
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorTitle: {
    color: colors.text,
    fontSize: 16,
    fontWeight: '600',
    marginBottom: spacing.sm,
  },
  retryButton: {
    backgroundColor: colors.card,
    borderColor: colors.borderStrong,
    borderWidth: 1,
    borderRadius: radius.md,
    paddingVertical: spacing.sm,
    alignItems: 'center',
  },
  retryButtonText: {
    color: colors.primaryStrong,
    fontSize: 15,
    fontWeight: '600',
  },
  content: {
    padding: spacing.lg,
    paddingBottom: spacing.xl,
    gap: spacing.sm,
  },
  title: {
    color: colors.text,
    fontSize: 28,
    fontWeight: '700',
    marginTop: spacing.md,
    marginBottom: spacing.xs,
  },
  sectionLabel: {
    color: colors.textSecondary,
    fontSize: 14,
    fontWeight: '600',
    marginTop: spacing.sm,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: spacing.sm,
  },
  card: {
    backgroundColor: colors.card,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: radius.lg,
    padding: spacing.md,
  },
  muted: {
    color: colors.textSecondary,
    fontSize: 14,
  },
  dayRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing.sm,
  },
  dayRowBorder: {
    borderBottomColor: colors.border,
    borderBottomWidth: 1,
  },
  dayName: {
    color: colors.text,
    fontSize: 16,
  },
  dayPlan: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  dayPlanText: {
    color: colors.primaryStrong,
    fontSize: 15,
    fontWeight: '600',
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: colors.primary,
    borderRadius: radius.md,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
  },
  addButtonText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '600',
  },
  routineTop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.xs,
  },
  routineInfo: {
    flex: 1,
  },
  routineName: {
    color: colors.text,
    fontSize: 17,
    fontWeight: '600',
  },
  routineExercise: {
    color: colors.textTertiary,
    fontSize: 13,
    marginTop: 2,
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'flex-end',
  },
  modalCard: {
    backgroundColor: colors.elevated,
    borderTopLeftRadius: radius.lg,
    borderTopRightRadius: radius.lg,
    borderColor: colors.border,
    borderWidth: 1,
    padding: spacing.lg,
    maxHeight: '70%',
  },
  editorCard: {
    maxHeight: '92%',
  },
  modalTitle: {
    color: colors.text,
    fontSize: 20,
    fontWeight: '700',
    marginBottom: spacing.md,
  },
  optionRow: {
    paddingVertical: spacing.md,
    borderBottomColor: colors.border,
    borderBottomWidth: 1,
  },
  optionText: {
    color: colors.text,
    fontSize: 16,
  },
  inputLabel: {
    color: colors.textSecondary,
    fontSize: 13,
    marginBottom: 4,
    marginTop: spacing.sm,
  },
  input: {
    backgroundColor: colors.background,
    borderColor: colors.borderStrong,
    borderWidth: 1,
    borderRadius: radius.sm,
    color: colors.text,
    fontSize: 15,
    padding: spacing.sm,
  },
  draftList: {
    marginTop: spacing.xs,
    maxHeight: 320,
  },
  draftRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    marginBottom: spacing.xs,
  },
  draftName: {
    flex: 3,
  },
  draftSmall: {
    flex: 1,
    textAlign: 'center',
  },
  addExercise: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingVertical: spacing.sm,
  },
  addExerciseText: {
    color: colors.primaryStrong,
    fontSize: 15,
    fontWeight: '600',
  },
  editorActions: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginTop: spacing.md,
  },
  editorButton: {
    flex: 1,
    borderRadius: radius.md,
    padding: spacing.md,
    alignItems: 'center',
  },
  cancelButton: {
    backgroundColor: colors.card,
    borderColor: colors.border,
    borderWidth: 1,
  },
  cancelButtonText: {
    color: colors.textSecondary,
    fontSize: 16,
    fontWeight: '600',
  },
  saveButton: {
    backgroundColor: colors.primary,
  },
  saveButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
  sectionActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  aiButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: colors.primaryStrong,
    borderRadius: radius.md,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
  },
  aiTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  aiInput: {
    minHeight: 96,
    textAlignVertical: 'top',
    paddingTop: spacing.sm,
  },
  aiError: {
    color: colors.danger,
    fontSize: 14,
    marginTop: spacing.xs,
  },
  disabledButton: {
    opacity: 0.6,
  },
});
