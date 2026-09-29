// Live Activity bridge: shows the active workout in the iOS Dynamic Island
// and on the Lock Screen (live timer + exercise progress).
//
// iOS-only. Every function is a silent no-op on Android or when ActivityKit
// is unavailable, and all errors are swallowed: a widget failure must never
// break a workout.
//
// The island renders its own ticking timer from `startedAt` (epoch seconds),
// so the app only pushes updates when exercise progress changes.

import { Platform } from 'react-native';
import type { LiveActivityHandle } from 'expo-targets';

type IslandHandle = LiveActivityHandle<'GymWidgetsAttributes'>;

let handle: IslandHandle | null = null;
let handleBroken = false;
let activeId: string | null = null;

async function getHandle(): Promise<IslandHandle | null> {
  if (Platform.OS !== 'ios' || handleBroken) return null;
  if (handle) return handle;
  try {
    const { areLiveActivitiesEnabled } = await import('expo-targets');
    if (!(await areLiveActivitiesEnabled())) return null;
    const { gymWidgetsLiveActivity } = await import('../targets/gym-widgets');
    handle = gymWidgetsLiveActivity as IslandHandle;
    return handle;
  } catch {
    // Broken bridge: don't retry for the rest of this app session.
    handleBroken = true;
    return null;
  }
}

/** Show the island when a workout session begins. Replaces any stale one. */
export async function startWorkoutIsland(
  title: string,
  total: number,
  startedAtMs: number,
  completed = 0
): Promise<void> {
  try {
    const island = await getHandle();
    if (!island) return;
    if (activeId) {
      try {
        await island.end(activeId);
      } catch {
        // Stale id; the fresh start replaces it anyway.
      }
      activeId = null;
    }
    activeId = await island.start({
      attributes: { title },
      contentState: { startedAt: startedAtMs / 1000, completed, total },
    });
  } catch {
    // Silent: the workout never depends on the island.
  }
}

/** Push progress to the island. The timer ticks on-device; no per-second pushes. */
export async function updateWorkoutIsland(
  completed: number,
  total: number,
  startedAtMs: number
): Promise<void> {
  try {
    const island = await getHandle();
    if (!island || !activeId) return;
    await island.update(activeId, {
      startedAt: startedAtMs / 1000,
      completed,
      total,
    });
  } catch {
    // Silent.
  }
}

/** Dismiss the island when the workout is finished. */
export async function endWorkoutIsland(): Promise<void> {
  try {
    const island = await getHandle();
    if (!island || !activeId) return;
    const id = activeId;
    activeId = null;
    await island.end(id);
  } catch {
    // Silent.
  }
}
