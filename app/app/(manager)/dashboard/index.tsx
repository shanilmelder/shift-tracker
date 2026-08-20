import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { theme, Card } from '../../../src/components';
import { apiRequest } from '../../../src/api/client';

interface DashboardData {
  todaysShiftCount: number;
  todaysUnfilledCount: number;
  openUnfilledShiftCount: number;
  pendingSwapApprovalCount: number;
  pendingTimeOffApprovalCount: number;
}

/** FR-025/SC-008: one screen, one call — no cross-referencing other screens needed. */
export default function DashboardScreen(): React.JSX.Element {
  const { data, isLoading } = useQuery({ queryKey: ['dashboard'], queryFn: () => apiRequest<DashboardData>('/dashboard') });

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Dashboard</Text>
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
    </View>
  );
}

function StatCard({ label, value, tone }: { label: string; value: number; tone?: 'warning' }): React.JSX.Element {
  return (
    <Card style={styles.statCard}>
      <Text style={[styles.statValue, tone === 'warning' && value > 0 ? styles.statValueWarning : null]}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </Card>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
    padding: theme.spacing.md,
  },
  title: {
    ...theme.typography.title,
    color: theme.colors.textPrimary,
    marginBottom: theme.spacing.md,
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
  },
  statValue: {
    ...theme.typography.title,
    color: theme.colors.textPrimary,
  },
  statValueWarning: {
    color: theme.colors.warning,
  },
  statLabel: {
    ...theme.typography.caption,
    color: theme.colors.textSecondary,
  },
});
