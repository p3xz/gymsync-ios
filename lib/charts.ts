// Progress charts, derived from workout history. Volume here is the sum
// of completed exercise weights per week (the app logs one weight per
// exercise, not per set, so this is a consistent proxy, not lab science).

import {
  addDays,
  formatDateLabel,
  getWeekStartKey,
  toDateKey,
  type HistoryEntry,
} from './workout';

export interface WeekPoint {
  weekStartKey: string;
  label: string;
  value: number;
}

const WEEKS = 8;

/** Ordered list of the last N Monday week-start keys, oldest first. */
function lastWeekKeys(now: Date, count: number): string[] {
  const keys: string[] = [];
  const thisMonday = getWeekStartKey(now);
  for (let i = count - 1; i >= 0; i--) {
    const [y, m, d] = thisMonday.split('-').map(Number);
    keys.push(toDateKey(addDays(new Date(y, m - 1, d), -7 * i)));
  }
  return keys;
}

function shortLabel(weekStartKey: string): string {
  const [y, m, d] = weekStartKey.split('-').map(Number);
  return formatDateLabel(new Date(y, m - 1, d));
}

/** Total lifted weight per week for the last 8 weeks, oldest first. */
export function weeklyVolume(history: HistoryEntry[], now: Date = new Date()): WeekPoint[] {
  const keys = lastWeekKeys(now, WEEKS);
  const totals = new Map<string, number>(keys.map((k) => [k, 0]));
  for (const entry of history) {
    const weekKey = getWeekStartKey(new Date(entry.dateKey + 'T12:00:00'));
    if (!totals.has(weekKey)) continue;
    for (const ex of entry.exercises) {
      if (ex.completed && ex.weight !== null && ex.weight > 0) {
        totals.set(weekKey, (totals.get(weekKey) ?? 0) + ex.weight);
      }
    }
  }
  return keys.map((k) => ({ weekStartKey: k, label: shortLabel(k), value: totals.get(k) ?? 0 }));
}

/** Exercise names that have at least one logged weight, for the trend picker. */
export function exercisesWithWeights(history: HistoryEntry[]): string[] {
  const names = new Set<string>();
  for (const entry of history) {
    for (const ex of entry.exercises) {
      if (ex.completed && ex.weight !== null && ex.weight > 0) names.add(ex.name);
    }
  }
  return [...names].sort();
}

/** Best completed weight per week for one exercise, last 8 weeks. */
export function weeklyBestForExercise(
  history: HistoryEntry[],
  name: string,
  now: Date = new Date()
): WeekPoint[] {
  const keys = lastWeekKeys(now, WEEKS);
  const best = new Map<string, number>(keys.map((k) => [k, 0]));
  for (const entry of history) {
    const weekKey = getWeekStartKey(new Date(entry.dateKey + 'T12:00:00'));
    if (!best.has(weekKey)) continue;
    for (const ex of entry.exercises) {
      if (ex.name === name && ex.completed && ex.weight !== null && ex.weight > 0) {
        if (ex.weight > (best.get(weekKey) ?? 0)) best.set(weekKey, ex.weight);
      }
    }
  }
  return keys.map((k) => ({ weekStartKey: k, label: shortLabel(k), value: best.get(k) ?? 0 }));
}
