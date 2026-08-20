import React from 'react';
import { Redirect, Stack } from 'expo-router';
import { useSessionStore } from '../../src/stores/session.store';

/** Employee route group guard — mirrors (manager)/_layout.tsx's rationale. */
export default function EmployeeLayout(): React.JSX.Element {
  const role = useSessionStore((state) => state.role);
  if (role !== 'employee') {
    return <Redirect href="/(manager)/dashboard" />;
  }
  return <Stack screenOptions={{ headerShown: false }} />;
}
