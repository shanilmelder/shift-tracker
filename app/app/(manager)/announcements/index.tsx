import React, { useState } from 'react';
import { View, Text, ScrollView, StyleSheet } from 'react-native';
import { useMutation } from '@tanstack/react-query';
import { theme, Button, TextField } from '../../../src/components';
import { apiRequest } from '../../../src/api/client';

type TargetScope = 'team' | 'location' | 'shift';

/** FR-035: broadcast to a team, a location, or a specific shift's staff. */
export default function AnnouncementsScreen(): React.JSX.Element {
  const [scope, setScope] = useState<TargetScope>('team');
  const [shiftId, setShiftId] = useState('');
  const [message, setMessage] = useState('');
  const [sent, setSent] = useState(false);

  const sendMutation = useMutation({
    mutationFn: () =>
      apiRequest('/announcements', {
        method: 'POST',
        body: { targetScope: scope, targetShiftId: scope === 'shift' ? shiftId : undefined, message },
      }),
    onSuccess: () => {
      setSent(true);
      setMessage('');
    },
  });

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.title}>Send announcement</Text>

      <View style={styles.scopeRow}>
        {(['team', 'location', 'shift'] as TargetScope[]).map((s) => (
          <Button key={s} label={s} variant={scope === s ? 'primary' : 'secondary'} onPress={() => setScope(s)} style={styles.scopeButton} />
        ))}
      </View>

      {scope === 'shift' ? <TextField label="Shift ID" value={shiftId} onChangeText={setShiftId} /> : null}

      <TextField label="Message" value={message} onChangeText={setMessage} multiline />

      {sent ? <Text style={styles.sent}>Sent.</Text> : null}

      <Button
        label={sendMutation.isPending ? 'Sending…' : 'Send'}
        onPress={() => {
          setSent(false);
          sendMutation.mutate();
        }}
        disabled={sendMutation.isPending || !message.trim() || (scope === 'shift' && !shiftId.trim())}
      />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { padding: theme.spacing.lg, backgroundColor: theme.colors.background },
  title: { ...theme.typography.title, color: theme.colors.textPrimary, marginBottom: theme.spacing.md },
  scopeRow: { flexDirection: 'row', gap: theme.spacing.sm, marginBottom: theme.spacing.md },
  scopeButton: { flex: 1 },
  sent: { ...theme.typography.body, color: theme.colors.success, marginBottom: theme.spacing.md },
});
