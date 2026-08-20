import React, { useState } from 'react';
import { View, Text, FlatList, StyleSheet } from 'react-native';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { theme, Button, TextField, DateField, ListRow, EmptyState } from '../../../src/components';
import { apiRequest } from '../../../src/api/client';

interface AvailabilityRow {
  id: string;
  day_of_week: number | null;
  start_time: string | null;
  end_time: string | null;
  recurring: boolean;
  blocked_date: string | null;
}

const DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

/** FR-016: recurring weekly availability + specific blocked-out dates, replaced as a whole set. */
export default function AvailabilityScreen(): React.JSX.Element {
  const queryClient = useQueryClient();
  const { data: rows } = useQuery({ queryKey: ['availability', 'mine'], queryFn: () => apiRequest<AvailabilityRow[]>('/availability', { query: { mine: true } }) });
  const [blockedDate, setBlockedDate] = useState('');
  const [recurringDay, setRecurringDay] = useState('1');
  const [recurringStart, setRecurringStart] = useState('09:00');
  const [recurringEnd, setRecurringEnd] = useState('17:00');

  function existingRows() {
    return (rows ?? []).map((r: AvailabilityRow) => ({
      recurring: r.recurring,
      dayOfWeek: r.day_of_week ?? undefined,
      startTime: r.start_time ?? undefined,
      endTime: r.end_time ?? undefined,
      blockedDate: r.blocked_date ?? undefined,
    }));
  }

  const addBlockedDateMutation = useMutation({
    mutationFn: () => apiRequest('/availability', { method: 'PUT', body: { rows: [...existingRows(), { recurring: false, blockedDate }] } }),
    onSuccess: () => {
      setBlockedDate('');
      void queryClient.invalidateQueries({ queryKey: ['availability', 'mine'] });
    },
  });

  const addRecurringMutation = useMutation({
    mutationFn: () =>
      apiRequest('/availability', {
        method: 'PUT',
        body: { rows: [...existingRows(), { recurring: true, dayOfWeek: Number(recurringDay), startTime: recurringStart, endTime: recurringEnd }] },
      }),
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: ['availability', 'mine'] }),
  });

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Availability</Text>

      <View style={styles.addRow}>
        <Text style={styles.sectionLabel}>Recurring weekly availability</Text>
        <TextField label="Day of week (0=Sun … 6=Sat)" keyboardType="number-pad" value={recurringDay} onChangeText={setRecurringDay} />
        <DateField label="Start time" mode="time" value={recurringStart} onChange={setRecurringStart} />
        <DateField label="End time" mode="time" value={recurringEnd} onChange={setRecurringEnd} />
        <Button label="Add recurring window" onPress={() => addRecurringMutation.mutate()} disabled={addRecurringMutation.isPending} />
      </View>

      <View style={styles.addRow}>
        <Text style={styles.sectionLabel}>Block out a specific date</Text>
        <DateField label="Date" mode="date" value={blockedDate} onChange={setBlockedDate} />
        <Button label="Add blocked date" onPress={() => addBlockedDateMutation.mutate()} disabled={!blockedDate.trim() || addBlockedDateMutation.isPending} />
      </View>

      {!rows || rows.length === 0 ? (
        <EmptyState title="No availability set" />
      ) : (
        <FlatList
          data={rows}
          keyExtractor={(row) => row.id}
          renderItem={({ item }) => (
            <ListRow
              title={item.recurring ? `Every ${DAY_NAMES[item.day_of_week ?? 0]}` : `Blocked: ${item.blocked_date}`}
              subtitle={item.recurring && item.start_time ? `${item.start_time} – ${item.end_time}` : undefined}
            />
          )}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.background, padding: theme.spacing.md },
  title: { ...theme.typography.title, color: theme.colors.textPrimary, marginBottom: theme.spacing.md },
  addRow: { marginBottom: theme.spacing.lg },
  sectionLabel: { ...theme.typography.heading, color: theme.colors.textPrimary, marginBottom: theme.spacing.sm },
});
