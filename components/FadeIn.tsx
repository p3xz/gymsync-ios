// FadeIn: wraps children in an Animated.View that fades in and slides up
// on FIRST mount only. Use with a staggered `delay` for entrance sequences.
// Built on React Native's Animated API (no Reanimated), subtle and fast.

import { useEffect, useRef, type ReactNode } from 'react';
import { Animated, type ViewStyle, type StyleProp } from 'react-native';

interface FadeInProps {
  children: ReactNode;
  /** Stagger delay in ms, e.g. index * 60 for list items. */
  delay?: number;
  style?: StyleProp<ViewStyle>;
}

export default function FadeIn({ children, delay = 0, style }: FadeInProps) {
  const opacity = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(12)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(opacity, {
        toValue: 1,
        duration: 250,
        delay,
        useNativeDriver: true,
      }),
      Animated.timing(translateY, {
        toValue: 0,
        duration: 250,
        delay,
        useNativeDriver: true,
      }),
    ]).start();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <Animated.View style={[{ opacity, transform: [{ translateY }] }, style]}>
      {children}
    </Animated.View>
  );
}
