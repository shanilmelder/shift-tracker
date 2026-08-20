import React from 'react';
import { Text, ScrollView, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { theme, Card, ListRow } from '../../../src/components';

const LINKS = [
  { title: 'Swaps', subtitle: 'Shift trades waiting on a decision', href: '/(manager)/approvals/swaps' },
  { title: 'Time off', subtitle: 'Time-off requests waiting on a decision', href: '/(manager)/approvals/time-off' },
] as const;

/** Manager "Approvals" tab: a hub over the two approval queues (doc/design's Prototype.dc.html). */
export default function ApprovalsHubScreen(): React.JSX.Element {
  const router = useRouter();
  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.title}>Approvals</Text>
      <Card style={styles.list}>
        {LINKS.map((link) => (
          <ListRow key={link.href} title={link.title} subtitle={link.subtitle} onPress={() => router.push(link.href)} />
        ))}
      </Card>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.background },
  content: { padding: theme.spacing.md, gap: theme.spacing.md },
  title: { ...theme.typography.title, color: theme.colors.textPrimary },
  list: { padding: 0 },
});
