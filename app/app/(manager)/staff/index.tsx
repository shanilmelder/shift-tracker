import React from 'react';
import { View, Text, ScrollView, StyleSheet } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { theme, Card, Badge, Button, EmptyState } from '../../../src/components';
import { listStaff } from '../../../src/api/admin-users.api';

/** Manager "Team" tab: everyone at the manager's location (doc/design's Prototype.dc.html). */
export default function StaffListScreen(): React.JSX.Element {
  const router = useRouter();
  const { data: staff, isLoading } = useQuery({ queryKey: ['admin-users', 'list'], queryFn: listStaff });

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
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
          <Card key={member.id} style={styles.row}>
            <View style={styles.textBlock}>
              <Text style={styles.name}>{member.name}</Text>
              <Text style={styles.subtitle}>{member.role === 'manager' ? 'Manager' : (member.job_role ?? 'Employee')}</Text>
            </View>
            <Badge
              label={!member.is_active ? 'Deactivated' : member.invite_status === 'pending' ? 'Invited' : 'Active'}
              tone={!member.is_active ? 'danger' : member.invite_status === 'pending' ? 'warning' : 'success'}
            />
          </Card>
        ))
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.background },
  content: { padding: theme.spacing.md, gap: theme.spacing.sm },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: theme.spacing.xs },
  title: { ...theme.typography.title, color: theme.colors.textPrimary },
  status: { ...theme.typography.body, color: theme.colors.textSecondary },
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  textBlock: { flexShrink: 1 },
  name: { ...theme.typography.body, color: theme.colors.textPrimary },
  subtitle: { ...theme.typography.caption, color: theme.colors.textSecondary, marginTop: 2 },
});
