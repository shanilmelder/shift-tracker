import React, { useEffect, useState } from 'react';
import { View, Text, ScrollView, Pressable, StyleSheet } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { theme, Button, TextField, Badge, ConfirmDialog } from '../../../../src/components';
import { getStaffMember, updateStaffMember, setStaffActive, deleteStaffMember } from '../../../../src/api/admin-users.api';
import { usePullToRefresh } from '../../../../src/hooks';
import { ApiError } from '../../../../src/types/api/common';

/**
 * Manager-side edit of one staff member's profile (FR-005): the fields a manager owns —
 * name, contact, job role, pay, and the employee/manager role itself.
 *
 * Delete and deactivate both live here rather than on the Team list, because they are not
 * interchangeable and the difference needs explaining: deleting is only possible for someone
 * with no history at all (every foreign key to `profiles` bar push tokens is NO ACTION), so
 * for anyone who has actually worked a shift, deactivating is the real answer.
 */
export default function EditStaffScreen(): React.JSX.Element {
  const { staffId } = useLocalSearchParams<{ staffId: string }>();
  const router = useRouter();
  const queryClient = useQueryClient();

  const staffQuery = useQuery({
    queryKey: ['admin-users', 'detail', staffId],
    queryFn: () => getStaffMember(staffId),
    enabled: Boolean(staffId),
  });
  const { data: staff, isLoading, isError } = staffQuery;
  const refreshControl = usePullToRefresh(staffQuery);

  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [jobRole, setJobRole] = useState('');
  const [payRate, setPayRate] = useState('');
  const [role, setRole] = useState<'employee' | 'manager'>('employee');
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [confirmingDelete, setConfirmingDelete] = useState(false);

  // Re-seeds when the server copy changes (including after a pull-to-refresh), rather than
  // only on mount, so the form never shows values that have since moved on.
  useEffect(() => {
    if (!staff) return;
    setName(staff.name);
    setPhone(staff.phone ?? '');
    setJobRole(staff.job_role ?? '');
    setPayRate(staff.pay_rate !== null ? String(staff.pay_rate) : '');
    setRole(staff.role);
  }, [staff?.id, staff?.name, staff?.phone, staff?.job_role, staff?.pay_rate, staff?.role]);

  function invalidate(): void {
    void queryClient.invalidateQueries({ queryKey: ['admin-users'] });
  }

  function describe(err: unknown, fallback: string): string {
    return err instanceof ApiError ? err.message : fallback;
  }

  const saveMutation = useMutation({
    mutationFn: () => {
      const parsedPay = payRate.trim() === '' ? undefined : Number(payRate);
      return updateStaffMember(staffId, {
        name: name.trim(),
        ...(phone.trim() ? { phone: phone.trim() } : {}),
        ...(jobRole.trim() ? { jobRole: jobRole.trim() } : {}),
        ...(parsedPay !== undefined ? { payRate: parsedPay } : {}),
        ...(staff && role !== staff.role ? { role } : {}),
      });
    },
    onSuccess: () => {
      setSaved(true);
      setError(null);
      invalidate();
    },
    onError: (err) => setError(describe(err, 'Could not save these changes. Please try again.')),
  });

  const activeMutation = useMutation({
    mutationFn: (isActive: boolean) => setStaffActive(staffId, isActive),
    onSuccess: () => {
      setError(null);
      invalidate();
    },
    onError: (err) => setError(describe(err, 'Could not change this account. Please try again.')),
  });

  const deleteMutation = useMutation({
    mutationFn: () => deleteStaffMember(staffId),
    onSuccess: () => {
      invalidate();
      router.replace('/(manager)/staff');
    },
    // Refused for anyone with history — the message names what is blocking it.
    onError: (err) => setError(describe(err, 'Could not delete this person. Please try again.')),
  });

  function handleSave(): void {
    setError(null);
    setSaved(false);
    if (!name.trim()) {
      setError('Name is required');
      return;
    }
    if (payRate.trim() !== '' && (Number.isNaN(Number(payRate)) || Number(payRate) <= 0)) {
      setError('Pay rate must be a positive number');
      return;
    }
    saveMutation.mutate();
  }

  if (isLoading) {
    return (
      <View style={styles.container}>
        <Text style={styles.status}>Loading…</Text>
      </View>
    );
  }

  if (isError || !staff) {
    return (
      <View style={styles.container}>
        <Text style={styles.status}>This staff member could not be loaded.</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content} refreshControl={refreshControl}>
      <View style={styles.header}>
        <Text style={styles.title}>{staff.name}</Text>
        <Badge
          label={!staff.is_active ? 'Deactivated' : staff.invite_status === 'pending' ? 'Invited' : 'Active'}
          tone={!staff.is_active ? 'danger' : staff.invite_status === 'pending' ? 'warning' : 'success'}
        />
      </View>

      <TextField label="Full name" value={name} onChangeText={setName} />
      <TextField label="Phone (optional)" value={phone} onChangeText={setPhone} keyboardType="phone-pad" />
      <TextField label="Job role (optional, e.g. Cashier)" value={jobRole} onChangeText={setJobRole} />
      <TextField label="Pay rate (optional)" value={payRate} onChangeText={setPayRate} keyboardType="decimal-pad" />

      <Text style={styles.label}>Role</Text>
      <View style={styles.roleRow}>
        {(['employee', 'manager'] as const).map((option) => (
          <Pressable
            key={option}
            onPress={() => setRole(option)}
            style={[styles.roleChip, role === option ? styles.roleChipOn : null]}
            accessibilityRole="button"
            accessibilityState={{ selected: role === option }}
          >
            <Text style={[styles.roleLabel, role === option ? styles.roleLabelOn : null]}>
              {option === 'employee' ? 'Employee' : 'Manager'}
            </Text>
          </Pressable>
        ))}
      </View>

      {error ? <Text style={styles.error}>{error}</Text> : null}
      {saved ? <Text style={styles.success}>Changes saved.</Text> : null}

      <Button label={saveMutation.isPending ? 'Saving…' : 'Save changes'} onPress={handleSave} disabled={saveMutation.isPending} />

      <View style={styles.dangerZone}>
        <Text style={styles.dangerLabel}>Account access</Text>
        <Text style={styles.hint}>
          {staff.is_active
            ? 'Deactivating stops them signing in but keeps every shift, timesheet and request on record.'
            : 'This account is deactivated. Reactivating lets them sign in again.'}
        </Text>
        <Button
          label={
            activeMutation.isPending
              ? 'Working…'
              : staff.is_active
                ? 'Deactivate account'
                : 'Reactivate account'
          }
          variant={staff.is_active ? 'secondary' : 'primary'}
          onPress={() => activeMutation.mutate(!staff.is_active)}
          disabled={activeMutation.isPending}
        />

        <Text style={styles.hint}>
          Deleting removes the account entirely, and is only possible for someone with no shifts,
          timesheets or requests on record.
        </Text>
        <Button
          label={deleteMutation.isPending ? 'Deleting…' : 'Delete permanently'}
          variant="danger"
          onPress={() => setConfirmingDelete(true)}
          disabled={deleteMutation.isPending}
        />
      </View>

      <ConfirmDialog
        visible={confirmingDelete}
        destructive
        title="Delete this person?"
        message={`"${staff.name}" and their sign-in will be permanently removed. This can't be undone. If they have any history in the system, the delete will be refused and you'll be asked to deactivate them instead.`}
        confirmLabel="Delete"
        onConfirm={() => {
          setConfirmingDelete(false);
          deleteMutation.mutate();
        }}
        onCancel={() => setConfirmingDelete(false)}
      />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.background },
  content: { padding: theme.spacing.md, gap: theme.spacing.sm },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  title: { ...theme.typography.title, color: theme.colors.textPrimary, flexShrink: 1 },
  label: { ...theme.typography.label, color: theme.colors.textSecondary },
  roleRow: { flexDirection: 'row', gap: theme.spacing.sm },
  roleChip: {
    flex: 1,
    minHeight: theme.minTapTarget,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: theme.radius.sm,
    borderWidth: 1,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.surface,
  },
  roleChipOn: { borderColor: theme.colors.primary, backgroundColor: theme.colors.accentSoft },
  roleLabel: { ...theme.typography.label, color: theme.colors.textSecondary },
  roleLabelOn: { color: theme.colors.primary, fontWeight: '600' },
  status: { ...theme.typography.body, color: theme.colors.textSecondary, padding: theme.spacing.md },
  error: { ...theme.typography.body, color: theme.colors.danger },
  success: { ...theme.typography.body, color: theme.colors.primary },
  hint: { ...theme.typography.caption, color: theme.colors.textMuted, marginTop: theme.spacing.xs },
  dangerZone: {
    marginTop: theme.spacing.lg,
    paddingTop: theme.spacing.md,
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
    gap: theme.spacing.xs,
  },
  dangerLabel: { ...theme.typography.overline, color: theme.colors.danger },
});
