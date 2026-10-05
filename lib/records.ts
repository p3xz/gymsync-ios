// Personal records, derived from workout history. A record is the
// heaviest completed weight logged for an exercise name. History entries
// are newest-first, so the first label seen per exercise is the latest.

import type { HistoryEntry } from './workout';

export interface ExerciseRecord {
  name: string;
  bestWeight: number;
  sessions: number;
  lastDateLabel: string;
}

/** Best completed weight per exercise name. Used for mid-workout PR checks. */
export function bestWeightByExercise(history: HistoryEntry[]): Map<string, number> {
  const map = new Map<string, number>();
  for (const entry of history) {
    for (const ex of entry.exercises) {
      if (!ex.completed || ex.weight === null || ex.weight <= 0) continue;
      if (ex.weight > (map.get(ex.name) ?? 0)) map.set(ex.name, ex.weight);
    }
  }
  return map;
}

/** Full record table for the Records section, sorted by best weight. */
export function computeRecords(history: HistoryEntry[]): ExerciseRecord[] {
  const best = new Map<string, number>();
  const sessions = new Map<string, number>();
  const lastLabel = new Map<string, string>();
  for (const entry of history) {
    for (const ex of entry.exercises) {
      if (!ex.completed) continue;
      sessions.set(ex.name, (sessions.get(ex.name) ?? 0) + 1);
      if (!lastLabel.has(ex.name)) lastLabel.set(ex.name, entry.dateLabel);
      if (ex.weight !== null && ex.weight > 0 && ex.weight > (best.get(ex.name) ?? 0)) {
        best.set(ex.name, ex.weight);
      }
    }
  }
  return [...sessions.entries()]
    .map(([name, count]) => ({
      name,
      bestWeight: best.get(name) ?? 0,
      sessions: count,
      lastDateLabel: lastLabel.get(name) ?? '',
    }))
    .sort((a, b) => b.bestWeight - a.bestWeight);
}
