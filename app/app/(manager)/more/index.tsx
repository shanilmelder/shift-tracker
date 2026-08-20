import React from 'react';
import { Text, ScrollView, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { theme, Card, ListRow, Button } from '../../../src/components';
import { useSessionStore } from '../../../src/stores/session.store';

const LINKS = [
  { title: 'Shift areas', subtitle: 'Manage the areas staff are assigned to', href: '/(manager)/shift-areas' },
  { title: 'Reports', subtitle: 'Labour cost, hours, and attendance', href: '/(manager)/reports/labor-cost' },
  { title: 'Announcements', subtitle: 'Post updates to your team', href: '/(manager)/announcements' },
] as const;

/** Manager "More" tab: a hub over everything else that doesn't have its own tab (doc/design's Prototype.dc.html). */
export default function ManagerMoreScreen(): React.JSX.Element {
  const router = useRouter();
  const clearSession = useSessionStore((state) => state.clearSession);
  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.title}>More</Text>
      <Card style={styles.list}>
        {LINKS.map((link) => (
          <ListRow key={link.href} title={link.title} subtitle={link.subtitle} onPress={() => router.push(link.href)} />
        ))}
        <ListRow title="Profile" subtitle="Your name, phone, and account" onPress={() => router.push('/(manager)/profile')} />
      </Card>
      <Button label="Sign out" variant="secondary" onPress={clearSession} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.background },
  content: { padding: theme.spacing.md, gap: theme.spacing.md },
  title: { ...theme.typography.title, color: theme.colors.textPrimary },
  list: { padding: 0 },
});
