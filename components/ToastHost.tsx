// ToastHost: renders the current toast from lib/toast.ts as a floating
// dark card above the tab bar. Fades in on show and out on dismiss.
// Mount once in app/(tabs)/_layout.tsx.

import { useEffect, useRef, useState } from 'react';
import { Animated, StyleSheet, Text } from 'react-native';
import { subscribeToast } from '../lib/toast';
import { colors, radius, spacing } from '../lib/theme';

export default function ToastHost() {
  const [message, setMessage] = useState<string | null>(null);
  // Keeps rendering through the fade-out, then unmounts.
  const [shown, setShown] = useState(false);
  const opacity = useRef(new Animated.Value(0)).current;

  useEffect(() => subscribeToast(setMessage), []);

  useEffect(() => {
    if (message) {
      setShown(true);
      Animated.timing(opacity, {
        toValue: 1,
        duration: 200,
        useNativeDriver: true,
      }).start();
    } else if (shown) {
      Animated.timing(opacity, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }).start(({ finished }) => {
        if (finished) setShown(false);
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [message]);

  if (!shown) return null;

  return (
    <Animated.View style={[styles.host, { opacity }]} pointerEvents="none">
      <Animated.View style={styles.toast}>
        <Text style={styles.text}>{message}</Text>
      </Animated.View>
    </Animated.View>
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
