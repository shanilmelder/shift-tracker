import React, { useEffect, useState } from 'react';
import { View, Text, ScrollView, StyleSheet } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { theme, Button, TextField, DateField, ConfirmDialog } from '../../../../src/components';
import { useShiftDetail, useUpdateShift, useDeleteShift } from '../../../../src/queries/shifts.queries';
import { usePullToRefresh } from '../../../../src/hooks';
import { ApiError } from '../../../../src/types/api/common';

function pad(n: number): string {
  return String(n).padStart(2, '0');
}

/** An ISO timestamp split into the local "YYYY-MM-DD" and "HH:MM" strings the pickers use. */
function splitLocal(iso: string): { date: string; time: string } {
  const d = new Date(iso);
  return {
    date: `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`,
    time: `${pad(d.getHours())}:${pad(d.getMinutes())}`,
  };
}

/**
 * Edit one dated shift: its name, the date it runs on, and its start/end time — the fields a
 * manager actually needs to correct after the fact (FR-027). Staffing is deliberately not
 * here; that stays on this shift's `staff` route, matching the API, where PATCH /v1/shifts/:id
 * never accepts a staffing field.
 *
 * Deleting also lives here rather than on the Build list, so the destructive action sits
 * behind an intentional navigation instead of one stray tap next to every row.
 */
export default function EditShiftScreen(): React.JSX.Element {
  const { shiftId } = useLocalSearchParams<{ shiftId: string }>();
  const router = useRouter();

  const shiftQuery = useShiftDetail(shiftId);
  const { data: shift, isLoading, isError } = shiftQuery;
  const refreshControl = usePullToRefresh(shiftQuery);

  const updateShift = useUpdateShift(shiftId);
  const deleteShift = useDeleteShift();

  const [name, setName] = useState('');
  const [date, setDate] = useState('');
  const [startTime, setStartTime] = useState('');
  const [endTime, setEndTime] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [confirmingDelete, setConfirmingDelete] = useState(false);

  // Seeds the form from the loaded shift. Keyed on the shift's id and timestamps rather than
  // running once on mount, so a pull-to-refresh that brings in a server-side change re-seeds
  // instead of leaving the user editing stale values.
  useEffect(() => {
    if (!shift) return;
    const start = splitLocal(shift.start_time);
    const end = splitLocal(shift.end_time);
    setName(shift.name);
    setDate(start.date);
    setStartTime(start.time);
    setEndTime(end.time);
  }, [shift?.id, shift?.name, shift?.start_time, shift?.end_time]);

  const assignmentCount = shift?.assignments.length ?? 0;

  function handleSave(): void {
    setError(null);
    setSaved(false);
    if (!name.trim()) {
      setError('Shift name is required');
      return;
    }
    if (!date || !startTime || !endTime) {
      setError('Date, start time and end time are all required');
      return;
    }
    if (startTime >= endTime) {
      setError('End time must be after start time');
      return;
    }

    updateShift.mutate(
      {
        name: name.trim(),
        startTime: new Date(`${date}T${startTime}`).toISOString(),
        endTime: new Date(`${date}T${endTime}`).toISOString(),
      },
      {
        onSuccess: () => setSaved(true),
        onError: (err) => setError(err instanceof ApiError ? err.message : 'Could not save this shift. Please try again.'),
      },
    );
  }

  function handleDelete(): void {
    setConfirmingDelete(false);
    deleteShift.mutate(shiftId, {
      onSuccess: () => router.replace('/(manager)/schedule'),
      onError: (err) => setError(err instanceof ApiError ? err.message : 'Could not delete this shift. Please try again.'),
    });
  }

  if (isLoading) {
    return (
      <View style={styles.container}>
        <Text style={styles.status}>Loading shift…</Text>
      </View>
    );
  }

  if (isError || !shift) {
    return (
      <View style={styles.container}>
        <Text style={styles.status}>This shift may have been removed.</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content} refreshControl={refreshControl}>
      <Text style={styles.title}>Edit shift</Text>

      <TextField label="Shift name" value={name} onChangeText={setName} />
      <DateField label="Shift date" mode="date" value={date} onChange={setDate} />
      <View style={styles.row}>
        <View style={styles.rowItem}>
          <DateField label="Starts" mode="time" value={startTime} onChange={setStartTime} />
        </View>
        <View style={styles.rowItem}>
          <DateField label="Ends" mode="time" value={endTime} onChange={setEndTime} />
        </View>
      </View>

      {error ? <Text style={styles.error}>{error}</Text> : null}
      {saved ? <Text style={styles.success}>Shift updated.</Text> : null}

      <Button label={updateShift.isPending ? 'Saving…' : 'Save changes'} onPress={handleSave} disabled={updateShift.isPending} />

      <Button
        label="Staff this shift"
        variant="secondary"
        onPress={() => router.push(`/(manager)/schedule/${shiftId}/staff`)}
      />

      <View style={styles.dangerZone}>
        <Text style={styles.dangerLabel}>Delete shift</Text>
        <Text style={styles.hint}>
          {assignmentCount === 0
            ? 'This shift has nobody staffed on it.'
            : `${assignmentCount} staff assignment${assignmentCount === 1 ? '' : 's'} will be removed with it.`}
        </Text>
        <Button
          label={deleteShift.isPending ? 'Deleting…' : 'Delete shift'}
          variant="danger"
          onPress={() => setConfirmingDelete(true)}
          disabled={deleteShift.isPending}
        />
      </View>

      <ConfirmDialog
        visible={confirmingDelete}
        destructive
        title="Delete this shift?"
        message={
          assignmentCount === 0
            ? `"${shift.name}" will be permanently deleted. This can't be undone.`
            : `"${shift.name}" will be permanently deleted, along with ${assignmentCount} staff assignment${
                assignmentCount === 1 ? '' : 's'
              } on it. Anyone staffed will be notified. This can't be undone.`
        }
        confirmLabel="Delete"
        onConfirm={handleDelete}
        onCancel={() => setConfirmingDelete(false)}
      />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.background },
  content: { padding: theme.spacing.md, gap: theme.spacing.sm },
  title: { ...theme.typography.title, color: theme.colors.textPrimary },
  row: { flexDirection: 'row', gap: theme.spacing.sm },
  rowItem: { flex: 1 },
  status: { ...theme.typography.body, color: theme.colors.textSecondary, padding: theme.spacing.md },
  error: { ...theme.typography.body, color: theme.colors.danger },
  success: { ...theme.typography.body, color: theme.colors.primary },
  hint: { ...theme.typography.caption, color: theme.colors.textMuted },
  dangerZone: {
    marginTop: theme.spacing.lg,
    paddingTop: theme.spacing.md,
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
    gap: theme.spacing.xs,
  },
  dangerLabel: { ...theme.typography.overline, color: theme.colors.danger },
});
