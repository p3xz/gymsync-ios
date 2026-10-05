// Program catalog: browse paid training programs. Previews are real;
// the purchase button is honest about checkout not existing yet.

import { useRouter } from 'expo-router';
import { useState } from 'react';
import {
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors, radius, spacing } from '../lib/theme';
import { toast } from '../lib/toast';
import { PROGRAMS } from '../lib/programs';

export default function Programs() {
  const router = useRouter();
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const buyProgram = () => {
    // PAYMENTS TODO: route through the same Razorpay/UPI checkout as Pro.
    toast('Program purchases coming soon');
  };

  return (
    <SafeAreaView style={styles.screen} edges={['top']}>
      <ScrollView contentContainerStyle={styles.content}>
        <TouchableOpacity style={styles.backRow} onPress={() => router.back()} activeOpacity={0.7}>
          <Ionicons name="chevron-back" size={22} color={colors.primaryStrong} />
          <Text style={styles.backText}>Routines</Text>
        </TouchableOpacity>

        <Text style={styles.title}>Programs</Text>
        <Text style={styles.meta}>Ready-made training plans by level</Text>

        {PROGRAMS.map((program) => {
          const expanded = expandedId === program.id;
          return (
            <View key={program.id} style={styles.card}>
              <TouchableOpacity
                onPress={() => setExpandedId(expanded ? null : program.id)}
                activeOpacity={0.7}
              >
                <View style={styles.programTop}>
                  <View style={styles.programInfo}>
                    <Text style={styles.programName}>{program.name}</Text>
                    <Text style={styles.programTagline}>{program.tagline}</Text>
                    <Text style={styles.programMeta}>
                      {program.level} · {program.weeks} weeks · {program.daysPerWeek} days/week
                    </Text>
                  </View>
                  <View style={styles.priceWrap}>
                    <Text style={styles.price}>{program.price}</Text>
                    <Ionicons
                      name={expanded ? 'chevron-up' : 'chevron-down'}
                      size={18}
                      color={colors.textTertiary}
                    />
                  </View>
                </View>
              </TouchableOpacity>

              {expanded && (
                <View style={styles.preview}>
                  <Text style={styles.previewDesc}>{program.description}</Text>
                  {program.schedule.map((day) => (
                    <View key={day.day} style={styles.dayBlock}>
                      <Text style={styles.dayTitle}>
                        {day.day} — {day.focus}
                      </Text>
                      {day.exercises.map((ex) => (
                        <Text key={ex.name} style={styles.dayExercise}>
                          {ex.name} · {ex.sets} × {ex.reps}
                        </Text>
                      ))}
                    </View>
                  ))}
                  <TouchableOpacity
                    style={styles.buyButton}
                    onPress={buyProgram}
                    activeOpacity={0.85}
                  >
                    <Text style={styles.buyButtonText}>Get program — {program.price}</Text>
                  </TouchableOpacity>
                </View>
              )}
            </View>
          );
        })}
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
  programTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: spacing.sm,
  },
  programInfo: {
    flex: 1,
  },
  programName: {
    color: colors.text,
    fontSize: 18,
    fontWeight: '700',
  },
  programTagline: {
    color: colors.textSecondary,
    fontSize: 14,
    marginTop: 2,
  },
  programMeta: {
    color: colors.textTertiary,
    fontSize: 12,
    marginTop: 4,
  },
  priceWrap: {
    alignItems: 'flex-end',
    gap: 4,
  },
  price: {
    color: colors.primaryStrong,
    fontSize: 18,
    fontWeight: '700',
  },
  preview: {
    marginTop: spacing.sm,
    paddingTop: spacing.sm,
    borderTopColor: colors.border,
    borderTopWidth: 1,
  },
  previewDesc: {
    color: colors.textSecondary,
    fontSize: 14,
    lineHeight: 20,
    marginBottom: spacing.sm,
  },
  dayBlock: {
    marginBottom: spacing.sm,
  },
  dayTitle: {
    color: colors.text,
    fontSize: 15,
    fontWeight: '700',
    marginBottom: 4,
  },
  dayExercise: {
    color: colors.textTertiary,
    fontSize: 13,
    marginTop: 2,
  },
  buyButton: {
    backgroundColor: colors.primary,
    borderRadius: radius.md,
    padding: spacing.md,
    alignItems: 'center',
    marginTop: spacing.sm,
  },
  buyButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '700',
  },
});
