import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Redirect, Stack } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useSessionStore } from '../../src/stores/session.store';
import { TabBar, theme } from '../../src/components';

/**
 * Manager route group guard: a signed-in employee is bounced straight back out, even if they
 * somehow navigate here directly, rather than relying only on this tree not being linked to
 * from employee screens (constitution: Security First — the UI-level gate is a convenience;
 * every underlying API call is independently authorized server-side regardless of what this
 * guard does).
 *
 * The tab bar is a flex sibling below the Stack, not an absolute overlay on top of it — that
 * way it occupies real layout space and pushes every screen's content up above it for free,
 * instead of each screen needing its own bottom padding to avoid being hidden underneath. The
 * Stack gets only the top safe-area edge; the bottom edge is left to TabBar itself (see its
 * own use of useSafeAreaInsets), since padding it here too would double the home-indicator inset.
 */
export default function ManagerLayout(): React.JSX.Element {
  const role = useSessionStore((state) => state.role);
  if (role !== 'manager') {
    return <Redirect href="/(employee)/schedule" />;
  }
  return (
    <View style={styles.container}>
      <SafeAreaView style={styles.stackArea} edges={['top']}>
        <Stack screenOptions={{ headerShown: false }} />
      </SafeAreaView>
      <TabBar role="manager" />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.background },
  stackArea: { flex: 1 },
});
