import React from 'react';
import { View, Text, FlatList, StyleSheet } from 'react-native';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { theme, ListRow, Button, EmptyState } from '../../../src/components';
import * as openShiftsApi from '../../../src/api/open-shifts.api';
import { usePullToRefresh } from '../../../src/hooks';

/** FR-029/FR-044: the open shift board — claiming does not confirm the shift, it's provisional. */
export default function OpenShiftsScreen(): React.JSX.Element {
  const queryClient = useQueryClient();
  const { data: shifts, isLoading, refetch } = useQuery({ queryKey: ['open-shifts'], queryFn: openShiftsApi.listOpenShifts });
  const refreshControl = usePullToRefresh({ refetch });

  const claimMutation = useMutation({
    mutationFn: openShiftsApi.claimOpenShift,
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: ['open-shifts'] }),
  });

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Open shifts</Text>

      {isLoading ? (
        <Text style={styles.status}>Loading…</Text>
      ) : !shifts || shifts.length === 0 ? (
        <EmptyState refreshControl={refreshControl} title="No open shifts" message="There are no unfilled shifts you're eligible for right now." />
      ) : (
        <FlatList
          refreshControl={refreshControl}
          data={shifts}
          keyExtractor={(shift) => shift.id}
          renderItem={({ item: shift }) => (
            <ListRow
              title={shift.name}
              subtitle={`${new Date(shift.start_time).toLocaleString()} – ${new Date(shift.end_time).toLocaleTimeString()}`}
              right={
                <Button
                  label={claimMutation.isPending ? 'Claiming…' : 'Claim'}
                  onPress={() => claimMutation.mutate(shift.id)}
                  disabled={claimMutation.isPending}
                />
              }
            />
          )}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  title: {
    ...theme.typography.title,
    color: theme.colors.textPrimary,
    padding: theme.spacing.md,
  },
  status: {
    ...theme.typography.body,
    color: theme.colors.textSecondary,
    padding: theme.spacing.md,
  },
});
