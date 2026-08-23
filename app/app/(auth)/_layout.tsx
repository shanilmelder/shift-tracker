import React from 'react';
import { Stack } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';

/**
 * The pre-app route group: sign-in, and the forced password change that follows signing in
 * with a manager-issued temporary password. The latter is technically authenticated but has no
 * business showing the tab bar, so it lives here rather than under a role group.
 *
 * There is no sign-up screen here or anywhere else in the app (constitution non-negotiable:
 * closed account creation; FR-002), and no password-reset screen — recovery is manager-issued.
 */
export default function AuthLayout(): React.JSX.Element {
  return (
    <SafeAreaView style={{ flex: 1 }} edges={['top', 'bottom']}>
      <Stack screenOptions={{ headerShown: false }} />
    </SafeAreaView>
  );
}
