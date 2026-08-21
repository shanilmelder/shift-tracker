import React from 'react';
import { View, Text, FlatList, StyleSheet } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { theme, ListRow, Button, EmptyState } from '../../../../src/components';
import * as openShiftsApi from '../../../../src/api/open-shifts.api';
import { usePullToRefresh } from '../../../../src/hooks';

/**
 * FR-046: shows ALL claimants with no ordering that implies priority — the manager may
 * confirm whichever one they choose, not necessarily the first to claim.
 */
export default function OpenShiftClaimsScreen(): React.JSX.Element {
  const { shiftId } = useLocalSearchParams<{ shiftId: string }>();
  const queryClient = useQueryClient();

  const { data: claims, isLoading, refetch } = useQuery({
    queryKey: ['open-shift-claims', shiftId],
    queryFn: () => openShiftsApi.listShiftClaims(shiftId),
  });
  const refreshControl = usePullToRefresh({ refetch });

  const confirmMutation = useMutation({
    mutationFn: (claimId: string) => openShiftsApi.confirmClaim(shiftId, claimId),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['open-shift-claims', shiftId] });
      void queryClient.invalidateQueries({ queryKey: ['shifts', 'list'] });
    },
  });

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Claimants</Text>
      <Text style={styles.hint}>Choose whichever claimant you'd like — order shown carries no priority.</Text>

      {isLoading ? (
        <Text style={styles.status}>Loading…</Text>
      ) : !claims || claims.length === 0 ? (
        <EmptyState refreshControl={refreshControl} title="No claims yet" />
      ) : (
        <FlatList
          refreshControl={refreshControl}
          data={claims}
          keyExtractor={(claim) => claim.id}
          renderItem={({ item: claim }) => (
            <ListRow
              title={claim.employee_id}
              right={
                <Button
                  label={confirmMutation.isPending ? 'Confirming…' : 'Confirm'}
                  onPress={() => confirmMutation.mutate(claim.id)}
                  disabled={confirmMutation.isPending}
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
    padding: theme.spacing.md,
  },
  title: {
    ...theme.typography.title,
    color: theme.colors.textPrimary,
  },
  hint: {
    ...theme.typography.caption,
    color: theme.colors.textSecondary,
    marginBottom: theme.spacing.md,
  },
  status: {
    ...theme.typography.body,
    color: theme.colors.textSecondary,
  },
});
