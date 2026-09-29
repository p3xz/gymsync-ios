// Thin wrapper around expo-haptics. Every function no-ops silently if
// the native module is unavailable (Expo Go, web, or a failed install).

import * as Haptics from 'expo-haptics';

export async function impactLight(): Promise<void> {
  try {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  } catch {
    // Haptics unavailable; stay silent.
  }
}

export async function impactMedium(): Promise<void> {
  try {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
  } catch {
    // Haptics unavailable; stay silent.
  }
}

export async function notifySuccess(): Promise<void> {
  try {
    await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  } catch {
    // Haptics unavailable; stay silent.
  }
}

export async function notifyError(): Promise<void> {
  try {
    await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
  } catch {
    // Haptics unavailable; stay silent.
  }
}
