import React, { useEffect, useState } from 'react';
import { Text, ScrollView, StyleSheet } from 'react-native';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { theme, Button, TextField } from '../../../src/components';
import { apiRequest } from '../../../src/api/client';
import { useSessionStore } from '../../../src/stores/session.store';

interface Profile {
  id: string;
  name: string;
  phone: string | null;
  notification_prefs: Record<string, boolean>;
}

/**
 * FR-023: shared by both employee and manager route groups (mirrored at
 * app/(manager)/profile — kept as one implementation referenced from both trees, since the
 * screen's content and API are identical regardless of role).
 */
export default function ProfileScreen(): React.JSX.Element {
  const queryClient = useQueryClient();
  const clearSession = useSessionStore((state) => state.clearSession);
  const { data: profile } = useQuery({ queryKey: ['profile', 'mine'], queryFn: () => apiRequest<Profile>('/profile') });
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');

  useEffect(() => {
    if (profile) {
      setName(profile.name);
      setPhone(profile.phone ?? '');
    }
  }, [profile]);

  const saveMutation = useMutation({
    mutationFn: () => apiRequest<Profile>('/profile', { method: 'PATCH', body: { name, phone } }),
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: ['profile', 'mine'] }),
  });

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.title}>Profile</Text>

      <TextField label="Name" value={name} onChangeText={setName} />
      <TextField label="Phone" keyboardType="phone-pad" value={phone} onChangeText={setPhone} />

      <Button label={saveMutation.isPending ? 'Saving…' : 'Save'} onPress={() => saveMutation.mutate()} disabled={saveMutation.isPending} />

      <Button label="Sign out" variant="secondary" onPress={clearSession} style={styles.signOut} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { padding: theme.spacing.lg, backgroundColor: theme.colors.background },
  title: { ...theme.typography.title, color: theme.colors.textPrimary, marginBottom: theme.spacing.md },
  signOut: { marginTop: theme.spacing.lg },
});
