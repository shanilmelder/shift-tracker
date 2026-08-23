import React, { useMemo, useState } from 'react';
import { View, Text, FlatList, Pressable, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { Users } from 'lucide-react-native';
import { theme, Button, ListRow, EmptyState, Badge } from '../../../src/components';
import { useShiftsList } from '../../../src/queries/shifts.queries';
import { rangeForView, groupByDay, type CalendarView } from '../../../src/lib/date-ranges';
import type { Shift } from '../../../src/types/api/shifts';
import { usePullToRefresh } from '../../../src/hooks';

const VIEWS: CalendarView[] = ['day', 'week', 'month'];

/**
 * Employee calendar (FR-014): day/week/month toggle over the shifts the employee is staffed
 * on. Renders from the persisted query cache when offline (constitution: Offline
 * Resilience) — TanStack Query's `useShiftsList` hook (see shifts.queries.ts) serves the
 * last-synced data automatically with no special-casing needed here.
 */
export default function EmployeeScheduleScreen(): React.JSX.Element {
  const router = useRouter();
  const [view, setView] = useState<CalendarView>('week');
  const [anchor] = useState(() => new Date());

  const { from, to } = useMemo(() => rangeForView(view, anchor), [view, anchor]);
  const { data: shifts, isLoading, isError, refetch } = useShiftsList({ from: from.toISOString(), to: to.toISOString() });
  const refreshControl = usePullToRefresh({ refetch });

  const grouped = useMemo(() => groupByDay<Shift>(shifts ?? []), [shifts]);

  return (
    <View style={styles.container}>
      {/* This screen is the employee's OWN shifts; the roster is everyone's. Linked from here
          because "who else is on?" is asked while looking at your own schedule. */}
      <Pressable
        onPress={() => router.push('/(employee)/roster')}
        accessibilityRole="button"
        style={({ pressed }) => [styles.rosterLink, pressed ? styles.rosterLinkPressed : null]}
      >
        <Users size={16} color={theme.colors.primary} />
        <Text style={styles.rosterLinkText}>See who&apos;s working</Text>
      </Pressable>

      <View style={styles.viewToggle}>
        {VIEWS.map((v) => (
          <Button
            key={v}
            label={v.charAt(0).toUpperCase() + v.slice(1)}
            variant={v === view ? 'primary' : 'secondary'}
            onPress={() => setView(v)}
            style={styles.viewButton}
          />
        ))}
      </View>

      {isLoading ? (
        <Text style={styles.status}>Loading your schedule…</Text>
      ) : isError ? (
        <Text style={styles.status}>
          Couldn't refresh your schedule — showing the last saved version, if any.
        </Text>
      ) : grouped.length === 0 ? (
        <EmptyState refreshControl={refreshControl} title="No shifts in this range" message="You have no shifts scheduled for this period." />
      ) : (
        <FlatList
          refreshControl={refreshControl}
          data={grouped}
          keyExtractor={(group) => group.dateKey}
          renderItem={({ item: group }) => (
            <View>
              <Text style={styles.dateHeader}>{group.dateKey}</Text>
              {group.items.map((shift) => (
                <ListRow
                  key={shift.id}
                  title={shift.name}
                  subtitle={`${new Date(shift.start_time).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })} – ${new Date(
                    shift.end_time,
                  ).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}`}
                  onPress={() => router.push(`/(employee)/schedule/${shift.id}`)}
                  right={<Badge label={shift.status} tone={shift.status === 'cancelled' ? 'danger' : 'neutral'} />}
                />
              ))}
            </View>
          )}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  rosterLink: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: theme.spacing.xs,
    minHeight: theme.minTapTarget,
    paddingHorizontal: theme.spacing.md,
  },
  rosterLinkPressed: { opacity: 0.6 },
  rosterLinkText: { ...theme.typography.label, color: theme.colors.primary },
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  viewToggle: {
    flexDirection: 'row',
    gap: theme.spacing.sm,
    padding: theme.spacing.md,
  },
  viewButton: {
    flex: 1,
  },
  status: {
    ...theme.typography.body,
    color: theme.colors.textSecondary,
    padding: theme.spacing.md,
  },
  dateHeader: {
    ...theme.typography.heading,
    color: theme.colors.textPrimary,
    paddingHorizontal: theme.spacing.md,
    paddingTop: theme.spacing.md,
  },
});
