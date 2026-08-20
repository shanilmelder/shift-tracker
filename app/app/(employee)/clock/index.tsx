import React, { useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import * as Location from 'expo-location';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { theme, Button, Card, EmptyState } from '../../../src/components';
import { useShiftsList } from '../../../src/queries/shifts.queries';
import * as timeEntriesApi from '../../../src/api/time-entries.api';
import type { Shift } from '../../../src/types/api/shifts';
import { generateIdempotencyKey } from '../../../src/offline/idempotency';
import { useAppStore } from '../../../src/stores/app.store';
import { ApiError } from '../../../src/types/api/common';

/**
 * Clock in/out (FR-019/FR-037-040). Location is checked server-side and NEVER blocks the
 * action here — the mutation always attempts to complete, and TanStack Query's offline
 * mutation queue (wired in `src/offline/query-client.ts`) picks it up automatically if the
 * device has no connectivity, replaying it once reconnected (constitution: Offline
 * Resilience). Each call carries a fresh idempotency key so a retried queued mutation is
 * never double-applied server-side.
 */
export default function ClockScreen(): React.JSX.Element {
  const queryClient = useQueryClient();
  const syncStatus = useAppStore((state) => state.syncStatus);
  const [error, setError] = useState<string | null>(null);

  const { data: todaysShifts } = useShiftsList({
    from: new Date(new Date().setHours(0, 0, 0, 0)).toISOString(),
    to: new Date(new Date().setHours(23, 59, 59, 999)).toISOString(),
  });

  const { data: openEntries } = useQuery({
    queryKey: ['time-entries', 'mine'],
    queryFn: timeEntriesApi.listMyTimeEntries,
  });

  const clockInMutation = useMutation({
    mutationFn: async (shiftId: string) => {
      const position = await Location.getCurrentPositionAsync({});
      return timeEntriesApi.clockIn({
        shiftId,
        lat: position.coords.latitude,
        lng: position.coords.longitude,
        idempotencyKey: generateIdempotencyKey(),
      });
    },
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: ['time-entries', 'mine'] }),
    onError: (err) => setError(err instanceof ApiError ? err.message : 'Could not clock in — it will retry automatically once online.'),
  });

  const clockOutMutation = useMutation({
    mutationFn: async (entryId: string) => {
      const position = await Location.getCurrentPositionAsync({});
      return timeEntriesApi.clockOut(entryId, {
        lat: position.coords.latitude,
        lng: position.coords.longitude,
        idempotencyKey: generateIdempotencyKey(),
      });
    },
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: ['time-entries', 'mine'] }),
    onError: (err) => setError(err instanceof ApiError ? err.message : 'Could not clock out — it will retry automatically once online.'),
  });

  const openEntry = openEntries?.find((e: timeEntriesApi.TimeEntry) => !e.clock_out_at);

  return (
    <View style={styles.container}>
      {syncStatus !== 'online' ? (
        <View style={styles.offlineBanner}>
          <Text style={styles.offlineText}>
            {syncStatus === 'offline' ? "You're offline — actions will sync once you're back online." : 'Syncing…'}
          </Text>
        </View>
      ) : null}

      {error ? <Text style={styles.error}>{error}</Text> : null}

      {!todaysShifts || todaysShifts.length === 0 ? (
        <EmptyState title="No shifts today" message="You have nothing scheduled today to clock into." />
      ) : (
        todaysShifts.map((shift: Shift) => (
          <Card key={shift.id} style={styles.card}>
            <Text style={styles.shiftName}>{shift.name}</Text>
            {openEntry?.shift_id === shift.id ? (
              <Button label={clockOutMutation.isPending ? 'Clocking out…' : 'Clock out'} variant="danger" onPress={() => clockOutMutation.mutate(openEntry.id)} disabled={clockOutMutation.isPending} />
            ) : (
              <Button label={clockInMutation.isPending ? 'Clocking in…' : 'Clock in'} onPress={() => clockInMutation.mutate(shift.id)} disabled={clockInMutation.isPending || Boolean(openEntry)} />
            )}
          </Card>
        ))
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
    padding: theme.spacing.md,
  },
  offlineBanner: {
    backgroundColor: theme.colors.surface,
    borderRadius: 8,
    padding: theme.spacing.sm,
    marginBottom: theme.spacing.md,
  },
  offlineText: {
    ...theme.typography.caption,
    color: theme.colors.textSecondary,
  },
  error: {
    ...theme.typography.body,
    color: theme.colors.danger,
    marginBottom: theme.spacing.md,
  },
  card: {
    marginBottom: theme.spacing.md,
  },
  shiftName: {
    ...theme.typography.heading,
    color: theme.colors.textPrimary,
    marginBottom: theme.spacing.sm,
  },
});
