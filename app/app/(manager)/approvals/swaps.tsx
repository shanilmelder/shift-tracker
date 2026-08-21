import React from 'react';
import { View, Text, FlatList, StyleSheet } from 'react-native';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { theme, ListRow, Button, EmptyState } from '../../../src/components';
import { apiRequest } from '../../../src/api/client';
import { decideSwapRequest, type SwapRequest } from '../../../src/api/swap-requests.api';
import { usePullToRefresh } from '../../../src/hooks';

/**
 * Manager approvals queue for swap requests (FR-030). Note this same decide action is
 * available to a shift's designated leader too — not on a separate manager-only screen, but
 * via the shift's own detail view once a leader-facing swap-decide UI is added there; this
 * screen itself is manager-scoped (route group guard in (manager)/_layout.tsx already
 * enforces that).
 */
export default function SwapApprovalsScreen(): React.JSX.Element {
  const queryClient = useQueryClient();

  const { data: pendingSwaps, isLoading, refetch } = useQuery({
    queryKey: ['swap-requests', 'pending-approval'],
    // Manager-visible pending-approval swaps: those already accepted by the coworker.
    queryFn: () => apiRequest<SwapRequest[]>('/swap-requests').then((all) => all.filter((s) => s.status === 'coworker_accepted')),
  });
  const refreshControl = usePullToRefresh({ refetch });

  // NOTE: an optional manager comment (FR-030) isn't collected in this UI yet — decide() is
  // called with no comment. Tracked as a Phase 12 polish item, not a missing capability: the
  // API already accepts one (see swap-requests.api.ts's decideSwapRequest signature).
  const decideMutation = useMutation({
    mutationFn: ({ id, approve }: { id: string; approve: boolean }) => decideSwapRequest(id, approve),
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: ['swap-requests', 'pending-approval'] }),
  });

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Swap approvals</Text>

      {isLoading ? (
        <Text style={styles.status}>Loading…</Text>
      ) : !pendingSwaps || pendingSwaps.length === 0 ? (
        <EmptyState refreshControl={refreshControl} title="Nothing pending" message="No swap requests are waiting on your decision." />
      ) : (
        <FlatList
          refreshControl={refreshControl}
          data={pendingSwaps}
          keyExtractor={(swap) => swap.id}
          renderItem={({ item: swap }) => (
            <ListRow
              title={`Swap for shift ${swap.shift_id}`}
              subtitle="Coworker accepted — awaiting final approval"
              right={
                <View style={styles.actions}>
                  <Button label="Deny" variant="secondary" onPress={() => decideMutation.mutate({ id: swap.id, approve: false })} style={styles.actionButton} />
                  <Button label="Approve" onPress={() => decideMutation.mutate({ id: swap.id, approve: true })} style={styles.actionButton} />
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
