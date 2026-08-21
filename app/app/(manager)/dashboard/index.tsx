import React from 'react';
import { View, Text, Pressable, ScrollView, StyleSheet } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { theme, Card } from '../../../src/components';
import { apiRequest } from '../../../src/api/client';
import { getMyLocation } from '../../../src/api/locations.api';
import { usePullToRefresh } from '../../../src/hooks';

interface NeedsYouItem {
  id: string;
  kind: 'time_off' | 'clock_exception' | 'unstaffed_shift';
  title: string;
  subtitle: string;
  cta: 'Review' | 'Post';
}

interface DayCoverage {
  date: string;
  dayLabel: string;
  totalShifts: number;
  staffedShifts: number;
  coveragePct: number;
}

interface DashboardData {
  todaysShiftCount: number;
  todaysUnfilledCount: number;
  openUnfilledShiftCount: number;
  pendingSwapApprovalCount: number;
  pendingTimeOffApprovalCount: number;
  needsYou: NeedsYouItem[];
  coverageByDay: DayCoverage[];
}

const COVERAGE_CHART_HEIGHT = 80;

/** Where tapping a "Needs you" row goes — the closest existing screen for that kind of item;
 * none of these needed a brand-new screen built just for this list. */
function needsYouHref(item: NeedsYouItem): string {
  switch (item.kind) {
    case 'time_off':
      return '/(manager)/approvals/time-off';
    case 'clock_exception':
      return '/(manager)/reports/attendance';
    case 'unstaffed_shift':
      return `/(manager)/schedule/${item.id}/staff`;
  }
}

const TODAY_LABEL = new Date()
  .toLocaleDateString('en-US', { weekday: 'short', day: '2-digit', month: 'short', year: 'numeric' })
  .toUpperCase();

/** FR-025/SC-008: one screen, one call — no cross-referencing other screens needed. */
export default function DashboardScreen(): React.JSX.Element {
  const router = useRouter();
  const { data, isLoading, refetch: refetchDashboard } = useQuery({ queryKey: ['dashboard'], queryFn: () => apiRequest<DashboardData>('/dashboard') });
  const { data: location, refetch: refetchLocation } = useQuery({ queryKey: ['locations', 'mine'], queryFn: getMyLocation });
  const refreshControl = usePullToRefresh({ refetch: refetchDashboard }, { refetch: refetchLocation });

  return (
    <ScrollView refreshControl={refreshControl} style={styles.container} contentContainerStyle={styles.contentContainer}>
      <View style={styles.header}>
        <View>
          <Text style={styles.dateLabel}>{TODAY_LABEL}</Text>
          <Text style={styles.title}>Overview</Text>
        </View>
        {location ? (
          <View style={styles.locationPill}>
            <Text style={styles.locationPillText}>{location.name}</Text>
          </View>
        ) : null}
      </View>

      {isLoading || !data ? (
        <Text style={styles.status}>Loading…</Text>
      ) : (
        <View style={styles.grid}>
          <StatCard label="Today's shifts" value={data.todaysShiftCount} />
          <StatCard label="Unfilled today" value={data.todaysUnfilledCount} tone="warning" />
          <StatCard label="Open shift board" value={data.openUnfilledShiftCount} />
          <StatCard label="Pending swaps" value={data.pendingSwapApprovalCount} tone="warning" />
          <StatCard label="Pending time off" value={data.pendingTimeOffApprovalCount} tone="warning" />
        </View>
      )}

      {data ? (
        <Card style={styles.coverageCard}>
          <Text style={styles.statLabel}>Coverage this week</Text>
          <View style={styles.coverageBars}>
            {data.coverageByDay.map((day) => (
              <View key={day.date} style={styles.coverageBarTrack}>
                <View
                  style={[
                    styles.coverageBar,
                    {
                      height: Math.max(4, (COVERAGE_CHART_HEIGHT * day.coveragePct) / 100),
                      backgroundColor: day.totalShifts === 0 || day.coveragePct === 100 ? theme.colors.chartPositive : theme.colors.chartNegative,
                    },
                  ]}
                />
              </View>
            ))}
          </View>
          <View style={styles.coverageDayLabels}>
            {data.coverageByDay.map((day) => (
              <Text key={day.date} style={styles.coverageDayLabel}>
                {day.dayLabel}
              </Text>
            ))}
          </View>
        </Card>
      ) : null}

      {data && data.needsYou.length > 0 ? (
        <Card style={styles.needsYouCard}>
          <Text style={styles.statLabel}>Needs you</Text>
          {data.needsYou.map((item) => (
            <Pressable
              key={item.id}
              onPress={() => router.push(needsYouHref(item) as never)}
              accessibilityRole="button"
              accessibilityLabel={`${item.title}, ${item.subtitle}`}
              style={({ pressed }) => [styles.needsYouRow, pressed ? styles.needsYouRowPressed : null]}
            >
              <View style={styles.needsYouTextBlock}>
                <Text style={styles.needsYouTitle}>{item.title}</Text>
                <Text style={styles.needsYouSubtitle}>{item.subtitle}</Text>
              </View>
              <View style={styles.needsYouCtaPill}>
                <Text style={styles.needsYouCtaText}>{item.cta}</Text>
              </View>
            </Pressable>
          ))}
        </Card>
      ) : null}
    </ScrollView>
  );
}

