// Rest timer overlay: countdown between sets with presets, +/- 15s
// adjust, and skip. Vibrates and toasts when the rest is over.

import { useEffect, useState } from 'react';
import { Modal, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, radius, spacing } from '../lib/theme';
import { impactLight, notifySuccess } from '../lib/haptics';
import { toast } from '../lib/toast';

export const REST_PRESETS = [30, 60, 90, 120];

export function formatCountdown(totalSecs: number): string {
  const m = Math.floor(totalSecs / 60);
  const s = totalSecs % 60;
  return `${m}:${String(s).padStart(2, '0')}`;
}

export default function RestTimer({
  visible,
  initialSecs,
  onClose,
}: {
  visible: boolean;
  initialSecs: number;
  onClose: () => void;
}) {
  const [remaining, setRemaining] = useState(initialSecs);

  // Fresh countdown every time the overlay opens.
  useEffect(() => {
    if (!visible) return;
    setRemaining(initialSecs);
    const id = setInterval(() => {
      setRemaining((prev) => Math.max(0, prev - 1));
    }, 1000);
    return () => clearInterval(id);
  }, [visible, initialSecs]);

  // Time's up: vibrate, announce, dismiss.
  useEffect(() => {
    if (visible && remaining === 0) {
      void notifySuccess();
      toast('Rest over — hit your next set');
      onClose();
    }
  }, [visible, remaining, onClose]);

  const adjust = (delta: number) => {
    void impactLight();
    setRemaining((prev) => Math.max(5, Math.min(600, prev + delta)));
  };

  const skip = () => {
    void impactLight();
    onClose();
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={skip}>
      <View style={styles.backdrop}>
        <View style={styles.card}>
          <Text style={styles.label}>Rest Timer</Text>
          <Text style={styles.countdown}>{formatCountdown(remaining)}</Text>

          <View style={styles.presets}>
            {REST_PRESETS.map((secs) => (
              <TouchableOpacity
                key={secs}
                style={[styles.preset, remaining === secs && styles.presetActive]}
                onPress={() => {
                  void impactLight();
                  setRemaining(secs);
                }}
                activeOpacity={0.8}
              >
                <Text style={[styles.presetText, remaining === secs && styles.presetTextActive]}>
                  {secs}s
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          <View style={styles.adjustRow}>
            <TouchableOpacity style={styles.adjustButton} onPress={() => adjust(-15)} activeOpacity={0.8}>
              <Ionicons name="remove" size={20} color={colors.text} />
              <Text style={styles.adjustText}>15s</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.adjustButton} onPress={() => adjust(15)} activeOpacity={0.8}>
              <Ionicons name="add" size={20} color={colors.text} />
              <Text style={styles.adjustText}>15s</Text>
            </TouchableOpacity>
          </View>

          <TouchableOpacity style={styles.skipButton} onPress={skip} activeOpacity={0.85}>
            <Text style={styles.skipText}>Skip Rest</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.75)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.lg,
  },
  card: {
    backgroundColor: colors.elevated,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: radius.lg,
    padding: spacing.lg,
    width: '100%',
    alignItems: 'center',
  },
  label: {
    color: colors.textSecondary,
    fontSize: 13,
    letterSpacing: 1,
  },
  countdown: {
    color: colors.text,
    fontSize: 64,
    fontWeight: '700',
    fontVariant: ['tabular-nums'],
    marginVertical: spacing.sm,
  },
  presets: {
    flexDirection: 'row',
    gap: spacing.xs,
    marginBottom: spacing.md,
  },
  preset: {
    borderColor: colors.borderStrong,
    borderWidth: 1,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  presetActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  presetText: {
    color: colors.textSecondary,
    fontSize: 15,
    fontWeight: '600',
  },
  presetTextActive: {
    color: '#ffffff',
  },
  adjustRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  adjustButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: colors.card,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  adjustText: {
    color: colors.text,
    fontSize: 14,
    fontWeight: '600',
  },
  skipButton: {
    backgroundColor: colors.primary,
    borderRadius: radius.md,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.xl,
    width: '100%',
    alignItems: 'center',
  },
  skipText: {
    color: '#ffffff',
    fontSize: 17,
    fontWeight: '600',
  },
});
