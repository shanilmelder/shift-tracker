import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { theme } from './theme';

export interface EmptyStateProps {
  title: string;
  message?: string;
}

/**
 * Shared "nothing here" state — used instead of an ambiguous blank screen wherever a list can
 * legitimately be empty (e.g. a week with no shifts). See spec.md User Story 2's acceptance
 * scenario requiring a clear empty state rather than an ambiguous blank one.
 */
export function EmptyState({ title, message }: EmptyStateProps): React.JSX.Element {
  return (
    <View style={styles.container} accessibilityRole="text">
      <Text style={styles.title}>{title}</Text>
      {message ? <Text style={styles.message}>{message}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: theme.spacing.xl,
    alignItems: 'center',
  },
  title: {
    ...theme.typography.heading,
    color: theme.colors.textPrimary,
    textAlign: 'center',
  },
  message: {
    ...theme.typography.body,
    color: theme.colors.textSecondary,
    textAlign: 'center',
    marginTop: theme.spacing.xs,
  },
});
