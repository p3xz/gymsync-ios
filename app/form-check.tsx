// Form check: record or pick a lift video and submit it for review.
// The review backend does not exist yet, so submission is an honest stub.

import { useRouter } from 'expo-router';
import { useState } from 'react';
import {
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import * as DocumentPicker from 'expo-document-picker';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors, radius, spacing } from '../lib/theme';
import { toast } from '../lib/toast';

const LIFTS = ['Squat', 'Bench Press', 'Deadlift', 'Overhead Press', 'Row'];

export default function FormCheck() {
  const router = useRouter();
  const [lift, setLift] = useState(LIFTS[0]);
  const [fileName, setFileName] = useState<string | null>(null);
  const [picking, setPicking] = useState(false);

  const pickVideo = async () => {
    if (picking) return;
    setPicking(true);
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: 'video/*',
        copyToCacheDirectory: true,
      });
      if (!result.canceled && result.assets.length > 0) {
        setFileName(result.assets[0].name ?? 'Selected video');
      }
    } catch {
      toast('Could not open the video picker');
    } finally {
      setPicking(false);
    }
  };

  const submit = () => {
    if (!fileName) {
      toast('Pick a lift video first');
      return;
    }
    // BACKEND TODO: upload the video to the coaching review API, then
    // return feedback with timestamps. Until then, no fake submission.
    toast('Form check reviews coming soon');
  };

  return (
    <SafeAreaView style={styles.screen} edges={['top']}>
      <ScrollView contentContainerStyle={styles.content}>
        <TouchableOpacity style={styles.backRow} onPress={() => router.back()} activeOpacity={0.7}>
          <Ionicons name="chevron-back" size={22} color={colors.primaryStrong} />
          <Text style={styles.backText}>Profile</Text>
        </TouchableOpacity>

        <Text style={styles.title}>Form Check</Text>
        <Text style={styles.meta}>Get your lift reviewed by a coach</Text>

        <View style={styles.card}>
          <Text style={styles.cardLabel}>Which lift?</Text>
          <View style={styles.liftRow}>
            {LIFTS.map((name) => (
              <TouchableOpacity
                key={name}
                style={[styles.liftChip, lift === name && styles.liftChipActive]}
                onPress={() => setLift(name)}
                activeOpacity={0.8}
              >
                <Text style={[styles.liftChipText, lift === name && styles.liftChipTextActive]}>
                  {name}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        <View style={styles.card}>
          <Text style={styles.cardLabel}>Your video</Text>
          <TouchableOpacity
            style={styles.pickBox}
            onPress={() => void pickVideo()}
            activeOpacity={0.8}
          >
            <Ionicons name="videocam-outline" size={28} color={colors.primaryStrong} />
            <Text style={styles.pickText}>
              {fileName ?? (picking ? 'Opening picker' : 'Pick a lift video')}
            </Text>
          </TouchableOpacity>
          <Text style={styles.hint}>
            Film from the side, one full set, good lighting. Reviews are done by a real coach.
          </Text>
        </View>

        <TouchableOpacity style={styles.submitButton} onPress={submit} activeOpacity={0.85}>
          <Text style={styles.submitButtonText}>Submit for review</Text>
        </TouchableOpacity>
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
    gap: spacing.sm,
  },
  cardLabel: {
    color: colors.text,
    fontSize: 15,
    fontWeight: '700',
  },
  liftRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  liftChip: {
    borderColor: colors.borderStrong,
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: spacing.sm,
    paddingVertical: 6,
  },
  liftChipActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  liftChipText: {
    color: colors.textSecondary,
    fontSize: 13,
    fontWeight: '600',
  },
  liftChipTextActive: {
    color: '#ffffff',
  },
  pickBox: {
    borderColor: colors.borderStrong,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderRadius: radius.md,
    padding: spacing.lg,
    alignItems: 'center',
    gap: spacing.xs,
  },
  pickText: {
    color: colors.textSecondary,
    fontSize: 14,
    textAlign: 'center',
  },
  hint: {
    color: colors.textTertiary,
    fontSize: 13,
    lineHeight: 18,
  },
  submitButton: {
    backgroundColor: colors.primary,
    borderRadius: radius.md,
    padding: spacing.md,
    alignItems: 'center',
  },
  submitButtonText: {
    color: '#ffffff',
    fontSize: 17,
    fontWeight: '700',
  },
});
