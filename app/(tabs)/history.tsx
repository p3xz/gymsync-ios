// History tab: totals plus an expandable list of past workouts,
// newest first. Re-renders on every focus since new entries can
// appear at any point in the session.

import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import FadeIn from '../../components/FadeIn';
import BarChart from '../../components/BarChart';
import { Storage } from '../../lib/storage';
import { colors, radius, spacing } from '../../lib/theme';
import {
  exercisesWithWeights,
  weeklyBestForExercise,
  weeklyVolume,
  type WeekPoint,
} from '../../lib/charts';
import { isPro } from '../../lib/pro';
import type { HistoryEntry } from '../../lib/workout';

export default function History() {
  const router = useRouter();
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [streak, setStreak] = useState(0);
  const [pro, setPro] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [volume, setVolume] = useState<WeekPoint[]>([]);
  const [trendNames, setTrendNames] = useState<string[]>([]);
  const [trendExercise, setTrendExercise] = useState<string | null>(null);
  const [trend, setTrend] = useState<WeekPoint[]>([]);
  const [initialLoading, setInitialLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadError, setLoadError] = useState(false);

  const reload = useCallback(async () => {
    try {
      const [h, s, p] = await Promise.all([
        Storage.get<HistoryEntry[]>('workoutHistory', []),
        Storage.get<number>('streak', 0),
        isPro(),
      ]);
      setHistory(h);
      setStreak(s);
      setPro(p);
      setVolume(weeklyVolume(h));
      const names = exercisesWithWeights(h);
      setTrendNames(names);
      const picked = trendExercise && names.includes(trendExercise) ? trendExercise : (names[0] ?? null);
      setTrendExercise(picked);
      setTrend(picked ? weeklyBestForExercise(h, picked) : []);
      setLoadError(false);
    } catch {
      setLoadError(true);
    } finally {
      setInitialLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      void reload();
    }, [reload])
  );

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await reload();
    setRefreshing(false);
  }, [reload]);

  const selectTrendExercise = (name: string) => {
    setTrendExercise(name);
    setTrend(weeklyBestForExercise(history, name));
  };

  if (initialLoading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={colors.primaryStrong} />
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.screen} edges={['top']}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => void onRefresh()}
          tintColor={colors.primaryStrong}
        />
      }
    >
      <Text style={styles.title}>History</Text>
      <Text style={styles.meta}>
        {history.length === 0 ? 'No workouts logged yet' : `${history.length} workout${history.length === 1 ? '' : 's'} logged`}
      </Text>

      {loadError && (
        <View style={styles.card}>
          <Text style={styles.errorTitle}>Couldn't load your data.</Text>
          <TouchableOpacity style={styles.retryButton} onPress={() => void reload()} activeOpacity={0.8}>
            <Text style={styles.retryButtonText}>Retry</Text>
          </TouchableOpacity>
        </View>
      )}

      <FadeIn delay={0}>
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
      </FadeIn>

      {history.length > 0 && !pro && (
        <FadeIn delay={60}>
          <TouchableOpacity
            style={styles.card}
            onPress={() => router.push('/upgrade')}
            activeOpacity={0.8}
          >
            <View style={styles.proPromptRow}>
              <Ionicons name="lock-closed-outline" size={18} color={colors.warning} />
              <View style={styles.proPromptInfo}>
                <Text style={styles.entrySplit}>Progress charts are Pro</Text>
                <Text style={styles.entryMeta}>Weekly volume and strength trends. Tap to see plans.</Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color={colors.textTertiary} />
            </View>
          </TouchableOpacity>
        </FadeIn>
      )}

      {history.length > 0 && pro && (
        <FadeIn delay={60}>
          <View style={styles.card}>
            <Text style={styles.sectionTitle}>Weekly Volume</Text>
            <Text style={styles.sectionSub}>Total kg lifted per week, last 8 weeks</Text>
            <BarChart
              points={volume.map((p) => ({ key: p.weekStartKey, label: p.label, value: p.value }))}
            />
          </View>
        </FadeIn>
      )}

      {trendNames.length > 0 && pro && (
        <FadeIn delay={120}>
          <View style={styles.card}>
            <Text style={styles.sectionTitle}>Strength Trend</Text>
            <Text style={styles.sectionSub}>Best weight per week</Text>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.chipRow}
            >
              {trendNames.map((name) => (
                <TouchableOpacity
                  key={name}
                  style={[styles.chip, trendExercise === name && styles.chipActive]}
                  onPress={() => selectTrendExercise(name)}
                  activeOpacity={0.8}
                >
                  <Text style={[styles.chipText, trendExercise === name && styles.chipTextActive]}>
                    {name}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
            <BarChart
              points={trend.map((p) => ({ key: p.weekStartKey, label: p.label, value: p.value }))}
            />
          </View>
        </FadeIn>
      )}

      {history.length === 0 ? (
        <FadeIn delay={60}>
          <View style={styles.card}>
            <Text style={styles.emptyTitle}>No workouts logged yet</Text>
            <Text style={styles.emptySub}>
              Finish a workout and it will show up here with all your sets and notes.
            </Text>
          </View>
        </FadeIn>
      ) : (
        history.map((entry, index) => {
        const expanded = expandedId === entry.id;
        return (
          <FadeIn key={entry.id} delay={Math.min(index, 8) * 60}>
          <View style={styles.card}>
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
          </FadeIn>
        );
      })
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
  scroll: {
    flex: 1,
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
    marginTop: spacing.md,
  },
  meta: {
    color: colors.textSecondary,
    fontSize: 14,
    marginTop: -spacing.sm,
  },
  centered: {
    flex: 1,
    backgroundColor: colors.background,
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorTitle: {
    color: colors.text,
    fontSize: 16,
    fontWeight: '600',
    marginBottom: spacing.sm,
  },
  retryButton: {
    backgroundColor: colors.card,
    borderColor: colors.borderStrong,
    borderWidth: 1,
    borderRadius: radius.md,
    paddingVertical: spacing.sm,
    alignItems: 'center',
  },
  retryButtonText: {
    color: colors.primaryStrong,
    fontSize: 15,
    fontWeight: '600',
  },
  emptyTitle: {
    color: colors.text,
    fontSize: 17,
    fontWeight: '600',
    marginBottom: 4,
  },
  emptySub: {
    color: colors.textSecondary,
    fontSize: 14,
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
  sectionTitle: {
    color: colors.text,
    fontSize: 17,
    fontWeight: '700',
  },
  sectionSub: {
    color: colors.textTertiary,
    fontSize: 13,
    marginTop: 2,
  },
  chipRow: {
    flexDirection: 'row',
    gap: 8,
    paddingVertical: spacing.sm,
  },
  chip: {
    borderColor: colors.borderStrong,
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: spacing.sm,
    paddingVertical: 6,
  },
  chipActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  chipText: {
    color: colors.textSecondary,
    fontSize: 13,
    fontWeight: '600',
  },
  chipTextActive: {
    color: '#ffffff',
  },
  proPromptRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  proPromptInfo: {
    flex: 1,
    gap: 2,
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
