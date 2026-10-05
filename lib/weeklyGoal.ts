// Weekly training goal: the user sets a target number of sessions per
// week. If Sunday arrives and they are behind pace, a local notification
// nudges them. One nudge per week, tracked by the week's Monday key.

import { Platform } from 'react-native';
import * as Notifications from 'expo-notifications';
import { Storage } from './storage';
import { getWeekStartKey } from './workout';

const GOAL_KEY = 'weeklyGoal';
const NUDGE_SENT_KEY = 'weeklyNudgeSentFor';
const DEFAULT_GOAL = 4;
const NUDGE_HOUR = 18; // 6 PM local

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldPlaySound: false,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

export async function getWeeklyGoal(): Promise<number> {
  const stored = await Storage.get<number>(GOAL_KEY, DEFAULT_GOAL);
  return Math.min(7, Math.max(1, Math.round(stored) || DEFAULT_GOAL));
}

export async function setWeeklyGoal(goal: number): Promise<void> {
  await Storage.set(GOAL_KEY, Math.min(7, Math.max(1, Math.round(goal))));
}

async function ensurePermission(): Promise<boolean> {
  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('weekly-goal', {
      name: 'Weekly goal reminders',
      importance: Notifications.AndroidImportance.DEFAULT,
    });
  }
  const { status } = await Notifications.getPermissionsAsync();
  if (status === 'granted') return true;
  const req = await Notifications.requestPermissionsAsync();
  return req.status === 'granted';
}

/**
 * Fires the Sunday nudge when the user is behind their weekly goal.
 * Safe to call on every app open: it no-ops on non-Sundays, when the
 * goal is already met, and once per week.
 */
export async function checkWeeklyGoalNudge(): Promise<void> {
  try {
    const now = new Date();
    if (now.getDay() !== 0) return; // Sunday only

    const weekKey = getWeekStartKey(now);
    const sentFor = await Storage.get<string | null>(NUDGE_SENT_KEY, null);
    if (sentFor === weekKey) return;

    const [goal, completed] = await Promise.all([
      getWeeklyGoal(),
      Storage.get<number>('completedThisWeek', 0),
    ]);
    if (completed >= goal) return;

    const ok = await ensurePermission();
    if (!ok) return;

    const fireAt = new Date(now);
    fireAt.setHours(NUDGE_HOUR, 0, 0, 0);
    const secondsUntil = Math.max(5, Math.round((fireAt.getTime() - now.getTime()) / 1000));

    await Notifications.scheduleNotificationAsync({
      content: {
        title: 'Weekly goal check-in',
        body: `You've logged ${completed} of ${goal} sessions this week. One more workout keeps the streak alive.`,
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
        seconds: secondsUntil,
      },
    });
    await Storage.set(NUDGE_SENT_KEY, weekKey);
  } catch {
    // Reminders are best-effort; never break the app over them.
  }
}
