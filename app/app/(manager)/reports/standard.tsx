import React from 'react';
import { Text, ScrollView, Pressable, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { ChevronLeft } from 'lucide-react-native';
import { theme, Card, ListRow } from '../../../src/components';

/**
 * Index over the four fixed reports.
 *
 * These screens existed before the assistant did, but nothing ever listed them: the only ways
 * in were the dashboard's attendance card and the More tab's single link to labor cost, which
 * left hours-by-employee and overtime unreachable from anywhere in the app. This is the hub
 * that was missing — the assistant's "standard reports" link points here, not at one report.
 */
const REPORTS = [
  { title: 'Labor cost', subtitle: 'Cost from clocked hours, against a budget you set', href: '/(manager)/reports/labor-cost' },
  { title: 'Hours by employee', subtitle: 'Regular and overtime hours per person', href: '/(manager)/reports/hours-by-employee' },
  { title: 'Attendance', subtitle: 'Shifts attended versus no-shows', href: '/(manager)/reports/attendance' },
  { title: 'Overtime', subtitle: 'Total overtime and who is accruing it', href: '/(manager)/reports/overtime' },
] as const;

export default function StandardReportsScreen(): React.JSX.Element {
  const router = useRouter();
  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Pressable
        onPress={() => router.back()}
        accessibilityRole="button"
        accessibilityLabel="Back to the reports assistant"
        style={({ pressed }) => [styles.back, pressed ? styles.backPressed : null]}
      >
        <ChevronLeft size={20} color={theme.colors.textSecondary} />
        <Text style={styles.backText}>Assistant</Text>
      </Pressable>

      <Text style={styles.title}>Standard reports</Text>
      <Card style={styles.list}>
        {REPORTS.map((report) => (
          <ListRow
            key={report.href}
            title={report.title}
            subtitle={report.subtitle}
            onPress={() => router.push(report.href)}
          />
        ))}
      </Card>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.background },
  content: { padding: theme.spacing.md, gap: theme.spacing.md },
  back: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.xs,
    alignSelf: 'flex-start',
    minHeight: theme.minTapTarget,
    paddingRight: theme.spacing.sm,
  },
  backPressed: { opacity: 0.6 },
  backText: { ...theme.typography.label, color: theme.colors.textSecondary },
  title: { ...theme.typography.title, color: theme.colors.textPrimary },
  list: { padding: 0 },
});
