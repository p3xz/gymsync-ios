// Profile tab: edit the user name, lifetime stats, and the danger zone
// (reset all data, with confirmation, dropping back to onboarding).

import { useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Linking,
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
import { getWeeklyGoal, setWeeklyGoal } from '../../lib/weeklyGoal';
import { isPro, setPro } from '../../lib/pro';
import { useRouter } from 'expo-router';
import { colors, radius, spacing } from '../../lib/theme';
import type { HistoryEntry } from '../../lib/workout';

const SOCIAL_LINKS = [
  { label: 'GitHub', url: 'https://github.com/p3xz', icon: 'logo-github' as const },
  { label: 'LinkedIn', url: 'https://linkedin.com/in/namish-yadav-639769408', icon: 'logo-linkedin' as const },
  { label: 'Instagram', url: 'https://instagram.com/nam7sh', icon: 'logo-instagram' as const },
  { label: 'Portfolio', url: 'https://namishhh.vercel.app', icon: 'globe-outline' as const },
];

const openLink = (url: string) => {
  void impactLight();
  Linking.openURL(url).catch(() => toast('Could not open link'));
};

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
  const [weeklyGoal, setWeeklyGoalState] = useState(4);
  const [pro, setProState] = useState(false);
  const router = useRouter();
  const [initialLoading, setInitialLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);

  const reload = useCallback(async () => {
    try {
      const [h, s, b, key, rs, ra, wg, p] = await Promise.all([
        Storage.get<HistoryEntry[]>('workoutHistory', []),
        Storage.get<number>('streak', 0),
        Storage.get<number>('bestStreak', 0),
        getGeminiKey(),
        Storage.get<number>('restTimerSecs', 60),
        Storage.get<boolean>('restTimerAuto', true),
        getWeeklyGoal(),
        isPro(),
      ]);
      setTotalWorkouts(h.length);
      setStreak(s);
      setBestStreak(b);
      setRecords(computeRecords(h));
      setHasKey(key.length > 0);
      if (!key) setApiKey('');
      setRestSecs(rs);
      setRestAuto(ra);
      setWeeklyGoalState(wg);
      setProState(p);
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

  const doImportBackup = async () => {    if (backupBusy) return;
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

  const changeWeeklyGoal = (delta: number) => {
    void impactLight();
    const next = Math.min(7, Math.max(1, weeklyGoal + delta));
    setWeeklyGoalState(next);
    void setWeeklyGoal(next);
  };

  const togglePro = () => {
    void impactLight();
    const next = !pro;
    setProState(next);
    void setPro(next);
    toast(next ? 'Pro enabled (preview)' : 'Pro disabled');
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
        {pro ? (
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
        ) : (
          <TouchableOpacity
            style={styles.proPrompt}
            onPress={() => router.push('/upgrade')}
            activeOpacity={0.8}
          >
            <Ionicons name="lock-closed-outline" size={16} color={colors.warning} />
            <Text style={styles.proPromptText}>Backup & restore is a Pro feature. See plans.</Text>
          </TouchableOpacity>
        )}
      </View>
      </FadeIn>

      <FadeIn delay={105}>
      <View style={styles.card}>
        <View style={styles.aiCardTitleRow}>
          <Ionicons name="star" size={18} color={colors.warning} />
          <Text style={styles.cardLabel}>GymSync Pro</Text>
        </View>
        <Text style={styles.hint}>
          {pro
            ? 'Pro is active. AI Coach, progress charts, and backup are unlocked.'
            : 'Unlock the AI Coach, progress charts, and backup & restore.'}
        </Text>
        <View style={styles.proRow}>
          <TouchableOpacity
            style={styles.proButton}
            onPress={() => router.push('/upgrade')}
            activeOpacity={0.8}
          >
            <Text style={styles.saveButtonText}>See Pro</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.toggleRowCompact}
            onPress={togglePro}
            activeOpacity={0.8}
            accessibilityLabel="Toggle Pro preview"
          >
            <Text style={styles.toggleLabel}>Preview: {pro ? 'On' : 'Off'}</Text>
            <View style={[styles.toggle, pro && styles.toggleOn]}>
              <View style={[styles.toggleKnob, pro && styles.toggleKnobOn]} />
            </View>
          </TouchableOpacity>
        </View>
      </View>
      </FadeIn>

      <FadeIn delay={110}>
      <View style={styles.card}>
        <View style={styles.aiCardTitleRow}>
          <Ionicons name="flag-outline" size={18} color={colors.primaryStrong} />
          <Text style={styles.cardLabel}>Weekly Goal</Text>
        </View>
        <Text style={styles.hint}>
          Target sessions per week. Fall behind and you'll get a nudge on Sunday.
        </Text>
        <View style={styles.goalStepper}>
          <TouchableOpacity
            style={styles.stepperButton}
            onPress={() => changeWeeklyGoal(-1)}
            activeOpacity={0.8}
            accessibilityLabel="Decrease weekly goal"
          >
            <Ionicons name="remove" size={20} color={colors.text} />
          </TouchableOpacity>
          <Text style={styles.goalValue}>{weeklyGoal}</Text>
          <TouchableOpacity
            style={styles.stepperButton}
            onPress={() => changeWeeklyGoal(1)}
            activeOpacity={0.8}
            accessibilityLabel="Increase weekly goal"
          >
            <Ionicons name="add" size={20} color={colors.text} />
          </TouchableOpacity>
        </View>
      </View>
      </FadeIn>

      <FadeIn delay={115}>
      <View style={styles.card}>
        <TouchableOpacity
          style={styles.linkRow}
          onPress={() => router.push('/gear')}
          activeOpacity={0.7}
        >
          <Ionicons name="bag-handle-outline" size={20} color={colors.primaryStrong} />
          <Text style={styles.linkText}>Gym Gear</Text>
          <Ionicons name="chevron-forward" size={18} color={colors.textTertiary} />
        </TouchableOpacity>
        <View style={styles.linkDivider} />
        <TouchableOpacity
          style={styles.linkRow}
          onPress={() => router.push('/form-check')}
          activeOpacity={0.7}
        >
          <Ionicons name="videocam-outline" size={20} color={colors.primaryStrong} />
          <Text style={styles.linkText}>Form Check</Text>
          <Ionicons name="chevron-forward" size={18} color={colors.textTertiary} />
        </TouchableOpacity>
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

      <FadeIn delay={270}>
      <View style={styles.card}>
        <View style={styles.aiCardTitleRow}>
          <Ionicons name="shield-checkmark-outline" size={18} color={colors.primaryStrong} />
          <Text style={styles.cardLabel}>Privacy Policy</Text>
        </View>
        <Text style={styles.privacyText}>
          GymSync keeps everything on this device. Your workouts, routines, streaks, and
          name are stored in local device storage and are never uploaded anywhere.
        </Text>
        <Text style={styles.privacyText}>
          If you add a Gemini API key, it stays on this device. Routine and workout data
          is sent to the Google Gemini API only when you tap the AI button. Backup files
          you export are yours; they leave the app only when you share them yourself.
        </Text>
        <Text style={styles.privacyText}>
          No accounts, no tracking, no analytics, no cookies.
        </Text>
      </View>
      </FadeIn>

      <FadeIn delay={300}>
      <View style={styles.card}>
        <Text style={styles.creditsTitle}>GymSync</Text>
        <Text style={styles.credits}>Made by Namish</Text>
        <Text style={styles.credits}>Powered by React Native, Expo, and Gemini AI</Text>
        <Text style={styles.credits}>Ported from the GymSync web app</Text>
        <Text style={styles.credits}>All data stays on this device</Text>
        <View style={styles.socialGrid}>
          {SOCIAL_LINKS.map((link) => (
            <TouchableOpacity
              key={link.label}
              style={styles.socialButton}
              onPress={() => openLink(link.url)}
              activeOpacity={0.8}
            >
              <Ionicons name={link.icon} size={16} color={colors.primaryStrong} />
              <Text style={styles.socialButtonText}>{link.label}</Text>
            </TouchableOpacity>
          ))}
        </View>
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
  privacyText: {
    color: colors.textSecondary,
    fontSize: 13,
    lineHeight: 19,
    marginBottom: spacing.sm,
  },
  socialGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    justifyContent: 'center',
    marginTop: spacing.sm,
    marginBottom: spacing.sm,
  },
  socialButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    backgroundColor: colors.elevated,
    borderColor: colors.borderStrong,
    borderWidth: 1,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  socialButtonText: {
    color: colors.text,
    fontSize: 14,
    fontWeight: '600',
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
  linkRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.xs,
  },
  linkText: {
    color: colors.text,
    fontSize: 15,
    fontWeight: '600',
    flex: 1,
  },
  linkDivider: {
    height: 1,
    backgroundColor: colors.border,
    marginVertical: spacing.xs,
  },
  backupButtonTextSecondary: {
    color: colors.primaryStrong,
    fontSize: 15,
    fontWeight: '600',
  },
  proPrompt: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    backgroundColor: colors.elevated,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: radius.md,
    padding: spacing.sm,
  },
  proPromptText: {
    color: colors.textSecondary,
    fontSize: 14,
    flex: 1,
  },
  proRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
  proButton: {
    backgroundColor: colors.primary,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  toggleRowCompact: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  goalStepper: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.md,
  },
  stepperButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.elevated,
    borderColor: colors.borderStrong,
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  goalValue: {
    color: colors.text,
    fontSize: 32,
    fontWeight: '700',
    fontVariant: ['tabular-nums'],
    minWidth: 48,
    textAlign: 'center',
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
