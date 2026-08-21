import React from 'react';
import { Text, ScrollView, StyleSheet } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { theme, Card } from '../../../src/components';
import { apiRequest } from '../../../src/api/client';
import { usePullToRefresh } from '../../../src/hooks';

interface AttendanceResult {
  attended: number;
  noShows: number;
  totalScheduled: number;
}

export default function AttendanceReport(): React.JSX.Element {
  const { data, isLoading, refetch } = useQuery({ queryKey: ['reports', 'attendance'], queryFn: () => apiRequest<AttendanceResult>('/reports/attendance') });
  const refreshControl = usePullToRefresh({ refetch });

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content} refreshControl={refreshControl}>
      <Text style={styles.title}>Attendance / no-show trend</Text>
      {isLoading || !data ? (
        <Text style={styles.status}>Loading…</Text>
      ) : (
        <Card>
          <Text style={styles.row}>Scheduled: {data.totalScheduled}</Text>
          <Text style={styles.row}>Attended: {data.attended}</Text>
          <Text style={[styles.row, data.noShows > 0 ? styles.warning : null]}>No-shows: {data.noShows}</Text>
        </Card>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.background },
  content: { padding: theme.spacing.md },
  title: { ...theme.typography.title, color: theme.colors.textPrimary, marginBottom: theme.spacing.md },
  status: { ...theme.typography.body, color: theme.colors.textSecondary },
  row: { ...theme.typography.body, color: theme.colors.textPrimary, marginBottom: theme.spacing.xs },
  warning: { color: theme.colors.warning },
});