function StatCard({ label, value, tone }: { label: string; value: number; tone?: 'warning' }): React.JSX.Element {
  return (
    <Card style={styles.statCard}>
      <Text style={styles.statLabel}>{label}</Text>
      <Text style={[styles.statValue, tone === 'warning' && value > 0 ? styles.statValueWarning : null]}>{value}</Text>
    </Card>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  contentContainer: {
    padding: theme.spacing.md,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    marginBottom: theme.spacing.md,
  },
  dateLabel: {
    ...theme.typography.overline,
    color: theme.colors.textMuted,
    marginBottom: theme.spacing.xs,
  },
  title: {
    ...theme.typography.title,
    color: theme.colors.textPrimary,
  },
  locationPill: {
    borderWidth: 1,
    borderColor: theme.colors.primary,
    backgroundColor: theme.colors.accentSoft,
    borderRadius: theme.radius.full,
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: theme.spacing.xs,
  },
  locationPillText: {
    ...theme.typography.overline,
    color: theme.colors.primary,
    textTransform: 'none',
    letterSpacing: 0,
  },
  status: {
    ...theme.typography.body,
    color: theme.colors.textSecondary,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: theme.spacing.sm,
  },
  statCard: {
    minWidth: 140,
    flexGrow: 1,
    gap: theme.spacing.xs,
  },
  statLabel: {
    ...theme.typography.overline,
    color: theme.colors.textMuted,
  },
  statValue: {
    ...theme.typography.value,
    color: theme.colors.textPrimary,
  },
  statValueWarning: {
    color: theme.colors.warning,
  },
  coverageCard: {
    marginTop: theme.spacing.sm,
    gap: theme.spacing.sm,
  },
  coverageBars: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: theme.spacing.xs,
    height: COVERAGE_CHART_HEIGHT,
  },
  coverageBarTrack: {
    flex: 1,
    height: '100%',
    justifyContent: 'flex-end',
  },
  coverageBar: {
    width: '100%',
    borderRadius: 3,
  },
  coverageDayLabels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  coverageDayLabel: {
    ...theme.typography.caption,
    color: theme.colors.textMuted,
    flex: 1,
    textAlign: 'center',
  },
  needsYouCard: {
    marginTop: theme.spacing.sm,
    gap: theme.spacing.sm,
  },
  needsYouRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: theme.spacing.sm,
    minHeight: theme.minTapTarget,
  },
  needsYouRowPressed: {
    opacity: 0.6,
  },
  needsYouTextBlock: {
    flex: 1,
  },
  needsYouTitle: {
    ...theme.typography.body,
    color: theme.colors.textPrimary,
  },
  needsYouSubtitle: {
    ...theme.typography.caption,
    color: theme.colors.textSecondary,
    marginTop: 2,
  },
  needsYouCtaPill: {
    borderWidth: 1,
    borderColor: theme.colors.borderStrong,
    borderRadius: theme.radius.full,
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: theme.spacing.xs,
  },
  needsYouCtaText: {
    ...theme.typography.label,
    color: theme.colors.textPrimary,
  },
});
