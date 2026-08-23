import React, { useMemo, useState } from 'react';
import { View, Text, ScrollView, Pressable, StyleSheet } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { ChevronLeft, ChevronRight, Users } from 'lucide-react-native';
import { theme, fontFamilies, Card, Badge, EmptyState } from '../../components';
import { getRoster, type RosterShift } from '../../api/roster.api';
import { usePullToRefresh } from '../../hooks';

export type RosterRange = 'day' | 'week' | 'month';

// ---------------------------------------------------------------------------
// Date helpers
//
// All of these work on a "YYYY-MM-DD" calendar date rather than a Date instant. Paging a rota
// is calendar arithmetic — "the next week" is seven calendar days on, not 7 × 86,400,000 ms —
// and keeping it that way means a DST transition can never shift a page boundary by an hour.
//
// Deliberately NOT src/lib/date-ranges.ts, despite the overlap: those helpers work in the
// DEVICE's timezone, which is the right choice for "my own schedule" on a phone. A rota is the
// business's, so every boundary here is resolved in the LOCATION's timezone instead — the same
// shift must appear on the same day for everyone reading it, wherever their phone happens to be.
// ---------------------------------------------------------------------------

/** Today's calendar date at the location. */
function todayIn(timeZone: string): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone, year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date());
}

function addDays(date: string, days: number): string {
  const asUtc = new Date(`${date}T00:00:00Z`);
  asUtc.setUTCDate(asUtc.getUTCDate() + days);
  return asUtc.toISOString().slice(0, 10);
}

function addMonths(date: string, months: number): string {
  const [year, month] = date.split('-').map(Number);
  // Day 1 always exists in every month, so this cannot roll over the way "31 Jan + 1 month"
  // would. Callers only ever use it to find the first of a month.
  const asUtc = new Date(Date.UTC(year!, month! - 1 + months, 1));
  return asUtc.toISOString().slice(0, 10);
}

/** Monday of the week containing `date`. */
function startOfWeek(date: string): string {
  const asUtc = new Date(`${date}T00:00:00Z`);
  // getUTCDay is 0 = Sunday; shift so Monday is 0.
  const mondayIndex = (asUtc.getUTCDay() + 6) % 7;
  return addDays(date, -mondayIndex);
}

function startOfMonth(date: string): string {
  return `${date.slice(0, 7)}-01`;
}

function endOfMonth(date: string): string {
  return addDays(addMonths(startOfMonth(date), 1), -1);
}

/** The [from, to] calendar dates a given anchor and range cover. */
function rangeFor(anchor: string, range: RosterRange): { from: string; to: string } {
  if (range === 'day') return { from: anchor, to: anchor };
  if (range === 'week') {
    const from = startOfWeek(anchor);
    return { from, to: addDays(from, 6) };
  }
  return { from: startOfMonth(anchor), to: endOfMonth(anchor) };
}

function shiftAnchor(anchor: string, range: RosterRange, direction: 1 | -1): string {
  if (range === 'day') return addDays(anchor, direction);
  if (range === 'week') return addDays(anchor, 7 * direction);
  return addMonths(startOfMonth(anchor), direction);
}

function formatTime(iso: string, timeZone: string): string {
  return new Intl.DateTimeFormat(undefined, { timeZone, hour: 'numeric', minute: '2-digit' }).format(new Date(iso));
}

/** "Mon 24 Aug" — the weekday is what people scan a rota by. */
function formatDayHeading(date: string, timeZone: string): string {
  // Noon avoids any chance of the date itself flipping when rendered in another zone.
  const instant = new Date(`${date}T12:00:00Z`);
  return new Intl.DateTimeFormat(undefined, { timeZone, weekday: 'short', day: 'numeric', month: 'short' }).format(instant);
}

function formatRangeLabel(from: string, to: string, range: RosterRange, timeZone: string): string {
  const at = (date: string) => new Date(`${date}T12:00:00Z`);
  if (range === 'day') {
    return new Intl.DateTimeFormat(undefined, { timeZone, weekday: 'long', day: 'numeric', month: 'long' }).format(at(from));
  }
  if (range === 'month') {
    return new Intl.DateTimeFormat(undefined, { timeZone, month: 'long', year: 'numeric' }).format(at(from));
  }
  const short = new Intl.DateTimeFormat(undefined, { timeZone, day: 'numeric', month: 'short' });
  return `${short.format(at(from))} – ${short.format(at(to))}`;
}

