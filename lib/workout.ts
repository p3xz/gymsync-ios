// Core workout data and logic, ported from the GymSync web app (script.js).
// Same splits, same exercises, same streak math, plus the custom-routine
// system: users build their own routines and assign them to weekdays.

import { Storage } from './storage';

/* ------------------------------------------------------------------ */
/* Types                                                               */
/* ------------------------------------------------------------------ */

export interface ExerciseDef {
  id: string;
  name: string;
  targetSets: number;
  targetReps: string; // a range like '6-8', not a hard rule
}

export type SplitName = 'PUSH' | 'PULL' | 'LEGS' | 'REST';

export interface CustomRoutine {
  id: string;
  name: string;
  exercises: ExerciseDef[];
}

/**
 * What happens on one weekday. Either a built-in split or one of the
 * user's custom routines (referenced by id so renames stay in sync).
 */
export type DayPlan =
  | { kind: 'split'; split: SplitName }
  | { kind: 'custom'; routineId: string };

export interface ResolvedWorkout {
  /** Display title, e.g. 'PUSH' or the custom routine's name. */
  title: string;
  isRest: boolean;
  exercises: ExerciseDef[];
  /** One-line summary used on the home card, e.g. '5 exercises'. */
  subtitle: string;
}

export interface LoggedExercise {
  name: string;
  completed: boolean;
  weight: number | null;
  notes: string | null;
}

export interface HistoryEntry {
  id: string;
  dateKey: string;
  dateLabel: string;
  split: string;
  durationLabel: string;
  exercisesCompleted: number;
  totalExercises: number;
  calories: number;
  exercises: LoggedExercise[];
}

/* ------------------------------------------------------------------ */
/* Built-in training data (identical to the web app)                   */
/* ------------------------------------------------------------------ */

const WORKOUT_SPLIT_BY_DAY: SplitName[] = [
  'REST', // Sunday
  'PUSH', // Monday
  'PULL', // Tuesday
  'LEGS', // Wednesday
  'PUSH', // Thursday
  'PULL', // Friday
  'LEGS', // Saturday
];

export const EXERCISES_BY_SPLIT: Record<Exclude<SplitName, 'REST'>, ExerciseDef[]> = {
  PUSH: [
    { id: 'push-01', name: 'Bench Press', targetSets: 4, targetReps: '6-8' },
    { id: 'push-02', name: 'Overhead Press', targetSets: 3, targetReps: '8-10' },
    { id: 'push-03', name: 'Incline Dumbbell Press', targetSets: 3, targetReps: '8-12' },
    { id: 'push-04', name: 'Lateral Raise', targetSets: 3, targetReps: '12-15' },
    { id: 'push-05', name: 'Tricep Pushdown', targetSets: 3, targetReps: '10-12' },
  ],
  PULL: [
    { id: 'pull-01', name: 'Deadlift', targetSets: 3, targetReps: '5-6' },
    { id: 'pull-02', name: 'Pull-Ups', targetSets: 3, targetReps: '6-10' },
    { id: 'pull-03', name: 'Barbell Row', targetSets: 3, targetReps: '8-10' },
    { id: 'pull-04', name: 'Face Pull', targetSets: 3, targetReps: '12-15' },
    { id: 'pull-05', name: 'Bicep Curl', targetSets: 3, targetReps: '10-12' },
  ],
  LEGS: [
    { id: 'legs-01', name: 'Back Squat', targetSets: 4, targetReps: '6-8' },
    { id: 'legs-02', name: 'Romanian Deadlift', targetSets: 3, targetReps: '8-10' },
    { id: 'legs-03', name: 'Leg Press', targetSets: 3, targetReps: '10-12' },
    { id: 'legs-04', name: 'Leg Curl', targetSets: 3, targetReps: '10-12' },
    { id: 'legs-05', name: 'Standing Calf Raise', targetSets: 4, targetReps: '12-15' },
  ],
};

const QUOTES = [
  { text: 'The only bad workout is the one that did not happen.', author: 'Unknown' },
  { text: 'Discipline is choosing between what you want now and what you want most.', author: 'Abraham Lincoln' },
  { text: 'Strength does not come from what you can do. It comes from overcoming what you once could not.', author: 'Rikki Rogers' },
  { text: 'The body achieves what the mind believes.', author: 'Unknown' },
  { text: 'Small daily improvements are the key to staggering long-term results.', author: 'Unknown' },
  { text: 'Consistency is what transforms average into excellence.', author: 'Unknown' },
  { text: 'You do not have to be extreme, just consistent.', author: 'Unknown' },
];

