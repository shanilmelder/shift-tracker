import React, { useMemo, useState } from 'react';
import { View, Text, FlatList, StyleSheet } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { theme, Button, ListRow, Badge, EmptyState } from '../../../../src/components';
import { apiRequest } from '../../../../src/api/client';
import { listAssignments, replaceStaffing, type StaffingConflictDetail } from '../../../../src/api/shift-assignments.api';
import { ApiError } from '../../../../src/types/api/common';

interface StaffMemberSummary {
  id: string;
  name: string;
  role: 'employee' | 'manager';
}

/**
 * Step 2 of the two-step schedule builder (FR-026/FR-027): a route entirely separate from
 * shift creation, reachable at any later point, for assigning one shift leader and any number
 * of shift workers. This screen is also where a designated shift leader lands when they open
 * "their" shift's staffing (FR-009) — the API enforces who may write here; this screen doesn't
 * need its own role branching beyond what it already does for a manager.
 */
export default function StaffShiftScreen(): React.JSX.Element {
  const { shiftId } = useLocalSearchParams<{ shiftId: string }>();
  const queryClient = useQueryClient();
  const [selected, setSelected] = useState<Map<string, boolean>>(new Map());
  const [conflicts, setConflicts] = useState<StaffingConflictDetail[] | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const { data: staff } = useQuery({
    queryKey: ['admin-users', 'list'],
    queryFn: () => apiRequest<StaffMemberSummary[]>('/admin/users'),
  });

  const { data: assignments, isLoading } = useQuery({
    queryKey: ['shift-assignments', shiftId],
    queryFn: () => listAssignments(shiftId),
    enabled: Boolean(shiftId),
  });

  const initialized = useMemo(() => {
    if (!assignments) return null;
    const map = new Map<string, boolean>();
    for (const a of assignments) map.set(a.employee_id, a.is_leader);
    return map;
  }, [assignments]);

  const current = selected.size > 0 || initialized === null ? selected : initialized;

  const saveMutation = useMutation({
    mutationFn: () =>
      replaceStaffing(
        shiftId,
        Array.from(current.entries()).map(([employeeId, isLeader]) => ({ employeeId, isLeader })),
      ),
    onSuccess: () => {
      setConflicts(null);
      setSubmitError(null);
      void queryClient.invalidateQueries({ queryKey: ['shift-assignments', shiftId] });
      void queryClient.invalidateQueries({ queryKey: ['shifts', 'detail', shiftId] });
    },
    onError: (err) => {
      if (err instanceof ApiError && err.code === 'STAFFING_CONFLICT') {
        setConflicts((err.details?.conflicts as StaffingConflictDetail[]) ?? []);
      } else {
        setSubmitError(err instanceof ApiError ? err.message : 'Could not save staffing. Please try again.');
      }
    },
  });

  function toggleWorker(employeeId: string): void {
    const next = new Map(current);
    if (next.has(employeeId)) next.delete(employeeId);
    else next.set(employeeId, false);
    setSelected(next);
  }

  function setLeader(employeeId: string): void {
    const next = new Map(current);
    for (const key of next.keys()) next.set(key, key === employeeId);
    if (!next.has(employeeId)) next.set(employeeId, true);
    setSelected(next);
  }

  if (isLoading) {
    return (
      <View style={styles.container}>
        <Text style={styles.status}>Loading staffing…</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Staff this shift</Text>
      <Text style={styles.hint}>Pick workers, and at most one shift leader. Conflicts are checked before saving.</Text>

      {conflicts && conflicts.length > 0 ? (
        <View style={styles.conflictBanner}>
          <Text style={styles.conflictTitle}>Can't save — scheduling conflicts found:</Text>
          {conflicts.map((c, i) => (
            <Text key={i} style={styles.conflictLine}>
              {c.employeeId}: {c.conflict.type}
            </Text>
          ))}
        </View>
      ) : null}
      {submitError ? <Text style={styles.conflictTitle}>{submitError}</Text> : null}

      {!staff || staff.length === 0 ? (
        <EmptyState title="No staff yet" message="Add staff members before staffing a shift." />
      ) : (
        <FlatList
          data={staff}
          keyExtractor={(member) => member.id}
          renderItem={({ item }) => {
            const isSelected = current.has(item.id);
            const isLeader = current.get(item.id) === true;
            return (
              // NOTE: no `onPress` on this row — the "Add"/"Remove" and "Make leader" buttons
              // in `right` are themselves interactive, and nesting a tappable row around
              // other tappable elements is an accessibility anti-pattern (ambiguous
              // touch/focus handling for screen readers). Each action is its own explicit
              // control instead.
              <ListRow
                title={item.name}
                subtitle={isLeader ? 'Shift leader' : isSelected ? 'Shift worker' : undefined}
                right={
                  <View style={styles.rowActions}>
                    {isSelected ? <Badge label={isLeader ? 'Leader' : 'Worker'} tone={isLeader ? 'success' : 'neutral'} /> : null}
                    <Button
                      label={isSelected ? 'Remove' : 'Add'}
                      variant={isSelected ? 'danger' : 'secondary'}
                      onPress={() => toggleWorker(item.id)}
                      style={styles.leaderButton}
                    />
                    {isSelected ? (
                      <Button label="Make leader" variant="secondary" onPress={() => setLeader(item.id)} style={styles.leaderButton} />
                    ) : null}
                  </View>
                }
              />
            );
          }}
        />
      )}

      <Button
        label={saveMutation.isPending ? 'Saving…' : 'Save staffing'}
        onPress={() => saveMutation.mutate()}
        disabled={saveMutation.isPending}
        style={styles.saveButton}
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
  status: {
    ...theme.typography.body,
    color: theme.colors.textSecondary,
    padding: theme.spacing.md,
  },
  conflictBanner: {
    backgroundColor: theme.colors.surface,
    borderColor: theme.colors.danger,
    borderWidth: 1,
    borderRadius: 8,
    padding: theme.spacing.sm,
    marginBottom: theme.spacing.md,
  },
  conflictTitle: {
    ...theme.typography.body,
    color: theme.colors.danger,
    fontWeight: '600',
  },
  conflictLine: {
    ...theme.typography.caption,
    color: theme.colors.danger,
  },
  rowActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.xs,
  },
  leaderButton: {
    minHeight: 36,
  },
  saveButton: {
    marginTop: theme.spacing.md,
  },
});
