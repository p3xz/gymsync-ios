// Gym gear recommendations. All purchase links are TODO — nothing here
// navigates anywhere real. When the affiliate program is set up, paste
// each product's affiliate URL into `url` below and the buttons go live.

import { useRouter } from 'expo-router';
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

interface GearItem {
  id: string;
  name: string;
  category: string;
  blurb: string;
  /** AFFILIATE TODO: paste the affiliate URL for this product here. Null = button stays a "coming soon" toast. */
  url: string | null;
}

const GEAR: GearItem[] = [
  {
    id: 'belt',
    name: 'Lifting Belt',
    category: 'Equipment',
    blurb: 'A sturdy lever belt keeps your core braced on heavy squats and deadlifts.',
    url: null,
  },
  {
    id: 'shoes',
    name: 'Weightlifting Shoes',
    category: 'Footwear',
    blurb: 'A raised, rigid heel fixes ankle mobility and keeps you stable under the bar.',
    url: null,
  },
  {
    id: 'wraps',
    name: 'Wrist Wraps',
    category: 'Accessories',
    blurb: 'Support for pressing days when the bar starts bending your wrists back.',
    url: null,
  },
  {
    id: 'straps',
    name: 'Lifting Straps',
    category: 'Accessories',
    blurb: 'Stop grip from being the reason your deadlift sets end early.',
    url: null,
  },
  {
    id: 'bands',
    name: 'Resistance Bands Set',
    category: 'Equipment',
    blurb: 'Warm-ups, pull-aparts, and assisted pull-ups at home or in the gym.',
    url: null,
  },
  {
    id: 'creatine',
    name: 'Creatine Monohydrate',
    category: 'Supplements',
    blurb: 'The most studied supplement in lifting. Plain monohydrate, no blends needed.',
    url: null,
  },
  {
    id: 'shaker',
    name: 'Shaker Bottle',
    category: 'Accessories',
    blurb: 'Leak-proof, mixes without clumps, survives daily gym-bag duty.',
    url: null,
  },
  {
    id: 'bag',
    name: 'Gym Duffel',
    category: 'Bags',
    blurb: 'One bag for belt, shoes, wraps, and straps with room to spare.',
    url: null,
  },
];

export default function Gear() {
  const router = useRouter();

  const onViewDeal = (item: GearItem) => {
    // AFFILIATE TODO: when item.url is set, open it with Linking.openURL(item.url).
    void item;
    toast('Affiliate links coming soon');
  };

  return (
    <SafeAreaView style={styles.screen} edges={['top']}>
      <ScrollView contentContainerStyle={styles.content}>
        <TouchableOpacity style={styles.backRow} onPress={() => router.back()} activeOpacity={0.7}>
          <Ionicons name="chevron-back" size={22} color={colors.primaryStrong} />
          <Text style={styles.backText}>Profile</Text>
        </TouchableOpacity>

        <Text style={styles.title}>Gym Gear</Text>
        <Text style={styles.meta}>Stuff worth buying, picked for lifters</Text>

        {GEAR.map((item) => (
          <View key={item.id} style={styles.card}>
            <View style={styles.gearTop}>
              <View style={styles.gearInfo}>
                <Text style={styles.gearCategory}>{item.category}</Text>
                <Text style={styles.gearName}>{item.name}</Text>
                <Text style={styles.gearBlurb}>{item.blurb}</Text>
              </View>
            </View>
            <TouchableOpacity
              style={styles.dealButton}
              onPress={() => onViewDeal(item)}
              activeOpacity={0.85}
            >
              <Ionicons name="cart-outline" size={16} color="#ffffff" />
              <Text style={styles.dealButtonText}>View deal</Text>
            </TouchableOpacity>
          </View>
        ))}
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
  gearTop: {
    marginBottom: spacing.sm,
  },
  gearInfo: {
    gap: 2,
  },
  gearCategory: {
    color: colors.primaryStrong,
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  gearName: {
    color: colors.text,
    fontSize: 18,
    fontWeight: '700',
  },
  gearBlurb: {
    color: colors.textSecondary,
    fontSize: 14,
    lineHeight: 20,
  },
  dealButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    backgroundColor: colors.primary,
    borderRadius: radius.md,
    padding: spacing.sm,
  },
  dealButtonText: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '700',
  },
});
