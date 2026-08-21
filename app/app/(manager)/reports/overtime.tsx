import React from 'react';
import { View, Text, FlatList, StyleSheet } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { theme, ListRow, Card } from '../../../src/components';
import { apiRequest } from '../../../src/api/client';
import { usePullToRefresh } from '../../../src/hooks';

interface OvertimeResult {
  totalOvertimeHours: number;
  perEmployee: Array<{ employeeId: string; employeeName: string; totalOvertimeHours: number }>;
}

export default function OvertimeReport(): React.JSX.Element {
  const { data, isLoading, refetch } = useQuery({ queryKey: ['reports', 'overtime'], queryFn: () => apiRequest<OvertimeResult>('/reports/overtime') });
  const refreshControl = usePullToRefresh({ refetch });

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Overtime trend</Text>
      {isLoading || !data ? (
        <Text style={styles.status}>Loading…</Text>
      ) : (
        <>
          <Card style={styles.totalCard}>
            <Text style={styles.total}>{data.totalOvertimeHours.toFixed(1)}h total overtime</Text>
          </Card>
          <FlatList
            refreshControl={refreshControl}
            data={data.perEmployee}
            keyExtractor={(row) => row.employeeId}
            renderItem={({ item }) => <ListRow title={item.employeeName} subtitle={`${item.totalOvertimeHours.toFixed(1)}h overtime`} />}
          />
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.background },
  title: { ...theme.typography.title, color: theme.colors.textPrimary, padding: theme.spacing.md },
  status: { ...theme.typography.body, color: theme.colors.textSecondary, padding: theme.spacing.md },
  totalCard: { marginHorizontal: theme.spacing.md, marginBottom: theme.spacing.md },
  total: { ...theme.typography.heading, color: theme.colors.textPrimary },
});
