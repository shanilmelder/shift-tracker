import React from 'react';
import { View, Text, FlatList, StyleSheet } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { theme, ListRow, EmptyState } from '../../../src/components';
import { apiRequest } from '../../../src/api/client';

interface TeamMember {
  id: string;
  name: string;
  job_role: string | null;
}

/** FR-021: coworker directory, scoped to the caller's own location by the API. */
export default function TeamScreen(): React.JSX.Element {
  const { data: team, isLoading } = useQuery({ queryKey: ['team'], queryFn: () => apiRequest<TeamMember[]>('/team') });

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Team</Text>
      {isLoading ? (
        <Text style={styles.status}>Loading…</Text>
      ) : !team || team.length === 0 ? (
        <EmptyState title="No coworkers found" />
      ) : (
        <FlatList data={team} keyExtractor={(m) => m.id} renderItem={({ item }) => <ListRow title={item.name} subtitle={item.job_role ?? undefined} />} />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.background },
  title: { ...theme.typography.title, color: theme.colors.textPrimary, padding: theme.spacing.md },
  status: { ...theme.typography.body, color: theme.colors.textSecondary, padding: theme.spacing.md },
});
