// Upgrade screen: what Pro unlocks and where payments will hook in.
// No real checkout yet — the button is honest about that.

import { useRouter } from 'expo-router';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors, radius, spacing } from '../lib/theme';
import { toast } from '../lib/toast';
import { PRO_FEATURES } from '../lib/pro';

export default function Upgrade() {
  const router = useRouter();

  const onUpgrade = () => {
    // PAYMENTS TODO: replace with the real Razorpay/UPI checkout flow.
    // On verified payment success: await setPro(true); router.back();
    toast('Payments coming soon — UPI checkout is being set up');
  };

  return (
    <SafeAreaView style={styles.screen} edges={['top']}>
      <ScrollView contentContainerStyle={styles.content}>
        <TouchableOpacity style={styles.backRow} onPress={() => router.back()} activeOpacity={0.7}>
          <Ionicons name="chevron-back" size={22} color={colors.primaryStrong} />
          <Text style={styles.backText}>Back</Text>
        </TouchableOpacity>

        <View style={styles.hero}>
          <Ionicons name="star" size={40} color={colors.warning} />
          <Text style={styles.title}>GymSync Pro</Text>
          <Text style={styles.meta}>One-time unlock. Yours forever.</Text>
        </View>

        <View style={styles.card}>
          {PRO_FEATURES.map((feature) => (
            <View key={feature} style={styles.featureRow}>
              <Ionicons name="checkmark-circle" size={20} color={colors.primaryStrong} />
              <Text style={styles.featureText}>{feature}</Text>
            </View>
          ))}
        </View>

        <TouchableOpacity style={styles.upgradeButton} onPress={onUpgrade} activeOpacity={0.85}>
          <Text style={styles.upgradeButtonText}>Upgrade to Pro</Text>
        </TouchableOpacity>
        <Text style={styles.finePrint}>
          Secure UPI payments via Razorpay are being integrated. The free app stays free forever.
        </Text>
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
  hero: {
    alignItems: 'center',
    marginTop: spacing.md,
    gap: spacing.xs,
  },
  title: {
    color: colors.text,
    fontSize: 32,
    fontWeight: '700',
  },
  meta: {
    color: colors.textSecondary,
    fontSize: 15,
  },
  card: {
    backgroundColor: colors.card,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: radius.lg,
    padding: spacing.md,
    gap: spacing.sm,
  },
  featureRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  featureText: {
    color: colors.text,
    fontSize: 15,
    flex: 1,
  },
  upgradeButton: {
    backgroundColor: colors.primary,
    borderRadius: radius.md,
    padding: spacing.md,
    alignItems: 'center',
    marginTop: spacing.sm,
  },
  upgradeButtonText: {
    color: '#ffffff',
    fontSize: 17,
    fontWeight: '700',
  },
  finePrint: {
    color: colors.textTertiary,
    fontSize: 13,
    textAlign: 'center',
  },
});
