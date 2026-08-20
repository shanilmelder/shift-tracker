import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Redirect, Stack } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useSessionStore } from '../../src/stores/session.store';
import { TabBar, theme } from '../../src/components';

/**
 * Employee route group guard — mirrors (manager)/_layout.tsx's rationale, tab bar included.
 * The Stack gets only the top safe-area edge; the bottom edge is deliberately left to TabBar
 * itself (see its own use of useSafeAreaInsets), since padding it here too would double the
 * home-indicator inset.
 */
export default function EmployeeLayout(): React.JSX.Element {
  const role = useSessionStore((state) => state.role);
  if (role !== 'employee') {
    return <Redirect href="/(manager)/dashboard" />;
  }
  return (
    <View style={styles.container}>
      <SafeAreaView style={styles.stackArea} edges={['top']}>
        <Stack screenOptions={{ headerShown: false }} />
      </SafeAreaView>
      <TabBar role="employee" />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.background },
  stackArea: { flex: 1 },
});
