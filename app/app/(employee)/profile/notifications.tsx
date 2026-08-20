import React, { useEffect, useState } from 'react';
import { View, Text, ScrollView, StyleSheet } from 'react-native';
import { Switch } from 'react-native';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { theme } from '../../../src/components';
import { apiRequest } from '../../../src/api/client';

interface Profile {
  notification_prefs: Record<string, boolean>;
}

/** FR-023: notification preferences, one toggle per FR-022 event type. */
const EVENT_TYPES: Array<{ key: string; label: string }> = [
  { key: 'shift_assigned', label: 'Shift assigned' },
  { key: 'shift_changed', label: 'Shift changed' },
  { key: 'swap_decided', label: 'Swap approved or denied' },
  { key: 'time_off_decided', label: 'Time off approved or denied' },
  { key: 'shift_reminder', label: 'Upcoming shift reminders' },
];

export default function NotificationPreferencesScreen(): React.JSX.Element {
  const queryClient = useQueryClient();
  const { data: profile } = useQuery({ queryKey: ['profile', 'mine'], queryFn: () => apiRequest<Profile>('/profile') });
  const [prefs, setPrefs] = useState<Record<string, boolean>>({});

  useEffect(() => {
    if (profile) setPrefs(profile.notification_prefs ?? {});
  }, [profile]);

  const saveMutation = useMutation({
    mutationFn: (next: Record<string, boolean>) => apiRequest<Profile>('/profile', { method: 'PATCH', body: { notificationPrefs: next } }),
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: ['profile', 'mine'] }),
  });

  function toggle(key: string, value: boolean): void {
    const next = { ...prefs, [key]: value };
    setPrefs(next);
    saveMutation.mutate(next);
  }

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.title}>Notifications</Text>
      {EVENT_TYPES.map(({ key, label }) => (
        <View key={key} style={styles.row}>
          <Text style={styles.label}>{label}</Text>
          <Switch value={prefs[key] ?? true} onValueChange={(value) => toggle(key, value)} accessibilityLabel={label} />
        </View>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { padding: theme.spacing.lg, backgroundColor: theme.colors.background },
  title: { ...theme.typography.title, color: theme.colors.textPrimary, marginBottom: theme.spacing.md },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    minHeight: theme.minTapTarget,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  label: {
    ...theme.typography.body,
    color: theme.colors.textPrimary,
  },
});
