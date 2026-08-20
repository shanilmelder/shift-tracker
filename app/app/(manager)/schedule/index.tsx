import React, { useMemo } from 'react';
import { View, Text, FlatList, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { theme, Button, ListRow, Badge, EmptyState } from '../../../src/components';
import { useShiftsList } from '../../../src/queries/shifts.queries';
import { rangeForView } from '../../../src/lib/date-ranges';

/** Manager schedule overview: every shift at their location, with quick access to staffing. */
export default function ManagerScheduleScreen(): React.JSX.Element {
  const router = useRouter();
  const { from, to } = useMemo(() => rangeForView('month', new Date()), []);
  const { data: shifts, isLoading } = useShiftsList({ from: from.toISOString(), to: to.toISOString() });

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Schedule</Text>
        <Button label="New shift" onPress={() => router.push('/(manager)/schedule/new')} style={styles.newButton} />
      </View>

      {isLoading ? (
        <Text style={styles.status}>Loading schedule…</Text>
      ) : !shifts || shifts.length === 0 ? (
        <EmptyState title="No shifts this month" message="Create a shift to get started." />
      ) : (
        <FlatList
          data={shifts}
          keyExtractor={(shift) => shift.id}
          renderItem={({ item: shift }) => (
            <ListRow
              title={shift.name}
              subtitle={`${new Date(shift.start_time).toLocaleString()} – ${new Date(shift.end_time).toLocaleTimeString()}`}
              onPress={() => router.push(`/(manager)/schedule/${shift.id}/staff`)}
              right={<Badge label={shift.status} tone={shift.status === 'draft' ? 'warning' : 'neutral'} />}
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
    minWidth: 120,
  },
  status: {
    ...theme.typography.body,
    color: theme.colors.textSecondary,
    padding: theme.spacing.md,
  },
});
