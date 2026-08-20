import React from 'react';
import { Redirect } from 'expo-router';
import { useSessionStore } from '../src/stores/session.store';

/**
 * The root path ("/") has no screen of its own — every real destination lives under
 * (auth)/(employee)/(manager). Without a route matching "/" itself, expo-router renders its
 * built-in Unmatched screen instead of ever reaching RootLayout's redirect effect, so this
 * declarative Redirect is what actually resolves the initial landing.
 */
export default function Index(): React.JSX.Element | null {
  const { accessToken, role, hydrated } = useSessionStore();

  if (!hydrated) return null;

  if (!accessToken) {
    return <Redirect href="/(auth)/login" />;
  }

  return <Redirect href={role === 'manager' ? '/(manager)/dashboard' : '/(employee)/schedule'} />;
}