/** The local calendar date a shift belongs to — the day it STARTS, in the location's zone. */
function dayKeyOf(shift: RosterShift, timeZone: string): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone, year: 'numeric', month: '2-digit', day: '2-digit' }).format(
    new Date(shift.startTime),
  );
}

// ---------------------------------------------------------------------------

const RANGES: Array<{ value: RosterRange; label: string }> = [
  { value: 'day', label: 'Day' },
  { value: 'week', label: 'Week' },
  { value: 'month', label: 'Month' },
];

/**
 * Who is working which shift, across the whole location — shared by employees and managers
 * rather than duplicated per role, since both see exactly the same thing.
 *
 * Read-only on purpose. Editing lives on the manager's Build screen; a rota everyone can see
 * should not be a place anyone can change it by accident.
 */
export function RosterScreen(): React.JSX.Element {
  const [range, setRange] = useState<RosterRange>('week');
  /** Which day/week/month is on screen. Held as a calendar date, not an instant. */
  const [anchor, setAnchor] = useState<string | null>(null);

  // The first render has no location timezone yet, so it asks for today as the device sees it
  // and re-anchors once the response arrives. Guessing the device's date is close enough to
  // avoid a blank first paint, and is corrected before anything is read from it.
  const deviceToday = useMemo(() => todayIn(Intl.DateTimeFormat().resolvedOptions().timeZone), []);
  const effectiveAnchor = anchor ?? deviceToday;
  const { from, to } = rangeFor(effectiveAnchor, range);

  const rosterQuery = useQuery({
    queryKey: ['roster', from, to],
    queryFn: () => getRoster(from, to),
  });
  const refreshControl = usePullToRefresh(rosterQuery);
  const { data, isLoading, isError, error } = rosterQuery;

  const timeZone = data?.timeZone ?? Intl.DateTimeFormat().resolvedOptions().timeZone;

  // Grouped by the day each shift starts, and only days that actually have shifts get a
  // heading — an empty month view of 31 "nothing scheduled" rows is noise, not information.
  const days = useMemo(() => {
    const byDay = new Map<string, RosterShift[]>();
    for (const shift of data?.shifts ?? []) {
      const key = dayKeyOf(shift, timeZone);
      byDay.set(key, [...(byDay.get(key) ?? []), shift]);
    }
    return [...byDay.entries()].sort(([a], [b]) => a.localeCompare(b));
  }, [data?.shifts, timeZone]);

  const totalShifts = data?.shifts.length ?? 0;

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Who&apos;s working</Text>
      </View>

      <View style={styles.rangeRow}>
        {RANGES.map((option) => (
          <Pressable
            key={option.value}
            onPress={() => setRange(option.value)}
            accessibilityRole="button"
            accessibilityState={{ selected: range === option.value }}
            style={({ pressed }) => [
              styles.rangeChip,
              range === option.value ? styles.rangeChipOn : null,
              pressed ? styles.pressed : null,
            ]}
          >
            <Text style={[styles.rangeChipText, range === option.value ? styles.rangeChipTextOn : null]}>{option.label}</Text>
          </Pressable>
        ))}
      </View>

      <View style={styles.pager}>
        <Pressable
          onPress={() => setAnchor(shiftAnchor(effectiveAnchor, range, -1))}
          accessibilityRole="button"
          accessibilityLabel={`Previous ${range}`}
          style={({ pressed }) => [styles.pagerButton, pressed ? styles.pressed : null]}
        >
          <ChevronLeft size={20} color={theme.colors.textPrimary} />
        </Pressable>

        <Pressable
          // Tapping the label returns to today, which is where someone almost always wants to
          // be after paging around.
          onPress={() => setAnchor(todayIn(timeZone))}
          accessibilityRole="button"
          accessibilityLabel={`${formatRangeLabel(from, to, range, timeZone)}. Tap to return to today.`}
          style={({ pressed }) => [styles.pagerLabelWrap, pressed ? styles.pressed : null]}
        >
          <Text style={styles.pagerLabel}>{formatRangeLabel(from, to, range, timeZone)}</Text>
        </Pressable>

        <Pressable
          onPress={() => setAnchor(shiftAnchor(effectiveAnchor, range, 1))}
          accessibilityRole="button"
          accessibilityLabel={`Next ${range}`}
          style={({ pressed }) => [styles.pagerButton, pressed ? styles.pressed : null]}
        >
          <ChevronRight size={20} color={theme.colors.textPrimary} />
        </Pressable>
      </View>

      <ScrollView contentContainerStyle={styles.content} refreshControl={refreshControl}>
        {isLoading ? (
          <Text style={styles.status}>Loading…</Text>
        ) : isError ? (
          // Distinguished from an empty rota: "nobody is scheduled" and "we could not load the
          // schedule" look identical otherwise, and mean very different things.
          <Text style={styles.errorText}>{error instanceof Error ? error.message : 'Could not load the schedule.'}</Text>
        ) : totalShifts === 0 ? (
          <EmptyState title="Nothing scheduled" message={`No shifts for this ${range}.`} />
        ) : (
          days.map(([dayKey, shifts]) => (
            <View key={dayKey} style={styles.daySection}>
              <Text style={styles.dayHeading}>{formatDayHeading(dayKey, timeZone)}</Text>
              {shifts.map((shift) => (
                <Card key={shift.id} style={styles.shiftCard}>
                  <View style={styles.shiftHeader}>
                    <View style={styles.shiftTitleBlock}>
                      <Text style={styles.shiftName}>{shift.name}</Text>
                      <Text style={styles.shiftTime}>
                        {formatTime(shift.startTime, timeZone)} – {formatTime(shift.endTime, timeZone)}
                        {shift.area ? ` · ${shift.area}` : ''}
                      </Text>
                    </View>
                    {shift.status !== 'scheduled' ? (
                      <Badge label={shift.status} tone={shift.status === 'open' ? 'warning' : 'neutral'} />
                    ) : null}
                  </View>

                  <View style={styles.staffRow}>
                    <Users size={14} color={theme.colors.textMuted} />
                    {shift.staff.length === 0 ? (
                      <Text style={styles.unstaffed}>Nobody assigned</Text>
                    ) : (
                      <Text style={styles.staffNames}>
                        {shift.staff.map((member) => (member.isLeader ? `${member.name} (lead)` : member.name)).join(', ')}
                      </Text>
                    )}
                  </View>
                </Card>
              ))}
            </View>
          ))
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.background },
  header: { paddingHorizontal: theme.spacing.md, paddingTop: theme.spacing.md },
  title: { ...theme.typography.title, color: theme.colors.textPrimary },

  rangeRow: { flexDirection: 'row', gap: theme.spacing.sm, padding: theme.spacing.md, paddingBottom: theme.spacing.sm },
  rangeChip: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: theme.minTapTarget,
    borderRadius: theme.radius.full,
    borderWidth: 1,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.surface,
  },
  rangeChipOn: { backgroundColor: theme.colors.primary, borderColor: theme.colors.primary },
  rangeChipText: { ...theme.typography.label, color: theme.colors.textSecondary },
  rangeChipTextOn: { color: theme.colors.primaryText },
  pressed: { opacity: 0.7 },

  pager: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: theme.spacing.md,
    paddingBottom: theme.spacing.sm,
  },
  pagerButton: {
    width: theme.minTapTarget,
    height: theme.minTapTarget,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pagerLabelWrap: { flex: 1, alignItems: 'center', justifyContent: 'center', minHeight: theme.minTapTarget },
  pagerLabel: { ...theme.typography.label, color: theme.colors.textPrimary, textAlign: 'center' },

  content: { paddingHorizontal: theme.spacing.md, paddingBottom: theme.spacing.lg },
  status: { ...theme.typography.body, color: theme.colors.textSecondary, padding: theme.spacing.md },
  errorText: { ...theme.typography.body, color: theme.colors.danger, padding: theme.spacing.md },

  daySection: { marginBottom: theme.spacing.md },
  dayHeading: {
    ...theme.typography.overline,
    color: theme.colors.textMuted,
    marginBottom: theme.spacing.xs,
  },
  shiftCard: { marginBottom: theme.spacing.sm, gap: theme.spacing.sm },
  shiftHeader: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: theme.spacing.sm },
  shiftTitleBlock: { flexShrink: 1, gap: 2 },
  shiftName: { ...theme.typography.body, color: theme.colors.textPrimary, fontFamily: fontFamilies.sansSemiBold },
  shiftTime: { ...theme.typography.caption, color: theme.colors.textSecondary },
  staffRow: { flexDirection: 'row', alignItems: 'flex-start', gap: theme.spacing.xs },
  staffNames: { ...theme.typography.caption, color: theme.colors.textPrimary, flexShrink: 1 },
  unstaffed: { ...theme.typography.caption, color: theme.colors.warning },
});
