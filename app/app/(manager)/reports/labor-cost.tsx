import React, { useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { theme, TextField, Card } from '../../../src/components';
import { apiRequest } from '../../../src/api/client';

interface LaborCostResult {
  totalCost: number;
  budget: number;
  overBudget: boolean;
}

export default function LaborCostReport(): React.JSX.Element {
  const [budget, setBudget] = useState('0');
  const { data, isLoading } = useQuery({
    queryKey: ['reports', 'labor-cost', budget],
    queryFn: () => apiRequest<LaborCostResult>('/reports/labor-cost', { query: { budget } }),
  });

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Labor cost vs. budget</Text>
      <TextField label="Budget" keyboardType="numeric" value={budget} onChangeText={setBudget} />
      {isLoading || !data ? (
        <Text style={styles.status}>Loading…</Text>
      ) : (
        <Card>
          <Text style={styles.value}>${data.totalCost.toFixed(2)}</Text>
          <Text style={[styles.status, data.overBudget ? styles.over : null]}>
            {data.overBudget ? `Over budget of $${data.budget.toFixed(2)}` : `Under budget of $${data.budget.toFixed(2)}`}
          </Text>
        </Card>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.background, padding: theme.spacing.md },
  title: { ...theme.typography.title, color: theme.colors.textPrimary, marginBottom: theme.spacing.md },
  status: { ...theme.typography.body, color: theme.colors.textSecondary },
  value: { ...theme.typography.title, color: theme.colors.textPrimary },
  over: { color: theme.colors.danger },
});
