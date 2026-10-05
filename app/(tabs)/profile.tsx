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
import { SafeAreaView } from 'react-native-safe-area-context';
import FadeIn from '../../components/FadeIn';
import appJson from '../../app.json';
import { useApp } from '../_layout';
import { Storage } from '../../lib/storage';
import { toast } from '../../lib/toast';
import { impactLight } from '../../lib/haptics';
import { clearGeminiKey, getGeminiKey, saveGeminiKey } from '../../lib/gemini';
import { REST_PRESETS } from '../../components/RestTimer';
import { exportBackup, pickBackupFile, restoreBackup, shareBackupFile } from '../../lib/backup';
import { computeRecords, type ExerciseRecord } from '../../lib/records';
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
  const [restSecs, setRestSecs] = useState(60);
  const [restAuto, setRestAuto] = useState(true);
  const [backupBusy, setBackupBusy] = useState(false);
  const [records, setRecords] = useState<ExerciseRecord[]>([]);
  const [initialLoading, setInitialLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);

  const reload = useCallback(async () => {
    try {
      const [h, s, b, key, rs, ra] = await Promise.all([
        Storage.get<HistoryEntry[]>('workoutHistory', []),
        Storage.get<number>('streak', 0),
        Storage.get<number>('bestStreak', 0),
        getGeminiKey(),
        Storage.get<number>('restTimerSecs', 60),
        Storage.get<boolean>('restTimerAuto', true),
      ]);
      setTotalWorkouts(h.length);
      setStreak(s);
      setBestStreak(b);
      setRecords(computeRecords(h));
      setHasKey(key.length > 0);
      if (!key) setApiKey('');
      setRestSecs(rs);
      setRestAuto(ra);
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

  const doExportBackup = async () => {
    if (backupBusy) return;
    setBackupBusy(true);
    try {
      const uri = await exportBackup();
      await shareBackupFile(uri);
      toast('Backup ready — save it somewhere safe');
    } catch {
      Alert.alert('Backup failed', 'Could not create the backup file. Please try again.');
    } finally {
      setBackupBusy(false);
    }
  };

  const doImportBackup = async () => {
    if (backupBusy) return;
    setBackupBusy(true);
    try {
      const backup = await pickBackupFile();
      if (!backup) return; // user cancelled the picker
      const count = Object.keys(backup.data).length;
      Alert.alert(
        'Restore backup?',
        `This replaces all current data with the backup (${count} items). This cannot be undone.`,
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Restore',
            style: 'destructive',
            onPress: async () => {
              try {
                await restoreBackup(backup);
                toast('Backup restored');
                await reload();
              } catch {
                Alert.alert('Restore failed', 'The backup file could not be restored.');
              }
            },
          },
        ]
      );
    } catch (error) {
      Alert.alert(
        'Invalid backup',
        error instanceof Error ? error.message : 'Could not read the backup file.'
      );
    } finally {
      setBackupBusy(false);
    }
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
    <SafeAreaView style={styles.screen} edges={['top']}>
    <ScrollView style={styles.scroll} contentContainerStyle={styles.content}>
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

      <FadeIn delay={0}>
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
      </FadeIn>

      <FadeIn delay={60}>
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
      </FadeIn>

      <FadeIn delay={90}>
      <View style={styles.card}>
        <View style={styles.aiCardTitleRow}>
          <Ionicons name="timer-outline" size={18} color={colors.primaryStrong} />
          <Text style={styles.cardLabel}>Rest Timer</Text>
        </View>
        <Text style={styles.hint}>Countdown between sets on the Workout tab.</Text>
        <View style={styles.presetRow}>
          {REST_PRESETS.map((secs) => (
            <TouchableOpacity
              key={secs}
              style={[styles.presetChip, restSecs === secs && styles.presetChipActive]}
              onPress={() => {
                void impactLight();
                setRestSecs(secs);
                void Storage.set('restTimerSecs', secs);
              }}
              activeOpacity={0.8}
            >
              <Text style={[styles.presetChipText, restSecs === secs && styles.presetChipTextActive]}>
                {secs}s
              </Text>
            </TouchableOpacity>
          ))}
        </View>
        <TouchableOpacity
          style={styles.toggleRow}
          onPress={() => {
            void impactLight();
            const next = !restAuto;
            setRestAuto(next);
            void Storage.set('restTimerAuto', next);
          }}
          activeOpacity={0.8}
        >
          <Text style={styles.toggleLabel}>Auto-start after each set</Text>
          <View style={[styles.toggle, restAuto && styles.toggleOn]}>
            <View style={[styles.toggleKnob, restAuto && styles.toggleKnobOn]} />
          </View>
        </TouchableOpacity>
      </View>
      </FadeIn>

      <FadeIn delay={100}>
      <View style={styles.card}>
        <View style={styles.aiCardTitleRow}>
          <Ionicons name="cloud-upload-outline" size={18} color={colors.primaryStrong} />
          <Text style={styles.cardLabel}>Backup & Restore</Text>
        </View>
        <Text style={styles.hint}>
          Sideloaded apps lose all data when reinstalled. Export a backup file and keep it somewhere safe.
        </Text>
        <View style={styles.backupRow}>
          <TouchableOpacity
            style={[styles.backupButton, backupBusy && styles.saveButtonDisabled]}
            onPress={() => void doExportBackup()}
            disabled={backupBusy}
            activeOpacity={0.8}
          >
            <Ionicons name="share-outline" size={16} color="#ffffff" />
            <Text style={styles.saveButtonText}>{backupBusy ? 'Working' : 'Export'}</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.backupButton, styles.backupButtonSecondary, backupBusy && styles.saveButtonDisabled]}
            onPress={() => void doImportBackup()}
            disabled={backupBusy}
            activeOpacity={0.8}
          >
            <Ionicons name="cloud-download-outline" size={16} color={colors.primaryStrong} />
            <Text style={styles.backupButtonTextSecondary}>{backupBusy ? 'Working' : 'Import'}</Text>
          </TouchableOpacity>
        </View>
      </View>
      </FadeIn>

      <FadeIn delay={120}>
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
      </FadeIn>
      <FadeIn delay={180}>
      <View style={styles.card}>
        <Ionicons name="trophy" size={20} color={colors.primaryStrong} />
        <Text style={styles.statValue}>{bestStreak}</Text>
        <Text style={styles.statLabel}>Best Streak</Text>
      </View>
      </FadeIn>

      <FadeIn delay={210}>
      <View style={styles.card}>
        <View style={styles.aiCardTitleRow}>
          <Ionicons name="medal-outline" size={18} color={colors.primaryStrong} />
          <Text style={styles.cardLabel}>Personal Records</Text>
        </View>
        {records.length === 0 ? (
          <Text style={styles.hint}>No records yet. Log workouts with weights and your best lifts will show up here.</Text>
        ) : (
          records.slice(0, 10).map((rec) => (
            <View key={rec.name} style={styles.recordRow}>
              <View style={styles.recordInfo}>
                <Text style={styles.recordName}>{rec.name}</Text>
                <Text style={styles.recordMeta}>
                  {rec.sessions} session{rec.sessions === 1 ? '' : 's'} · last {rec.lastDateLabel}
                </Text>
              </View>
              <Text style={styles.recordWeight}>
                {rec.bestWeight > 0 ? `${rec.bestWeight} kg` : '—'}
              </Text>
            </View>
          ))
        )}
      </View>
      </FadeIn>

      <FadeIn delay={240}>
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
      </FadeIn>

      <FadeIn delay={300}>
      <View style={styles.card}>
        <Text style={styles.creditsTitle}>GymSync</Text>
        <Text style={styles.credits}>Designed and built by p3xz</Text>
        <Text style={styles.credits}>Powered by React Native, Expo, and Gemini AI</Text>
        <Text style={styles.credits}>Ported from the GymSync web app</Text>
        <Text style={styles.credits}>All data stays on this device</Text>
        <Text style={styles.creditsSub}>Version {appJson.expo.version}</Text>
      </View>
      </FadeIn>
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
    marginTop: spacing.md,
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
  creditsTitle: {
    color: colors.text,
    fontSize: 18,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: spacing.xs,
  },
  credits: {
    color: colors.textSecondary,
    fontSize: 13,
    textAlign: 'center',
    marginBottom: 2,
  },
  creditsSub: {
    color: colors.textTertiary,
    fontSize: 12,
    textAlign: 'center',
    marginTop: 2,
  },
  presetRow: {
    flexDirection: 'row',
    gap: spacing.xs,
    marginBottom: spacing.sm,
  },
  presetChip: {
    borderColor: colors.borderStrong,
    borderWidth: 1,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  presetChipActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  presetChipText: {
    color: colors.textSecondary,
    fontSize: 15,
    fontWeight: '600',
  },
  presetChipTextActive: {
    color: '#ffffff',
  },
  toggleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing.xs,
  },
  toggleLabel: {
    color: colors.text,
    fontSize: 15,
  },
  toggle: {
    width: 48,
    height: 28,
    borderRadius: 14,
    backgroundColor: colors.elevated,
    borderColor: colors.borderStrong,
    borderWidth: 1,
    justifyContent: 'center',
    paddingHorizontal: 3,
  },
  toggleOn: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  toggleKnob: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: colors.textTertiary,
  },
  toggleKnobOn: {
    backgroundColor: '#ffffff',
    alignSelf: 'flex-end',
  },
  backupRow: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  backupButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    backgroundColor: colors.primary,
    borderRadius: radius.md,
    paddingVertical: spacing.sm,
  },
  backupButtonSecondary: {
    backgroundColor: 'transparent',
    borderColor: colors.borderStrong,
    borderWidth: 1,
  },
  backupButtonTextSecondary: {
    color: colors.primaryStrong,
    fontSize: 15,
    fontWeight: '600',
  },
  recordRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing.xs,
    borderTopColor: colors.border,
    borderTopWidth: 1,
  },
  recordInfo: {
    flex: 1,
    marginRight: spacing.sm,
  },
  recordName: {
    color: colors.text,
    fontSize: 15,
    fontWeight: '600',
  },
  recordMeta: {
    color: colors.textTertiary,
    fontSize: 12,
    marginTop: 2,
  },
  recordWeight: {
    color: colors.primaryStrong,
    fontSize: 16,
    fontWeight: '700',
    fontVariant: ['tabular-nums'],
  },
});
