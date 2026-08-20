import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { theme, Card } from '../../../src/components';
import { getMyTimesheet } from '../../../src/api/time-entries.api';

/** FR-020: hours worked per pay period, split into regular vs. overtime (fixed 8h/day threshold). */
export default function TimesheetScreen(): React.JSX.Element {
  const { data, isLoading, isError } = useQuery({
    queryKey: ['timesheet', 'mine'],
    queryFn: () => getMyTimesheet(),
  });

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Timesheet</Text>
      {isLoading ? (
        <Text style={styles.status}>Loading…</Text>
      ) : isError || !data ? (
        <Text style={styles.status}>Couldn't load your timesheet — showing the last saved version, if any.</Text>
      ) : (
        <Card>
          <Row label="Regular hours" value={data.totalRegularHours.toFixed(2)} />
          <Row label="Overtime hours" value={data.totalOvertimeHours.toFixed(2)} />
        </Card>
      )}
    </View>
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
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: theme.spacing.xs,
  },
  rowLabel: {
    ...theme.typography.body,
    color: theme.colors.textSecondary,
  },
  rowValue: {
    ...theme.typography.heading,
    color: theme.colors.textPrimary,
  },
});
