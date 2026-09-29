// Home tab: greeting + live clock, today's workout card, quick stats,
// motivational quote, and the Start Workout button.

import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useApp } from '../_layout';
import { Storage } from '../../lib/storage';
import { colors, radius, spacing } from '../../lib/theme';
import {
  WEEKDAY_NAMES,
  formatClock,
  formatDateLabel,
  getQuoteForToday,
  getTodaysWorkout,
  getTrainingDaysPerWeek,
  type ResolvedWorkout,
} from '../../lib/workout';

interface HomeStats {
  streak: number;
  completedThisWeek: number;
  trainingDays: number;
  lastWorkoutLabel: string;
}

export default function Home() {
  const { name } = useApp();
  const router = useRouter();
  const [now, setNow] = useState(() => new Date());
  const [workout, setWorkout] = useState<ResolvedWorkout | null>(null);
  const [stats, setStats] = useState<HomeStats>({ streak: 0, completedThisWeek: 0, trainingDays: 0, lastWorkoutLabel: 'No workouts yet' });

  // Live clock, ticking once a second like the web dashboard.
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, []);

  // Re-read stats and today's workout every time the tab regains focus,
  // so finishing a workout on the Workout tab updates this screen.
  useFocusEffect(
    useCallback(() => {
      let cancelled = false;
      (async () => {
        const [resolved, streak, completedThisWeek, trainingDays, lastWorkout] = await Promise.all([
          getTodaysWorkout(),
          Storage.get<number>('streak', 0),
          Storage.get<number>('completedThisWeek', 0),
          getTrainingDaysPerWeek(),
          Storage.get<{ split: string; dateLabel: string } | null>('lastWorkout', null),
        ]);
        if (cancelled) return;
        setWorkout(resolved);
        setStats({
          streak,
          completedThisWeek,
          trainingDays,
          lastWorkoutLabel: lastWorkout ? `${lastWorkout.split} - ${lastWorkout.dateLabel}` : 'No workouts yet',
        });
      })();
      return () => {
        cancelled = true;
      };
    }, [])
  );

  const quote = getQuoteForToday(now);
  const greeting = name ? `Welcome back, ${name}` : 'Welcome back';

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <Text style={styles.greeting}>{greeting}</Text>
      <Text style={styles.meta}>
        {WEEKDAY_NAMES[now.getDay()]} · {formatDateLabel(now)} · {formatClock(now)}
      </Text>

      {/* Today's workout */}
      <View style={styles.card}>
        <Text style={styles.cardLabel}>Today's Workout</Text>
        <Text style={styles.cardTitle}>{workout ? workout.title : 'Loading'}</Text>
        <Text style={styles.cardSub}>{workout ? workout.subtitle : 'Loading your split'}</Text>
      </View>

      {/* Quick stats */}
      <View style={styles.statRow}>
        <View style={[styles.card, styles.statCard]}>
          <Ionicons name="flame" size={20} color={colors.primaryStrong} />
          <Text style={styles.statValue}>{stats.streak}</Text>
          <Text style={styles.statLabel}>Day Streak</Text>
        </View>
        <View style={[styles.card, styles.statCard]}>
          <Ionicons name="checkmark-circle" size={20} color={colors.primaryStrong} />
          <Text style={styles.statValue}>
            {stats.completedThisWeek}/{stats.trainingDays}
          </Text>
          <Text style={styles.statLabel}>This Week</Text>
        </View>
      </View>
      <View style={[styles.card, styles.wideCard]}>
        <Ionicons name="time" size={20} color={colors.primaryStrong} />
        <Text style={styles.statValueSmall}>{stats.lastWorkoutLabel}</Text>
        <Text style={styles.statLabel}>Last Workout</Text>
      </View>

      {/* Motivational quote */}
      <View style={styles.card}>
        <Text style={styles.quoteText}>"{quote.text}"</Text>
        <Text style={styles.quoteAuthor}>- {quote.author}</Text>
      </View>

      <TouchableOpacity
        style={styles.startButton}
        onPress={() => router.navigate('/workout')}
        activeOpacity={0.85}
      >
        <Text style={styles.startButtonText}>Start Workout</Text>
      </TouchableOpacity>
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
  greeting: {
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
  cardLabel: {
    color: colors.textSecondary,
    fontSize: 13,
    marginBottom: 4,
  },
  cardTitle: {
    color: colors.text,
    fontSize: 22,
    fontWeight: '700',
  },
  cardSub: {
    color: colors.textTertiary,
    fontSize: 14,
    marginTop: 4,
  },
  statRow: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  statCard: {
    flex: 1,
    alignItems: 'flex-start',
    gap: 4,
  },
  wideCard: {
    gap: 4,
  },
  statValue: {
    color: colors.text,
    fontSize: 24,
    fontWeight: '700',
  },
  statValueSmall: {
    color: colors.text,
    fontSize: 16,
    fontWeight: '600',
  },
  statLabel: {
    color: colors.textSecondary,
    fontSize: 13,
  },
  quoteText: {
    color: colors.text,
    fontSize: 16,
    fontStyle: 'italic',
    lineHeight: 24,
  },
  quoteAuthor: {
    color: colors.textTertiary,
    fontSize: 13,
    marginTop: spacing.xs,
    textAlign: 'right',
  },
  startButton: {
    backgroundColor: colors.primary,
    borderRadius: radius.md,
    padding: spacing.md,
    alignItems: 'center',
    marginTop: spacing.sm,
  },
  startButtonText: {
    color: '#ffffff',
    fontSize: 17,
    fontWeight: '600',
  },
});
