import React from 'react';
import { Redirect, Stack } from 'expo-router';
import { useSessionStore } from '../../src/stores/session.store';

/**
 * Manager route group guard: a signed-in employee is bounced straight back out, even if they
 * somehow navigate here directly, rather than relying only on this tree not being linked to
 * from employee screens (constitution: Security First — the UI-level gate is a convenience;
 * every underlying API call is independently authorized server-side regardless of what this
 * guard does).
 */
export default function ManagerLayout(): React.JSX.Element {
  const role = useSessionStore((state) => state.role);
  if (role !== 'manager') {
    return <Redirect href="/(employee)/schedule" />;
  }
  return <Stack screenOptions={{ headerShown: false }} />;
}
