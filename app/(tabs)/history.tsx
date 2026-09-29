// History tab: totals plus an expandable list of past workouts,
// newest first. Re-renders on every focus since new entries can
// appear at any point in the session.

import { useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Storage } from '../../lib/storage';
import { colors, radius, spacing } from '../../lib/theme';
import type { HistoryEntry } from '../../lib/workout';

export default function History() {
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [streak, setStreak] = useState(0);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  useFocusEffect(
    useCallback(() => {
      let cancelled = false;
      (async () => {
        const [h, s] = await Promise.all([
          Storage.get<HistoryEntry[]>('workoutHistory', []),
          Storage.get<number>('streak', 0),
        ]);
        if (cancelled) return;
        setHistory(h);
        setStreak(s);
      })();
      return () => {
        cancelled = true;
      };
    }, [])
  );

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <Text style={styles.title}>History</Text>
      <Text style={styles.meta}>
        {history.length === 0 ? 'No workouts logged yet' : `${history.length} workout${history.length === 1 ? '' : 's'} logged`}
      </Text>

      <View style={styles.statRow}>
        <View style={[styles.card, styles.statCard]}>
          <Ionicons name="bar-chart" size={20} color={colors.primaryStrong} />
          <Text style={styles.statValue}>{history.length}</Text>
          <Text style={styles.statLabel}>Total Workouts</Text>
        </View>
        <View style={[styles.card, styles.statCard]}>
          <Ionicons name="flame" size={20} color={colors.primaryStrong} />
          <Text style={styles.statValue}>{streak}</Text>
          <Text style={styles.statLabel}>Day Streak</Text>
        </View>
      </View>

      {history.map((entry) => {
        const expanded = expandedId === entry.id;
        return (
          <View key={entry.id} style={styles.card}>
            <TouchableOpacity
              style={styles.entryHeader}
              onPress={() => setExpandedId(expanded ? null : entry.id)}
              activeOpacity={0.7}
            >
              <View>
                <Text style={styles.entrySplit}>{entry.split}</Text>
                <Text style={styles.entryDate}>{entry.dateLabel}</Text>
              </View>
              <View style={styles.entryRight}>
                <Text style={styles.entryMeta}>
                  {entry.exercisesCompleted}/{entry.totalExercises} · {entry.durationLabel}
                </Text>
                <Ionicons
                  name={expanded ? 'chevron-up' : 'chevron-down'}
                  size={18}
                  color={colors.textTertiary}
                />
              </View>
            </TouchableOpacity>

            {expanded && (
              <View style={styles.entryDetail}>
                <Text style={styles.entryMeta}>Calories: {entry.calories}</Text>
                {entry.exercises.map((ex, i) => (
                  <View key={i} style={styles.loggedExercise}>
                    <Ionicons
                      name={ex.completed ? 'checkmark-circle' : 'ellipse-outline'}
                      size={16}
                      color={ex.completed ? colors.primaryStrong : colors.textTertiary}
                    />
                    <View style={styles.loggedInfo}>
                      <Text style={styles.loggedName}>{ex.name}</Text>
                      {(ex.weight !== null || ex.notes) && (
                        <Text style={styles.loggedSub}>
                          {[ex.weight !== null ? `${ex.weight} kg` : null, ex.notes]
                            .filter(Boolean)
                            .join(' · ')}
                        </Text>
                      )}
                    </View>
                  </View>
                ))}
              </View>
            )}
          </View>
        );
      })}
    </ScrollView>
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
  statRow: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  statCard: {
    flex: 1,
    gap: 4,
  },
  statValue: {
    color: colors.text,
    fontSize: 24,
    fontWeight: '700',
  },
  statLabel: {
    color: colors.textSecondary,
    fontSize: 13,
  },
  entryHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  entrySplit: {
    color: colors.text,
    fontSize: 17,
    fontWeight: '600',
  },
  entryDate: {
    color: colors.textTertiary,
    fontSize: 13,
    marginTop: 2,
  },
  entryRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  entryMeta: {
    color: colors.textSecondary,
    fontSize: 13,
  },
  entryDetail: {
    marginTop: spacing.sm,
    paddingTop: spacing.sm,
    borderTopColor: colors.border,
    borderTopWidth: 1,
    gap: spacing.xs,
  },
  loggedExercise: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.xs,
    paddingVertical: 2,
  },
  loggedInfo: {
    flex: 1,
  },
  loggedName: {
    color: colors.text,
    fontSize: 14,
  },
  loggedSub: {
    color: colors.textTertiary,
    fontSize: 12,
  },
});
