import React, { useEffect, useState } from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import * as Location from 'expo-location';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { theme, Card, EmptyState } from '../../../src/components';
import { useShiftsList } from '../../../src/queries/shifts.queries';
import * as timeEntriesApi from '../../../src/api/time-entries.api';
import type { Shift } from '../../../src/types/api/shifts';
import { generateIdempotencyKey } from '../../../src/offline/idempotency';
import { useAppStore } from '../../../src/stores/app.store';
import { ApiError } from '../../../src/types/api/common';

function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
}

function formatElapsed(sinceIso: string, now: Date): string {
  const totalSeconds = Math.max(0, Math.floor((now.getTime() - new Date(sinceIso).getTime()) / 1000));
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${pad(hours)}:${pad(minutes)}:${pad(seconds)}`;
}

/**
 * Clock in/out (FR-019/FR-037-040). Location is checked server-side and NEVER blocks the
 * action here — the mutation always attempts to complete, and TanStack Query's offline
 * mutation queue (wired in `src/offline/query-client.ts`) picks it up automatically if the
 * device has no connectivity, replaying it once reconnected (constitution: Offline
 * Resilience). Each call carries a fresh idempotency key so a retried queued mutation is
 * never double-applied server-side.
 *
 * One circular clock button per shift, not a single day-level one: unlike the reference
 * mockup's single-shift assumption, an employee can legitimately have more than one shift the
 * same day (e.g. a split shift), so each shift keeps its own independent clock state.
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
        todaysShifts.map((shift: Shift) => {
          const isClockedIn = openEntry?.shift_id === shift.id;
          const isPending = isClockedIn ? clockOutMutation.isPending : clockInMutation.isPending;
          return (
            <ShiftClockCard
              key={shift.id}
              shift={shift}
              entry={isClockedIn ? openEntry : undefined}
              isPending={isPending}
              disabled={isPending || (!isClockedIn && Boolean(openEntry))}
              onClockIn={() => clockInMutation.mutate(shift.id)}
              onClockOut={() => clockOutMutation.mutate(openEntry!.id)}
            />
          );
        })
      )}
    </View>
  );
}

interface ShiftClockCardProps {
  shift: Shift;
  /** Present only while clocked in on this shift — carries clock_in_at/breaks for the Elapsed
   * card and break toggle below. */
  entry?: timeEntriesApi.TimeEntry;
  isPending: boolean;
  disabled: boolean;
  onClockIn: () => void;
  onClockOut: () => void;
}

/**
 * One shift's card: the "Location check" status (informational only, per checkGeofence's own
 * doc comment — never blocks the button below it) plus the circular clock button itself, and
 * — once clocked in — an elapsed-time readout and break toggle.
 * Split out from the list so each card's geofence query is its own hook call, not one called a
 * variable number of times inside a loop.
 */
function ShiftClockCard({ shift, entry, isPending, disabled, onClockIn, onClockOut }: ShiftClockCardProps): React.JSX.Element {
  const [position, setPosition] = useState<{ lat: number; lng: number } | null>(null);

  useEffect(() => {
    let cancelled = false;
    Location.getCurrentPositionAsync({})
      .then((result) => {
        if (!cancelled) setPosition({ lat: result.coords.latitude, lng: result.coords.longitude });
      })
      .catch(() => {
        // No permission or location unavailable — the status card below just stays hidden;
        // clocking in/out itself still works (it requests location again at that point).
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const { data: geofence } = useQuery({
    queryKey: ['geofence-check', shift.id, position],
    queryFn: () => timeEntriesApi.checkGeofence({ shiftId: shift.id, lat: position!.lat, lng: position!.lng }),
    enabled: Boolean(position),
  });

  const isClockedIn = Boolean(entry);

  return (
    <Card style={styles.card}>
      <Text style={styles.shiftName}>{shift.name}</Text>
      <Text style={styles.scheduled}>
        Scheduled {formatTime(shift.start_time)} – {formatTime(shift.end_time)}
      </Text>

      {geofence && geofence.approxDistanceM !== undefined ? (
        <View style={styles.geofenceRow}>
          <View style={[styles.geofenceDot, { backgroundColor: geofence.withinRange ? theme.colors.primary : theme.colors.danger }]} />
          <Text style={[styles.geofenceText, { color: geofence.withinRange ? theme.colors.primary : theme.colors.danger }]}>
            {geofence.withinRange ? 'Within range of your shift location' : `${geofence.approxDistanceM} m from your shift location`}
          </Text>
        </View>
      ) : null}

      <View style={styles.clockButtonWrap}>
        <Pressable
          onPress={isClockedIn ? onClockOut : onClockIn}
          disabled={disabled}
          accessibilityRole="button"
          accessibilityLabel={isClockedIn ? 'Clock out' : 'Clock in'}
          accessibilityState={{ disabled }}
          style={({ pressed }) => [
            styles.clockButton,
            { backgroundColor: isClockedIn ? theme.colors.danger : theme.colors.primary },
            pressed && !disabled ? styles.clockButtonPressed : null,
            disabled ? styles.clockButtonDisabled : null,
          ]}
        >
          <Text style={styles.clockButtonLabel}>
            {isPending ? (isClockedIn ? 'Clocking out…' : 'Clocking in…') : isClockedIn ? 'Clock out' : 'Clock in'}
          </Text>
        </Pressable>
      </View>

      {entry ? <ElapsedAndBreak entry={entry} /> : null}
    </Card>
  );
}

/** Split out so its 1-second timer only runs while a card is actually clocked in. */
function ElapsedAndBreak({ entry }: { entry: timeEntriesApi.TimeEntry }): React.JSX.Element {
  const queryClient = useQueryClient();
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    const interval = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(interval);
  }, []);

  const openBreak = entry.breaks.find((b) => !b.break_end_at);

  const startBreakMutation = useMutation({
    mutationFn: () => timeEntriesApi.startBreak(entry.id),
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: ['time-entries', 'mine'] }),
  });
  const endBreakMutation = useMutation({
    mutationFn: () => timeEntriesApi.endBreak(entry.id),
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: ['time-entries', 'mine'] }),
  });
  const breakMutationPending = startBreakMutation.isPending || endBreakMutation.isPending;

  return (
    <View style={styles.elapsedRow}>
      <View>
        <Text style={styles.scheduled}>Elapsed</Text>
        <Text style={styles.elapsedValue}>{entry.clock_in_at ? formatElapsed(entry.clock_in_at, now) : '—'}</Text>
      </View>
      <Pressable
        onPress={() => (openBreak ? endBreakMutation.mutate() : startBreakMutation.mutate())}
        disabled={breakMutationPending}
        accessibilityRole="button"
        accessibilityLabel={openBreak ? 'End break' : 'Start break'}
        accessibilityState={{ disabled: breakMutationPending }}
        style={({ pressed }) => [styles.breakPill, pressed && !breakMutationPending ? styles.breakPillPressed : null, breakMutationPending ? styles.clockButtonDisabled : null]}
      >
        <Text style={styles.breakPillText}>{openBreak ? 'End break' : 'Start break'}</Text>
      </Pressable>
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
    borderRadius: theme.radius.md,
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
    alignItems: 'center',
    gap: theme.spacing.xs,
  },
  shiftName: {
    ...theme.typography.heading,
    color: theme.colors.textPrimary,
    alignSelf: 'flex-start',
  },
  scheduled: {
    ...theme.typography.overline,
    color: theme.colors.textMuted,
    alignSelf: 'flex-start',
    marginBottom: theme.spacing.sm,
  },
  geofenceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.xs,
    alignSelf: 'flex-start',
    marginBottom: theme.spacing.xs,
  },
  geofenceDot: {
    width: 8,
    height: 8,
    borderRadius: theme.radius.full,
  },
  geofenceText: {
    ...theme.typography.caption,
  },
  clockButtonWrap: {
    paddingVertical: theme.spacing.sm,
  },
  clockButton: {
    width: 170,
    height: 170,
    borderRadius: theme.radius.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  clockButtonPressed: {
    opacity: 0.9,
  },
  clockButtonDisabled: {
    opacity: 0.4,
  },
  clockButtonLabel: {
    ...theme.typography.heading,
    fontFamily: theme.typography.value.fontFamily,
    color: theme.colors.primaryText,
  },
  elapsedRow: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderColor: theme.colors.primary,
    borderRadius: theme.radius.md,
    padding: theme.spacing.md,
    marginTop: theme.spacing.sm,
  },
  elapsedValue: {
    ...theme.typography.value,
    color: theme.colors.textPrimary,
  },
  breakPill: {
    borderWidth: 1,
    borderColor: theme.colors.borderStrong,
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.full,
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: theme.spacing.xs,
    minHeight: theme.minTapTarget,
    justifyContent: 'center',
  },
  breakPillPressed: {
    backgroundColor: theme.colors.surfaceMuted,
  },
  breakPillText: {
    ...theme.typography.label,
    color: theme.colors.textPrimary,
  },
});
