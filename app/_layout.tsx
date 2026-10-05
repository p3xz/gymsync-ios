// Root layout: decides between first-launch onboarding and the tabbed app,
// and shares the user name + a full-reset action with every screen.

import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react';
import { ActivityIndicator, View } from 'react-native';
import { Storage } from '../lib/storage';
import { colors } from '../lib/theme';

interface AppContextValue {
  /** Saved user name, or null while onboarding is still pending. */
  name: string | null;
  /** Re-read the name from storage (used after the profile screen edits it). */
  refreshName: () => Promise<void>;
  /** Persist the name chosen during onboarding. */
  completeOnboarding: (name: string) => Promise<void>;
  /** Wipe all GymSync data and drop back to onboarding. */
  resetApp: () => Promise<void>;
}

const AppContext = createContext<AppContextValue | null>(null);

export function useApp(): AppContextValue {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp must be used inside the root layout');
  return ctx;
}

export default function RootLayout() {
  const [name, setName] = useState<string | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    Storage.get<string | null>('userName', null).then((saved) => {
      setName(saved);
      setReady(true);
    });
  }, []);

  const refreshName = useCallback(async () => {
    setName(await Storage.get<string | null>('userName', null));
  }, []);

  const completeOnboarding = useCallback(async (newName: string) => {
    await Storage.set('userName', newName);
    setName(newName);
  }, []);

  const resetApp = useCallback(async () => {
    await Storage.clearAll();
    setName(null);
  }, []);

  if (!ready) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.background, justifyContent: 'center', alignItems: 'center' }}>
        <StatusBar style="light" />
        <ActivityIndicator color={colors.primaryStrong} />
      </View>
    );
  }

  return (
    <AppContext.Provider value={{ name, refreshName, completeOnboarding, resetApp }}>
      <StatusBar style="light" />
      <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.background } }}>
        {name === null ? (
          <Stack.Screen name="onboarding" />
        ) : (
          <>
            <Stack.Screen name="(tabs)" />
            <Stack.Screen name="plate-calculator" />
          </>
        )}
      </Stack>
    </AppContext.Provider>
  );
}
