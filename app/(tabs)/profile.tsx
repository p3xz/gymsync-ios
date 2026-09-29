// Profile tab: edit the user name, lifetime stats, and the danger zone
// (reset all data, with confirmation, dropping back to onboarding).

import { useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useApp } from '../_layout';
import { Storage } from '../../lib/storage';
import { toast } from '../../lib/toast';
import { clearGeminiKey, getGeminiKey, saveGeminiKey } from '../../lib/gemini';
import { colors, radius, spacing } from '../../lib/theme';
import type { HistoryEntry } from '../../lib/workout';

export default function Profile() {
  const { name, refreshName, resetApp } = useApp();
  const [draftName, setDraftName] = useState(name ?? '');
  const [savedNote, setSavedNote] = useState(false);
  const [totalWorkouts, setTotalWorkouts] = useState(0);
  const [streak, setStreak] = useState(0);
  const [bestStreak, setBestStreak] = useState(0);
  const [apiKey, setApiKey] = useState('');
  const [hasKey, setHasKey] = useState(false);
  const [keySavedNote, setKeySavedNote] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);

  const reload = useCallback(async () => {
    try {
      const [h, s, b, key] = await Promise.all([
        Storage.get<HistoryEntry[]>('workoutHistory', []),
        Storage.get<number>('streak', 0),
        Storage.get<number>('bestStreak', 0),
        getGeminiKey(),
      ]);
      setTotalWorkouts(h.length);
      setStreak(s);
      setBestStreak(b);
      setHasKey(key.length > 0);
      if (!key) setApiKey('');
      setLoadError(false);
    } catch {
      setLoadError(true);
    } finally {
      setInitialLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      setDraftName(name ?? '');
      void reload();
    }, [name, reload])
  );

  const saveName = async () => {
    const trimmed = draftName.trim();
    if (!trimmed) return;
    await Storage.set('userName', trimmed);
    await refreshName();
    setSavedNote(true);
    setTimeout(() => setSavedNote(false), 2000);
  };

  const saveKey = async () => {
    const trimmed = apiKey.trim();
    if (!trimmed) return;
    await saveGeminiKey(trimmed);
    setApiKey('');
    setHasKey(true);
    setKeySavedNote(true);
    setTimeout(() => setKeySavedNote(false), 2000);
    toast('API key saved');
  };

  const removeKey = () => {
    Alert.alert('Remove API key?', 'AI routine features will stop working until you add a key again.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Remove',
        style: 'destructive',
        onPress: async () => {
          await clearGeminiKey();
          setHasKey(false);
          setApiKey('');
          toast('API key removed');
        },
      },
    ]);
  };

  const confirmReset = () => {
    Alert.alert(
      'Reset all data?',
      'This permanently clears your name, stats, routines, and workout history from this device. This cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Reset Everything',
          style: 'destructive',
          onPress: () => void resetApp(),
        },
      ]
    );
  };

  if (initialLoading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={colors.primaryStrong} />
      </View>
    );
  }

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <Text style={styles.title}>Profile</Text>
      <Text style={styles.meta}>Manage your name, progress, and data</Text>

      {loadError && (
        <View style={styles.card}>
          <Text style={styles.errorTitle}>Couldn't load your data.</Text>
          <TouchableOpacity style={styles.retryButton} onPress={() => void reload()} activeOpacity={0.8}>
            <Text style={styles.retryButtonText}>Retry</Text>
          </TouchableOpacity>
        </View>
      )}

      <View style={styles.card}>
        <Text style={styles.cardLabel}>Your Name</Text>
        <View style={styles.nameRow}>
          <TextInput
            style={[styles.input, styles.nameInput]}
            value={draftName}
            onChangeText={(v) => {
              setDraftName(v);
              setSavedNote(false);
            }}
            placeholder="Your name"
            placeholderTextColor={colors.textTertiary}
            maxLength={30}
            autoCorrect={false}
          />
          <TouchableOpacity
            style={[styles.saveButton, draftName.trim().length === 0 && styles.saveButtonDisabled]}
            onPress={() => void saveName()}
            disabled={draftName.trim().length === 0}
            activeOpacity={0.8}
          >
            <Text style={styles.saveButtonText}>Save</Text>
          </TouchableOpacity>
        </View>
        {savedNote && <Text style={styles.savedNote}>Saved.</Text>}
      </View>

      <View style={styles.card}>
        <View style={styles.aiCardTitleRow}>
          <Ionicons name="sparkles" size={18} color={colors.primaryStrong} />
          <Text style={styles.cardLabel}>AI Coach</Text>
        </View>
        <Text style={styles.hint}>
          {hasKey
            ? 'API key saved. Use the AI button in the Routines tab to generate or edit routines.'
            : 'Add a Gemini API key to generate routines with AI. Get a free key at Google AI Studio (aistudio.google.com). The key is stored only on this device.'}
        </Text>
        {hasKey ? (
          <TouchableOpacity style={styles.removeKeyButton} onPress={removeKey} activeOpacity={0.8}>
            <Text style={styles.removeKeyButtonText}>Remove API Key</Text>
          </TouchableOpacity>
        ) : (
          <View style={styles.nameRow}>
            <TextInput
              style={[styles.input, styles.nameInput]}
              value={apiKey}
              onChangeText={setApiKey}
              placeholder="Paste Gemini API key"
              placeholderTextColor={colors.textTertiary}
              secureTextEntry
              autoCapitalize="none"
              autoCorrect={false}
            />
            <TouchableOpacity
              style={[styles.saveButton, !apiKey.trim() && styles.saveButtonDisabled]}
              onPress={() => void saveKey()}
              activeOpacity={0.8}
              disabled={!apiKey.trim()}
            >
              <Text style={styles.saveButtonText}>Save</Text>
            </TouchableOpacity>
          </View>
        )}
        {keySavedNote && <Text style={styles.savedNote}>Saved.</Text>}
      </View>

      <View style={styles.statRow}>
        <View style={[styles.card, styles.statCard]}>
          <Ionicons name="bar-chart" size={20} color={colors.primaryStrong} />
          <Text style={styles.statValue}>{totalWorkouts}</Text>
          <Text style={styles.statLabel}>Total Workouts</Text>
        </View>
        <View style={[styles.card, styles.statCard]}>
          <Ionicons name="flame" size={20} color={colors.primaryStrong} />
          <Text style={styles.statValue}>{streak}</Text>
          <Text style={styles.statLabel}>Current Streak</Text>
        </View>
      </View>
      <View style={styles.card}>
        <Ionicons name="trophy" size={20} color={colors.primaryStrong} />
        <Text style={styles.statValue}>{bestStreak}</Text>
        <Text style={styles.statLabel}>Best Streak</Text>
      </View>

      <View style={[styles.card, styles.dangerCard]}>
        <Text style={styles.dangerTitle}>Reset All Data</Text>
        <Text style={styles.dangerDesc}>
          Permanently clears your name, stats, routines, and workout history from this device.
          This cannot be undone.
        </Text>
        <TouchableOpacity style={styles.dangerButton} onPress={confirmReset} activeOpacity={0.8}>
          <Text style={styles.dangerButtonText}>Reset All Data</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.card}>
        <Text style={styles.credits}>GymSync for iOS. All data stays on this device.</Text>
        <Text style={styles.creditsSub}>Ported from the GymSync web app.</Text>
      </View>
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
  cardLabel: {
    color: colors.textSecondary,
    fontSize: 13,
    marginBottom: spacing.xs,
  },
  aiCardTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  hint: {
    color: colors.textSecondary,
    fontSize: 13,
    lineHeight: 18,
    marginBottom: spacing.sm,
  },
  removeKeyButton: {
    borderColor: colors.danger,
    borderWidth: 1,
    borderRadius: radius.md,
    paddingVertical: spacing.sm,
    alignItems: 'center',
  },
  removeKeyButtonText: {
    color: colors.danger,
    fontSize: 15,
    fontWeight: '600',
  },
  nameRow: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  input: {
    backgroundColor: colors.elevated,
    borderColor: colors.borderStrong,
    borderWidth: 1,
    borderRadius: radius.md,
    color: colors.text,
    fontSize: 16,
    padding: spacing.sm,
  },
  nameInput: {
    flex: 1,
  },
  saveButton: {
    backgroundColor: colors.primary,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    justifyContent: 'center',
  },
  saveButtonDisabled: {
    opacity: 0.5,
  },
  saveButtonText: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '600',
  },
  savedNote: {
    color: colors.primaryStrong,
    fontSize: 13,
    marginTop: spacing.xs,
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
  dangerCard: {
    borderColor: 'rgba(229, 72, 77, 0.4)',
  },
  dangerTitle: {
    color: colors.danger,
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  dangerDesc: {
    color: colors.textSecondary,
    fontSize: 14,
    marginBottom: spacing.sm,
  },
  dangerButton: {
    backgroundColor: 'rgba(229, 72, 77, 0.15)',
    borderColor: colors.danger,
    borderWidth: 1,
    borderRadius: radius.md,
    padding: spacing.sm,
    alignItems: 'center',
  },
  dangerButtonText: {
    color: colors.danger,
    fontSize: 15,
    fontWeight: '600',
  },
  credits: {
    color: colors.textSecondary,
    fontSize: 13,
    textAlign: 'center',
  },
  creditsSub: {
    color: colors.textTertiary,
    fontSize: 12,
    textAlign: 'center',
    marginTop: 2,
  },
});
