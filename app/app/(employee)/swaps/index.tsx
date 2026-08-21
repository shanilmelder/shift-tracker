import React from 'react';
import { View, Text, FlatList, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { theme, ListRow, Badge, Button, EmptyState } from '../../../src/components';
import { listMySwapRequests, respondToSwapRequest, type SwapRequest } from '../../../src/api/swap-requests.api';
import { usePullToRefresh } from '../../../src/hooks';

const STATUS_TONE = {
  pending: 'warning',
  coworker_accepted: 'warning',
  coworker_declined: 'danger',
  manager_approved: 'success',
  denied: 'danger',
} as const;

/** FR-017: an employee's sent/received swap requests, with status. */
export default function SwapsScreen(): React.JSX.Element {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { data: swaps, isLoading, refetch } = useQuery<SwapRequest[]>({ queryKey: ['swap-requests', 'mine'], queryFn: listMySwapRequests });
  const refreshControl = usePullToRefresh({ refetch });

  const respondMutation = useMutation({
    mutationFn: ({ id, accept }: { id: string; accept: boolean }) => respondToSwapRequest(id, accept),
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: ['swap-requests', 'mine'] }),
  });

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Shift swaps</Text>
        <Button label="Request a swap" onPress={() => router.push('/(employee)/schedule')} style={styles.newButton} />
      </View>

      {isLoading ? (
        <Text style={styles.status}>Loading…</Text>
      ) : !swaps || swaps.length === 0 ? (
        <EmptyState refreshControl={refreshControl} title="No swap requests" message="Requests you send or receive will show up here." />
      ) : (
        <FlatList<SwapRequest>
          refreshControl={refreshControl}
          data={swaps}
          keyExtractor={(swap) => swap.id}
          renderItem={({ item: swap }) => (
            <ListRow
              title={`Swap for shift ${swap.shift_id}`}
              subtitle={swap.status === 'pending' ? 'Awaiting your response' : undefined}
              right={
                swap.status === 'pending' ? (
                  <View style={styles.responseRow}>
                    <Button label="Decline" variant="secondary" onPress={() => respondMutation.mutate({ id: swap.id, accept: false })} style={styles.responseButton} />
                    <Button label="Accept" onPress={() => respondMutation.mutate({ id: swap.id, accept: true })} style={styles.responseButton} />
                  </View>
                ) : (
                  <Badge label={swap.status} tone={STATUS_TONE[swap.status]} />
                )
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
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: theme.spacing.md,
  },
  title: {
    ...theme.typography.title,
    color: theme.colors.textPrimary,
  },
  newButton: {
    minWidth: 150,
  },
  status: {
    ...theme.typography.body,
    color: theme.colors.textSecondary,
    padding: theme.spacing.md,
  },
  responseRow: {
    flexDirection: 'row',
    gap: theme.spacing.xs,
  },
  responseButton: {
    minWidth: 80,
  },
});
