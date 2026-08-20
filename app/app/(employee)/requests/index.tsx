import React from 'react';
import { View, Text, ScrollView, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { theme, Card, ListRow } from '../../../src/components';

const LINKS = [
  { title: 'Availability', subtitle: 'Set the days and times you can work', href: '/(employee)/availability' },
  { title: 'Swaps', subtitle: 'Trade or give away a shift', href: '/(employee)/swaps' },
  { title: 'Time off', subtitle: 'Request time away and see your balance', href: '/(employee)/time-off' },
  { title: 'Open shifts', subtitle: 'Pick up an unfilled shift', href: '/(employee)/open-shifts' },
] as const;

/** Employee "Requests" tab: a hub over the four request types (doc/design's Prototype.dc.html). */
export default function RequestsHubScreen(): React.JSX.Element {
  const router = useRouter();
  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.title}>Requests</Text>
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
