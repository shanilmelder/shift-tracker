import React, { useState } from 'react';
import { View, Text, FlatList, StyleSheet } from 'react-native';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { theme, Button, TextField, ListRow, EmptyState, ConfirmDialog, SwipeToDelete } from '../../../src/components';
import { apiRequest } from '../../../src/api/client';
import { usePullToRefresh } from '../../../src/hooks';

interface ShiftArea {
  id: string;
  name: string;
}

/**
 * FR-032/FR-033: manager-only. This screen exists ONLY under the (manager) route group — no
 * employee route links here or reaches it, and the API's own `requireManager` gate backs that
 * up server-side regardless of what any client route structure does.
 */
export default function ShiftAreasScreen(): React.JSX.Element {
  const queryClient = useQueryClient();
  const [newName, setNewName] = useState('');
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);

  const { data: areas, isLoading, refetch } = useQuery({ queryKey: ['shift-areas'], queryFn: () => apiRequest<ShiftArea[]>('/shift-areas') });
  const refreshControl = usePullToRefresh({ refetch });

  const createMutation = useMutation({
    mutationFn: (name: string) => apiRequest<ShiftArea>('/shift-areas', { method: 'POST', body: { name } }),
    onSuccess: () => {
      setNewName('');
      void queryClient.invalidateQueries({ queryKey: ['shift-areas'] });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => apiRequest<void>(`/shift-areas/${id}`, { method: 'DELETE' }),
    onSuccess: () => {
      setPendingDeleteId(null);
      void queryClient.invalidateQueries({ queryKey: ['shift-areas'] });
    },
  });

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Shift areas</Text>
      <Text style={styles.hint}>e.g. Floor, Till, Stockroom — selectable when creating or staffing a shift.</Text>

      <View style={styles.newRow}>
        <TextField label="New area name" value={newName} onChangeText={setNewName} />
        <Button label="Add" onPress={() => createMutation.mutate(newName)} disabled={!newName.trim() || createMutation.isPending} />
      </View>

      {isLoading ? (
        <Text style={styles.status}>Loading…</Text>
      ) : !areas || areas.length === 0 ? (
        <EmptyState refreshControl={refreshControl} title="No areas yet" />
      ) : (
        <FlatList
          refreshControl={refreshControl}
          data={areas}
          keyExtractor={(area) => area.id}
          renderItem={({ item }) => (
            <SwipeToDelete label="Remove" onDelete={() => setPendingDeleteId(item.id)} accessibilityLabel={item.name}>
              <ListRow title={item.name} />
            </SwipeToDelete>
          )}
        />
      )}

      <ConfirmDialog
        visible={pendingDeleteId !== null}
        title="Remove this area?"
        message="Shifts already tagged with this area keep it until reassigned; removal is blocked while any shift still uses it."
        confirmLabel="Remove"
        destructive
        onConfirm={() => {
          if (pendingDeleteId) deleteMutation.mutate(pendingDeleteId);
          setPendingDeleteId(null);
        }}
        onCancel={() => setPendingDeleteId(null)}
      />
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
  newRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: theme.spacing.sm,
  },
  status: {
    ...theme.typography.body,
    color: theme.colors.textSecondary,
  },
});
