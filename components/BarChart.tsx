// Minimal bar chart built from plain Views: no native chart deps.
// Bars are bottom-anchored and normalized to the max value.

import { StyleSheet, Text, View } from 'react-native';
import { colors, radius, spacing } from '../lib/theme';

export interface BarPoint {
  key: string;
  label: string;
  value: number;
}

export default function BarChart({ points }: { points: BarPoint[] }) {
  const max = Math.max(1, ...points.map((p) => p.value));
  return (
    <View style={styles.bars}>
      {points.map((p) => (
        <View key={p.key} style={styles.barCol}>
          <Text style={styles.barValue} numberOfLines={1}>
            {p.value > 0 ? Math.round(p.value) : ''}
          </Text>
          <View style={styles.barTrack}>
            <View
              style={[
                styles.barFill,
                { height: `${Math.max(2, (p.value / max) * 100)}%` },
                p.value === 0 && styles.barEmpty,
              ]}
            />
          </View>
          <Text style={styles.barLabel} numberOfLines={1}>
            {p.label}
          </Text>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  bars: {
    flexDirection: 'row',
    alignItems: 'stretch',
    gap: 4,
    marginTop: spacing.sm,
  },
  barCol: {
    flex: 1,
    alignItems: 'center',
  },
  barValue: {
    color: colors.textSecondary,
    fontSize: 10,
    fontVariant: ['tabular-nums'],
    height: 14,
  },
  barTrack: {
    height: 110,
    width: '100%',
    maxWidth: 40,
    backgroundColor: colors.elevated,
    borderRadius: radius.sm,
    justifyContent: 'flex-end',
    overflow: 'hidden',
  },
  barFill: {
    width: '100%',
    backgroundColor: colors.primaryStrong,
    borderRadius: radius.sm,
  },
  barEmpty: {
    backgroundColor: colors.border,
  },
  barLabel: {
    color: colors.textTertiary,
    fontSize: 10,
    marginTop: 4,
  },
});
