import React from 'react';
import { View, Text, FlatList, StyleSheet } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { theme, ListRow } from '../../../src/components';
import { apiRequest } from '../../../src/api/client';

interface HoursRow {
  employeeId: string;
  employeeName: string;
  totalRegularHours: number;
  totalOvertimeHours: number;
}

export default function HoursByEmployeeReport(): React.JSX.Element {
  const { data, isLoading } = useQuery({ queryKey: ['reports', 'hours-by-employee'], queryFn: () => apiRequest<HoursRow[]>('/reports/hours-by-employee') });

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Hours by employee</Text>
      {isLoading ? (
        <Text style={styles.status}>Loading…</Text>
      ) : (
        <FlatList
          data={data ?? []}
          keyExtractor={(row) => row.employeeId}
          renderItem={({ item }) => (
            <ListRow title={item.employeeName} subtitle={`Regular: ${item.totalRegularHours.toFixed(1)}h · Overtime: ${item.totalOvertimeHours.toFixed(1)}h`} />
          )}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.background },
  title: { ...theme.typography.title, color: theme.colors.textPrimary, padding: theme.spacing.md },
  status: { ...theme.typography.body, color: theme.colors.textSecondary, padding: theme.spacing.md },
});
