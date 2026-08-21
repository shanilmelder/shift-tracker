import React from 'react';
import { View, Text, FlatList, StyleSheet } from 'react-native';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { theme, ListRow, Button, EmptyState } from '../../../src/components';
import * as timeOffApi from '../../../src/api/time-off-requests.api';
import { usePullToRefresh } from '../../../src/hooks';

/** FR-030: manager reviews time-off requests, approve/deny (optional comment: see Phase 7's tracked polish note — same gap applies here). */
export default function TimeOffApprovalsScreen(): React.JSX.Element {
  const queryClient = useQueryClient();
  const { data: requests, isLoading, refetch } = useQuery({
    queryKey: ['time-off-requests', 'pending-approval'],
    queryFn: () => timeOffApi.listPendingTimeOffRequests().then((all) => all.filter((r) => r.status === 'pending')),
  });
  const refreshControl = usePullToRefresh({ refetch });

  const decideMutation = useMutation({
    mutationFn: ({ id, approve }: { id: string; approve: boolean }) => timeOffApi.decideTimeOffRequest(id, approve),
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: ['time-off-requests', 'pending-approval'] }),
  });

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Time-off approvals</Text>

      {isLoading ? (
        <Text style={styles.status}>Loading…</Text>
      ) : !requests || requests.length === 0 ? (
        <EmptyState refreshControl={refreshControl} title="Nothing pending" />
      ) : (
        <FlatList
          refreshControl={refreshControl}
          data={requests}
          keyExtractor={(r) => r.id}
          renderItem={({ item }) => (
            <ListRow
              title={`${item.start_date} – ${item.end_date}`}
              subtitle={item.reason}
              right={
                <View style={styles.actions}>
                  <Button label="Deny" variant="secondary" onPress={() => decideMutation.mutate({ id: item.id, approve: false })} style={styles.actionButton} />
                  <Button label="Approve" onPress={() => decideMutation.mutate({ id: item.id, approve: true })} style={styles.actionButton} />
                </View>
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
  actions: {
    flexDirection: 'row',
    gap: theme.spacing.xs,
  },
  actionButton: {
    minWidth: 80,
  },
});
