import React, { useState } from 'react';
import { View, Text, ScrollView, StyleSheet } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { useQuery, useMutation } from '@tanstack/react-query';
import { theme, Card, Badge, EmptyState, Button, ListRow } from '../../../src/components';
import { useShiftDetail } from '../../../src/queries/shifts.queries';
import { listEligibleCoworkers, createSwapRequest, type EligibleCoworker } from '../../../src/api/swap-requests.api';
import { ApiError } from '../../../src/types/api/common';
import type { ShiftAssignment } from '../../../src/types/api/shifts';
import { usePullToRefresh } from '../../../src/hooks';

/** Shift detail (FR-015): time, location/area, role, and notes. */
export default function ShiftDetailScreen(): React.JSX.Element {
  const { shiftId } = useLocalSearchParams<{ shiftId: string }>();
  const { data: shift, isLoading, isError, refetch: refetchShift } = useShiftDetail(shiftId);
  const [showSwapPicker, setShowSwapPicker] = useState(false);
  const [sentTo, setSentTo] = useState<string | null>(null);
  const [swapError, setSwapError] = useState<string | null>(null);

  const { data: eligibleCoworkers, refetch: refetchCoworkers } = useQuery({
    queryKey: ['eligible-coworkers', shiftId],
    queryFn: () => listEligibleCoworkers(shiftId),
    enabled: showSwapPicker,
  });
  const refreshControl = usePullToRefresh({ refetch: refetchShift }, { refetch: refetchCoworkers });

  const sendSwapMutation = useMutation({
    mutationFn: (coworker: EligibleCoworker) => createSwapRequest(shiftId, coworker.id),
    onSuccess: (_result, coworker) => {
      setSwapError(null);
      setSentTo(coworker.name);
    },
    // Without this the request failed in complete silence — the button did nothing and no swap
    // was ever created, which read as "swaps are broken" rather than as a rejected request.
    onError: (err) =>
      setSwapError(err instanceof ApiError ? err.message : 'Could not send the swap request. Please try again.'),
  });

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
        <EmptyState refreshControl={refreshControl} title="Shift unavailable" message="This shift may have been removed, or you may no longer be staffed on it." />
      </View>
    );
  }

  return (
    <ScrollView refreshControl={refreshControl} style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.title}>{shift.name}</Text>
      <Badge label={shift.status} tone={shift.status === 'cancelled' ? 'danger' : 'neutral'} />

      <Card style={styles.card}>
        <Row label="Starts" value={new Date(shift.start_time).toLocaleString()} />
        <Row label="Ends" value={new Date(shift.end_time).toLocaleString()} />
        {shift.position ? <Row label="Role" value={shift.position} /> : null}
      </Card>

      {shift.notes ? (
        <Card style={styles.card}>
          <Text style={styles.sectionLabel}>Notes</Text>
          <Text style={styles.body}>{shift.notes}</Text>
        </Card>
      ) : null}

      <Card style={styles.card}>
        <Text style={styles.sectionLabel}>Staffed</Text>
        {shift.assignments.length === 0 ? (
          <Text style={styles.body}>No one is staffed on this shift yet.</Text>
        ) : (
          // NOTE: shows the employee id until the team directory (Phase 10 / US8, T088)
          // exists to resolve ids to display names — tracked there, not guessed at here.
          shift.assignments.map((assignment: ShiftAssignment) => (
            <Text key={assignment.id} style={styles.body}>
              {assignment.employee_id}
              {assignment.is_leader ? ' — Shift leader' : ''}
            </Text>
          ))
        )}
      </Card>

      <Card style={styles.card}>
        <Text style={styles.sectionLabel}>Shift swap</Text>
        {swapError ? <Text style={styles.errorText}>{swapError}</Text> : null}
        {sentTo ? (
          <Text style={styles.body}>Swap request sent to {sentTo} — you&apos;ll be notified when it&apos;s decided.</Text>
        ) : !showSwapPicker ? (
          <Button label="Request a swap" onPress={() => setShowSwapPicker(true)} />
        ) : !eligibleCoworkers ? (
          <Text style={styles.body}>Finding eligible coworkers…</Text>
        ) : eligibleCoworkers.length === 0 ? (
          <Text style={styles.body}>No eligible coworkers with a free schedule for this shift.</Text>
        ) : (
          eligibleCoworkers.map((coworker: EligibleCoworker) => (
            <ListRow
              key={coworker.id}
              title={coworker.name}
              right={<Button label="Send request" onPress={() => sendSwapMutation.mutate(coworker)} />}
            />
          ))
        )}
      </Card>
    </ScrollView>
  );
}

function Row({ label, value }: { label: string; value: string }): React.JSX.Element {
  return (
    <View style={styles.row}>
      <Text style={styles.rowLabel}>{label}</Text>
      <Text style={styles.rowValue}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  content: {
    padding: theme.spacing.lg,
  },
  status: {
    ...theme.typography.body,
    color: theme.colors.textSecondary,
    padding: theme.spacing.md,
  },
  title: {
    ...theme.typography.title,
    color: theme.colors.textPrimary,
    marginBottom: theme.spacing.sm,
  },
  card: {
    marginTop: theme.spacing.md,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: theme.spacing.xs,
  },
  rowLabel: {
    ...theme.typography.caption,
    color: theme.colors.textSecondary,
  },
  rowValue: {
    ...theme.typography.body,
    color: theme.colors.textPrimary,
  },
  sectionLabel: {
    ...theme.typography.heading,
    color: theme.colors.textPrimary,
    marginBottom: theme.spacing.xs,
  },
  body: {
    ...theme.typography.body,
    color: theme.colors.textPrimary,
  },
  errorText: {
    ...theme.typography.body,
    color: theme.colors.danger,
    marginBottom: theme.spacing.sm,
  },
});
