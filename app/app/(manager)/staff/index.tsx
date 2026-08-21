import React, { useState } from 'react';
import { View, Text, ScrollView, Pressable, StyleSheet } from 'react-native';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { theme, Card, Badge, Button, EmptyState, SwipeToDelete, ConfirmDialog } from '../../../src/components';
import { listStaff, deleteStaffMember, type StaffListEntry } from '../../../src/api/admin-users.api';
import { ApiError } from '../../../src/types/api/common';
import { usePullToRefresh } from '../../../src/hooks';

/** Manager "Team" tab: everyone at the manager's location (doc/design's Prototype.dc.html). */
export default function StaffListScreen(): React.JSX.Element {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { data: staff, isLoading, refetch } = useQuery({ queryKey: ['admin-users', 'list'], queryFn: listStaff });
  const refreshControl = usePullToRefresh({ refetch });

  const [pendingDelete, setPendingDelete] = useState<StaffListEntry | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const deleteMutation = useMutation({
    mutationFn: deleteStaffMember,
    onSuccess: () => {
      setDeleteError(null);
      void queryClient.invalidateQueries({ queryKey: ['admin-users'] });
    },
    // Refused (409) for anyone with shifts, timesheets or requests on record — the message
    // names what is blocking it and points at deactivating instead.
    onError: (err) => setDeleteError(err instanceof ApiError ? err.message : 'Could not delete this person. Please try again.'),
  });

  return (
    <ScrollView refreshControl={refreshControl} style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.header}>
        <Text style={styles.title}>Team</Text>
        <Button label="Add" onPress={() => router.push('/(manager)/staff/new')} />
      </View>

      {isLoading ? (
        <Text style={styles.status}>Loading…</Text>
      ) : !staff || staff.length === 0 ? (
        <EmptyState title="No staff yet" message="Add your first team member to get started." />
      ) : (
        staff.map((member) => (
          <SwipeToDelete key={member.id} onDelete={() => setPendingDelete(member)} accessibilityLabel={member.name}>
            <Pressable
              onPress={() => router.push(`/(manager)/staff/${member.id}/edit`)}
              accessibilityRole="button"
              accessibilityLabel={`${member.name}, ${member.role === 'manager' ? 'Manager' : (member.job_role ?? 'Employee')}`}
            >
              <Card style={styles.row}>
                <View style={styles.textBlock}>
                  <Text style={styles.name}>{member.name}</Text>
                  <Text style={styles.subtitle}>{member.role === 'manager' ? 'Manager' : (member.job_role ?? 'Employee')}</Text>
                </View>
                <Badge
                  label={!member.is_active ? 'Deactivated' : member.invite_status === 'pending' ? 'Invited' : 'Active'}
                  tone={!member.is_active ? 'danger' : member.invite_status === 'pending' ? 'warning' : 'success'}
                />
              </Card>
            </Pressable>
          </SwipeToDelete>
        ))
      )}

      {deleteError ? <Text style={styles.error}>{deleteError}</Text> : null}

      <ConfirmDialog
        visible={pendingDelete !== null}
        destructive
        title="Delete this person?"
        message={
          pendingDelete === null
            ? ''
            : `"${pendingDelete.name}" and their sign-in will be permanently removed. This can't be undone. If they have any history in the system, the delete will be refused and you'll be asked to deactivate them instead.`
        }
        confirmLabel="Delete"
        onConfirm={() => {
          if (pendingDelete) deleteMutation.mutate(pendingDelete.id);
          setPendingDelete(null);
        }}
        onCancel={() => setPendingDelete(null)}
      />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.background },
  content: { padding: theme.spacing.md, gap: theme.spacing.sm },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: theme.spacing.xs },
  title: { ...theme.typography.title, color: theme.colors.textPrimary },
  status: { ...theme.typography.body, color: theme.colors.textSecondary },
  error: { ...theme.typography.body, color: theme.colors.danger },
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  textBlock: { flexShrink: 1 },
  name: { ...theme.typography.body, color: theme.colors.textPrimary },
  subtitle: { ...theme.typography.caption, color: theme.colors.textSecondary, marginTop: 2 },
});
