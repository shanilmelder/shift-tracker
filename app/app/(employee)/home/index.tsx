import React, { useMemo } from 'react';
import { View, Text, ScrollView, StyleSheet } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { theme, Card, Button, EmptyState } from '../../../src/components';
import { useShiftsList } from '../../../src/queries/shifts.queries';
import * as timeEntriesApi from '../../../src/api/time-entries.api';
import { rangeForView, startOfDay, addDays } from '../../../src/lib/date-ranges';
import type { Shift } from '../../../src/types/api/shifts';
import { usePullToRefresh } from '../../../src/hooks';

function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
}
function formatDay(iso: string): string {
  return new Date(iso).toLocaleDateString('en-US', { weekday: 'short', day: 'numeric', month: 'short' });
}

/**
 * Employee "Home" (doc/design's Prototype.dc.html home screen): a glance at the next shift,
 * the week's totals, and what's coming up — everything the Schedule tab's full calendar would
 * otherwise make you dig for. Composed entirely from queries other screens already use
 * (shifts, my time entries, my timesheet) rather than a dedicated aggregate endpoint, since
 * none of these numbers need server-side computation the client doesn't already have to do.
 */
export default function EmployeeHomeScreen(): React.JSX.Element {
  const router = useRouter();
  const now = useMemo(() => new Date(), []);
  const weekRange = useMemo(() => rangeForView('week', now), [now]);
  const upcomingWindow = useMemo(() => ({ from: startOfDay(now), to: addDays(startOfDay(now), 7) }), [now]);

  const { data: upcomingShifts, isLoading: shiftsLoading, refetch: refetchShifts } = useShiftsList({
    from: upcomingWindow.from.toISOString(),
    to: upcomingWindow.to.toISOString(),
  });
  const { data: openEntries, refetch: refetchEntries } = useQuery({ queryKey: ['time-entries', 'mine'], queryFn: timeEntriesApi.listMyTimeEntries });
  const { data: timesheet, refetch: refetchTimesheet } = useQuery({
    queryKey: ['timesheet', 'mine', 'week', weekRange.from.toISOString()],
    queryFn: () => timeEntriesApi.getMyTimesheet(weekRange.from.toISOString(), weekRange.to.toISOString()),
  });
  const refreshControl = usePullToRefresh({ refetch: refetchShifts }, { refetch: refetchEntries }, { refetch: refetchTimesheet });

  const sortedUpcoming = useMemo(
    () => [...(upcomingShifts ?? [])].sort((a, b) => a.start_time.localeCompare(b.start_time)),
    [upcomingShifts],
  );
  const nextShift = sortedUpcoming[0] as Shift | undefined;
  const shiftsLeftThisWeek = sortedUpcoming.filter((s) => s.start_time < weekRange.to.toISOString()).length;
  const openEntry = openEntries?.find((e) => !e.clock_out_at);
  const isClockedIn = Boolean(openEntry);
  const canClockIntoNext = nextShift && new Date(nextShift.start_time).getTime() - now.getTime() < 60 * 60 * 1000;

  return (
    <ScrollView refreshControl={refreshControl} style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.title}>Home</Text>

      {shiftsLoading ? (
        <Text style={styles.status}>Loading…</Text>
      ) : nextShift ? (
        <Card style={styles.nextShiftCard}>
          <Text style={styles.overline}>Next shift</Text>
          <Text style={styles.nextShiftTime}>
            {formatDay(nextShift.start_time)} · {formatTime(nextShift.start_time)} – {formatTime(nextShift.end_time)}
          </Text>
          <Button
            label={isClockedIn ? 'Clock out' : 'Clock in'}
            onPress={() => router.push('/(employee)/clock')}
            disabled={!isClockedIn && !canClockIntoNext}
            style={styles.clockCta}
          />
        </Card>
      ) : (
        <EmptyState title="No upcoming shifts" message="Nothing scheduled in the next 7 days." />
      )}

      <View style={styles.statGrid}>
        <Card style={styles.statCard}>
          <Text style={styles.overline}>This week</Text>
          <Text style={styles.statValue}>{(timesheet?.totalRegularHours ?? 0) + (timesheet?.totalOvertimeHours ?? 0)} h</Text>
        </Card>
        <Card style={styles.statCard}>
          <Text style={styles.overline}>Shifts left</Text>
          <Text style={styles.statValue}>{shiftsLeftThisWeek}</Text>
        </Card>
      </View>

      <Text style={styles.sectionLabel}>Upcoming</Text>
      {sortedUpcoming.length === 0 ? (
        <Text style={styles.status}>Nothing in the next 7 days.</Text>
      ) : (
        sortedUpcoming.map((shift) => (
          <Card key={shift.id} style={styles.upcomingRow}>
            <View>
              <Text style={styles.upcomingDay}>{formatDay(shift.start_time)}</Text>
              <Text style={styles.upcomingName}>{shift.name}</Text>
            </View>
            <Text style={styles.upcomingTime}>
              {formatTime(shift.start_time)} – {formatTime(shift.end_time)}
            </Text>
          </Card>
        ))
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.background },
  content: { padding: theme.spacing.md, gap: theme.spacing.md },
  title: { ...theme.typography.title, color: theme.colors.textPrimary },
  status: { ...theme.typography.body, color: theme.colors.textSecondary },
  overline: { ...theme.typography.overline, color: theme.colors.textMuted },
  nextShiftCard: { gap: theme.spacing.sm },
  nextShiftTime: { ...theme.typography.heading, color: theme.colors.textPrimary },
  clockCta: { marginTop: theme.spacing.xs },
  statGrid: { flexDirection: 'row', gap: theme.spacing.sm },
  statCard: { flex: 1, gap: theme.spacing.xs },
  statValue: { ...theme.typography.value, color: theme.colors.textPrimary },
  sectionLabel: { ...theme.typography.overline, color: theme.colors.textMuted },
  upcomingRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  upcomingDay: { ...theme.typography.overline, color: theme.colors.textMuted },
  upcomingName: { ...theme.typography.body, color: theme.colors.textPrimary },
  upcomingTime: { ...theme.typography.label, color: theme.colors.textSecondary },
});
