// First-launch screen: captures the user's name once, then never shows again.
// Mirrors the web app's onboarding card (name input, Continue enabled only
// once there is real, trimmed input).

import { useState } from 'react';
import { KeyboardAvoidingView, Platform, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { useApp } from './_layout';
import { colors, radius, spacing } from '../lib/theme';

export default function Onboarding() {
  const { completeOnboarding } = useApp();
  const [name, setName] = useState('');
  const canContinue = name.trim().length > 0;

  const onContinue = () => {
    if (canContinue) void completeOnboarding(name.trim());
  };

  return (
    <KeyboardAvoidingView
      style={styles.screen}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <View style={styles.card}>
        <Text style={styles.title}>Welcome to GymSync</Text>
        <Text style={styles.subtitle}>Let us get your profile set up. What should we call you?</Text>

        <Text style={styles.label}>Your name</Text>
        <TextInput
          style={styles.input}
          value={name}
          onChangeText={setName}
          placeholder="e.g. Alex"
          placeholderTextColor={colors.textTertiary}
          maxLength={30}
          autoFocus
          autoCorrect={false}
          returnKeyType="done"
          onSubmitEditing={onContinue}
        />

        <TouchableOpacity
          style={[styles.button, !canContinue && styles.buttonDisabled]}
          onPress={onContinue}
          disabled={!canContinue}
          activeOpacity={0.8}
        >
          <Text style={[styles.buttonText, !canContinue && styles.buttonTextDisabled]}>Continue</Text>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.background,
    justifyContent: 'center',
    padding: spacing.lg,
  },
  card: {
    backgroundColor: colors.card,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: radius.lg,
    padding: spacing.lg,
  },
  title: {
    color: colors.text,
    fontSize: 26,
    fontWeight: '700',
    marginBottom: spacing.xs,
  },
  subtitle: {
    color: colors.textSecondary,
    fontSize: 15,
    marginBottom: spacing.lg,
  },
  label: {
    color: colors.textSecondary,
    fontSize: 13,
    marginBottom: spacing.xs,
  },
  input: {
    backgroundColor: colors.elevated,
    borderColor: colors.borderStrong,
    borderWidth: 1,
    borderRadius: radius.md,
    color: colors.text,
    fontSize: 17,
    padding: spacing.md,
    marginBottom: spacing.lg,
  },
  button: {
    backgroundColor: colors.primary,
    borderRadius: radius.md,
    padding: spacing.md,
    alignItems: 'center',
  },
  buttonDisabled: {
    backgroundColor: colors.card,
    borderColor: colors.border,
    borderWidth: 1,
  },
  buttonText: {
    color: '#ffffff',
    fontSize: 17,
    fontWeight: '600',
  },
  buttonTextDisabled: {
    color: colors.textTertiary,
  },
});
