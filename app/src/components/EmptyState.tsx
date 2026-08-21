import React from 'react';
import { View, Text, ScrollView, StyleSheet, type RefreshControlProps } from 'react-native';
import { theme } from './theme';

export interface EmptyStateProps {
  title: string;
  message?: string;
  /**
   * The screen's pull-to-refresh control, from `usePullToRefresh`. Pass it wherever this empty
   * state replaces a list rather than sitting inside one: the list it stands in for is the
   * thing carrying the refresh gesture, so without this the user loses the ability to pull
   * exactly when they most want it — the screen is empty and they want to check for new data.
   */
  refreshControl?: React.ReactElement<RefreshControlProps>;
}

/**
 * Shared "nothing here" state — used instead of an ambiguous blank screen wherever a list can
 * legitimately be empty (e.g. a week with no shifts). See spec.md User Story 2's acceptance
 * scenario requiring a clear empty state rather than an ambiguous blank one.
 */
export function EmptyState({ title, message, refreshControl }: EmptyStateProps): React.JSX.Element {
  const content = (
    <View style={styles.container} accessibilityRole="text">
      <Text style={styles.title}>{title}</Text>
      {message ? <Text style={styles.message}>{message}</Text> : null}
    </View>
  );

  if (!refreshControl) return content;

  // `flexGrow` on the content lets the (short) empty state fill the viewport, which is what
  // makes the whole area draggable — a ScrollView whose content is shorter than itself still
  // accepts the pull gesture only if it actually occupies the scrollable region.
  return (
    <ScrollView style={styles.refreshableScroll} contentContainerStyle={styles.refreshable} refreshControl={refreshControl}>
      {content}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  // `flex` on the ScrollView itself (not just the content) so it claims the space its parent
  // has left over; without it a ScrollView in a column layout collapses to its content height
  // and there is nothing tall enough to drag.
  refreshableScroll: {
    flex: 1,
  },
  refreshable: {
    flexGrow: 1,
    justifyContent: 'center',
  },
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