/** Rough average for resistance training; a personal estimate, not science. */
export const CALORIES_PER_MINUTE = 6.5;

export const WEEKDAY_NAMES = [
  'Sunday',
  'Monday',
  'Tuesday',
  'Wednesday',
  'Thursday',
  'Friday',
  'Saturday',
];

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

/* ------------------------------------------------------------------ */
/* Date helpers (local timezone, no Intl dependency)                    */
/* ------------------------------------------------------------------ */

/** Local yyyy-mm-dd key, used to compare "days" without timezone drift. */
export function toDateKey(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export function addDays(date: Date, amount: number): Date {
  const result = new Date(date);
  result.setDate(result.getDate() + amount);
  return result;
}

/** Date key for the Monday that starts this date's week. */
export function getWeekStartKey(date: Date): string {
  const daysSinceMonday = (date.getDay() + 6) % 7;
  return toDateKey(addDays(date, -daysSinceMonday));
}

/** 'September 29' style label, like the web app's dateFormatter. */
export function formatDateLabel(date: Date): string {
  return `${MONTH_NAMES[date.getMonth()]} ${date.getDate()}`;
}

/** '6:04 PM' style clock label, ticking on the home screen. */
export function formatClock(date: Date): string {
  let hours = date.getHours();
  const minutes = String(date.getMinutes()).padStart(2, '0');
  const suffix = hours >= 12 ? 'PM' : 'AM';
  hours = hours % 12;
  if (hours === 0) hours = 12;
  return `${hours}:${minutes} ${suffix}`;
}

/** '05:23' or '1:02:07' elapsed label, like the web workout timer. */
export function formatElapsed(ms: number): string {
  const totalSeconds = Math.floor(ms / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  const pad = (n: number) => String(n).padStart(2, '0');
  return hours > 0 ? `${hours}:${pad(minutes)}:${pad(seconds)}` : `${pad(minutes)}:${pad(seconds)}`;
}

/** Deterministic quote for the day, steady from morning to night. */
export function getQuoteForToday(date: Date = new Date()): { text: string; author: string } {
  const start = new Date(date.getFullYear(), 0, 0);
  const dayOfYear = Math.floor((date.getTime() - start.getTime()) / 86400000);
  return QUOTES[dayOfYear % QUOTES.length];
}

/* ------------------------------------------------------------------ */
/* Weekly schedule + custom routines                                   */
/* ------------------------------------------------------------------ */

export const DEFAULT_SCHEDULE: DayPlan[] = WORKOUT_SPLIT_BY_DAY.map((split) => ({
  kind: 'split',
  split,
}));

export function makeRoutineId(): string {
  return `routine-${Date.now()}-${Math.floor(Math.random() * 10000)}`;
}

export function makeExerciseId(routineId: string, index: number): string {
  return `${routineId}-ex-${index}`;
}

export async function getCustomRoutines(): Promise<CustomRoutine[]> {
  return Storage.get<CustomRoutine[]>('customRoutines', []);
}

export async function saveCustomRoutines(routines: CustomRoutine[]): Promise<void> {
  await Storage.set('customRoutines', routines);
}

export async function getWeeklySchedule(): Promise<DayPlan[]> {
  const stored = await Storage.get<DayPlan[] | null>('weeklySchedule', null);
  if (Array.isArray(stored) && stored.length === 7) return stored;
  return DEFAULT_SCHEDULE;
}

export async function saveWeeklySchedule(schedule: DayPlan[]): Promise<void> {
  await Storage.set('weeklySchedule', schedule);
}

/** Human label for a day plan, e.g. 'Push', 'Rest Day', or the routine name. */
export function dayPlanLabel(plan: DayPlan, routines: CustomRoutine[]): string {
  if (plan.kind === 'split') {
    return plan.split === 'REST' ? 'Rest Day' : plan.split.charAt(0) + plan.split.slice(1).toLowerCase();
  }
  const routine = routines.find((r) => r.id === plan.routineId);
  return routine ? routine.name : 'Rest Day';
}

/**
 * Resolves "what is today's workout" from the stored weekly schedule.
 * A custom routine that was deleted falls back to the default split
 * for that weekday, so the schedule can never point at nothing.
 */
export async function getTodaysWorkout(date: Date = new Date()): Promise<ResolvedWorkout> {
  const schedule = await getWeeklySchedule();
  const routines = await getCustomRoutines();
  const plan = schedule[date.getDay()] ?? DEFAULT_SCHEDULE[date.getDay()];

  if (plan.kind === 'split') {
    if (plan.split === 'REST') {
      return { title: 'Rest Day', isRest: true, exercises: [], subtitle: 'Recovery is part of the process.' };
    }
    const exercises = EXERCISES_BY_SPLIT[plan.split];
    return {
      title: plan.split,
      isRest: false,
      exercises,
      subtitle: `${exercises.length} exercises`,
    };
  }

  const routine = routines.find((r) => r.id === plan.routineId);
  if (!routine) {
    const fallback = DEFAULT_SCHEDULE[date.getDay()];
    return getTodaysWorkoutFromPlan(fallback, routines, date);
  }
  return {
    title: routine.name,
    isRest: false,
    exercises: routine.exercises,
    subtitle: `${routine.exercises.length} exercises · custom routine`,
  };
}

function getTodaysWorkoutFromPlan(plan: DayPlan, routines: CustomRoutine[], date: Date): ResolvedWorkout {
  void routines;
  void date;
  if (plan.kind === 'split') {
    if (plan.split === 'REST') {
      return { title: 'Rest Day', isRest: true, exercises: [], subtitle: 'Recovery is part of the process.' };
    }
    const exercises = EXERCISES_BY_SPLIT[plan.split];
    return { title: plan.split, isRest: false, exercises, subtitle: `${exercises.length} exercises` };
  }
  return { title: 'Rest Day', isRest: true, exercises: [], subtitle: 'Recovery is part of the process.' };
}

/** Training days this week under the current schedule (for the 'This Week' stat). */
export async function getTrainingDaysPerWeek(): Promise<number> {
  const schedule = await getWeeklySchedule();
  return schedule.filter((plan) => !(plan.kind === 'split' && plan.split === 'REST')).length;
}

/* ------------------------------------------------------------------ */
/* Progress persistence (same math as the web app)                      */
/* ------------------------------------------------------------------ */

export interface FinishWorkoutInput {
  title: string;
  exercisesCompleted: number;
  totalExercises: number;
  durationMs: number;
  exerciseData: LoggedExercise[];
}

export async function persistFinishedWorkout(input: FinishWorkoutInput): Promise<{ durationLabel: string; calories: number }> {
  const now = new Date();
  const todayKey = toDateKey(now);
  const durationLabel = formatElapsed(input.durationMs);
  const calories = Math.round((input.durationMs / 60000) * CALORIES_PER_MINUTE);

  const lastWorkoutDateKey = await Storage.get<string | null>('lastWorkoutDateKey', null);
  const isNewTrainingDay = lastWorkoutDateKey !== todayKey;

  if (isNewTrainingDay) {
    // Streak continues only if the previous logged day was yesterday.
    const yesterdayKey = toDateKey(addDays(now, -1));
    const currentStreak = await Storage.get<number>('streak', 0);
    const nextStreak = lastWorkoutDateKey === yesterdayKey ? currentStreak + 1 : 1;
    await Storage.set('streak', nextStreak);
    const bestStreak = await Storage.get<number>('bestStreak', 0);
    await Storage.set('bestStreak', Math.max(bestStreak, nextStreak));

    // Weekly completion resets whenever we cross into a new Monday.
    const thisWeekStartKey = getWeekStartKey(now);
    const storedWeekStartKey = await Storage.get<string | null>('completedWeekStartKey', null);
    const priorCompleted = storedWeekStartKey === thisWeekStartKey
      ? await Storage.get<number>('completedThisWeek', 0)
      : 0;
    await Storage.set('completedThisWeek', priorCompleted + 1);
    await Storage.set('completedWeekStartKey', thisWeekStartKey);

    await Storage.set('lastWorkoutDateKey', todayKey);
  }

  await Storage.set('lastWorkout', {
    split: input.title,
    dateLabel: formatDateLabel(now),
    durationLabel,
    exercisesCompleted: input.exercisesCompleted,
    totalExercises: input.totalExercises,
  });

  // Full history entry, newest first, capped so storage cannot grow unbounded.
  const history = await Storage.get<HistoryEntry[]>('workoutHistory', []);
  history.unshift({
    id: `${todayKey}-${Date.now()}`,
    dateKey: todayKey,
    dateLabel: formatDateLabel(now),
    split: input.title,
    durationLabel,
    exercisesCompleted: input.exercisesCompleted,
    totalExercises: input.totalExercises,
    calories,
    exercises: input.exerciseData,
  });
  await Storage.set('workoutHistory', history.slice(0, 100));

  return { durationLabel, calories };
}
