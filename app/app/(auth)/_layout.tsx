import React from 'react';
import { Stack } from 'expo-router';

/**
 * The unauthenticated route group. This file tree contains sign-in and password-reset only —
 * there is no sign-up screen here or anywhere else in the app (constitution non-negotiable:
 * closed account creation; FR-002).
 */
export default function AuthLayout(): React.JSX.Element {
  return <Stack screenOptions={{ headerShown: false }} />;
}
