// ToastHost: renders the current toast from lib/toast.ts as a floating
// dark card above the tab bar. Mount once in app/(tabs)/_layout.tsx.

import { useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { subscribeToast } from '../lib/toast';
import { colors, radius, spacing } from '../lib/theme';

export default function ToastHost() {
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => subscribeToast(setMessage), []);

  if (!message) return null;

  return (
    <View style={styles.host} pointerEvents="none">
      <View style={styles.toast}>
        <Text style={styles.text}>{message}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  host: {
    position: 'absolute',
    left: spacing.lg,
    right: spacing.lg,
    bottom: 96,
    alignItems: 'center',
    zIndex: 100,
  },
  toast: {
    backgroundColor: colors.elevated,
    borderColor: colors.borderStrong,
    borderWidth: 1,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    maxWidth: '100%',
  },
  text: {
    color: colors.text,
    fontSize: 14,
    textAlign: 'center',
  },
});
