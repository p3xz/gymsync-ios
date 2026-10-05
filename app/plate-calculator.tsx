// Plate calculator: enter the bar weight and the target, get the exact
// plates per side. Reached from the Workout tab header.

import { useRouter } from 'expo-router';
import { useState } from 'react';
import {
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors, radius, spacing } from '../lib/theme';
import { calculatePlates } from '../lib/plates';

export default function PlateCalculator() {
  const router = useRouter();
  const [bar, setBar] = useState('20');
  const [target, setTarget] = useState('100');

  const barWeight = parseFloat(bar) || 0;
  const targetWeight = parseFloat(target) || 0;
  const result = calculatePlates(barWeight, targetWeight);
  const showResult = targetWeight > 0;

  return (
    <SafeAreaView style={styles.screen} edges={['top']}>
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <TouchableOpacity style={styles.backRow} onPress={() => router.back()} activeOpacity={0.7}>
          <Ionicons name="chevron-back" size={22} color={colors.primaryStrong} />
          <Text style={styles.backText}>Workout</Text>
        </TouchableOpacity>

        <Text style={styles.title}>Plate Calculator</Text>
        <Text style={styles.meta}>Standard Olympic plates, per side</Text>

        <View style={styles.card}>
          <Text style={styles.inputLabel}>Bar weight (kg)</Text>
          <TextInput
            style={styles.input}
            value={bar}
            onChangeText={setBar}
            keyboardType="decimal-pad"
            placeholder="20"
            placeholderTextColor={colors.textTertiary}
          />
          <Text style={[styles.inputLabel, styles.secondLabel]}>Target weight (kg)</Text>
          <TextInput
            style={styles.input}
            value={target}
            onChangeText={setTarget}
            keyboardType="decimal-pad"
            placeholder="100"
            placeholderTextColor={colors.textTertiary}
          />
        </View>

        {showResult && (
          <View style={styles.card}>
            <Text style={styles.resultTitle}>
              {result.perSide.toFixed(2).replace(/\.?0+$/, '')} kg per side
            </Text>
            {result.plates.length === 0 ? (
              <Text style={styles.muted}>Just the bar — no plates needed.</Text>
            ) : (
              result.plates.map((p) => (
                <View key={p.weight} style={styles.plateRow}>
                  <View style={[styles.plateDisc, { width: 34 + p.weight }]}>
                    <Text style={styles.plateDiscText}>{p.weight}</Text>
                  </View>
                  <Text style={styles.plateText}>
                    {p.count} × {p.weight} kg
                  </Text>
                </View>
              ))
            )}
            <Text style={[styles.totalLine, !result.exact && styles.warning]}>
              {result.exact
                ? `Total: ${result.total} kg — exact.`
                : `Closest load: ${result.total} kg (target ${targetWeight} kg is not reachable with standard plates).`}
            </Text>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    padding: spacing.lg,
    paddingBottom: spacing.xl,
    gap: spacing.md,
  },
  backRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: spacing.sm,
  },
  backText: {
    color: colors.primaryStrong,
    fontSize: 16,
    fontWeight: '600',
  },
  title: {
    color: colors.text,
    fontSize: 28,
    fontWeight: '700',
  },
  meta: {
    color: colors.textSecondary,
    fontSize: 14,
    marginTop: -spacing.sm,
  },
  card: {
    backgroundColor: colors.card,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: radius.lg,
    padding: spacing.md,
  },
  inputLabel: {
    color: colors.textSecondary,
    fontSize: 13,
    marginBottom: 4,
  },
  secondLabel: {
    marginTop: spacing.sm,
  },
  input: {
    backgroundColor: colors.elevated,
    borderColor: colors.borderStrong,
    borderWidth: 1,
    borderRadius: radius.sm,
    color: colors.text,
    fontSize: 18,
    padding: spacing.sm,
    fontVariant: ['tabular-nums'],
  },
  resultTitle: {
    color: colors.text,
    fontSize: 20,
    fontWeight: '700',
    marginBottom: spacing.sm,
  },
  muted: {
    color: colors.textSecondary,
    fontSize: 15,
  },
  plateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: spacing.xs,
  },
  plateDisc: {
    height: 34,
    borderRadius: 17,
    backgroundColor: colors.elevated,
    borderColor: colors.primaryStrong,
    borderWidth: 2,
    justifyContent: 'center',
    alignItems: 'center',
  },
  plateDiscText: {
    color: colors.primaryStrong,
    fontSize: 11,
    fontWeight: '700',
  },
  plateText: {
    color: colors.text,
    fontSize: 16,
    fontWeight: '600',
  },
  totalLine: {
    color: colors.textSecondary,
    fontSize: 14,
    marginTop: spacing.sm,
  },
  warning: {
    color: colors.warning,
  },
});
