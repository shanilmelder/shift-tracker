import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { theme } from './theme';

export type BadgeTone = 'neutral' | 'success' | 'warning' | 'danger';

export interface BadgeProps {
  label: string;
  tone?: BadgeTone;
}

const toneColor: Record<BadgeTone, string> = {
  neutral: theme.colors.textSecondary,
  success: theme.colors.success,
  warning: theme.colors.warning,
  danger: theme.colors.danger,
};

/**
 * Status pill used for shift/request statuses (pending, approved, denied, flagged, etc.).
 * Color alone never carries the meaning — the label text is always present too, per the
 * constitution's Accessibility principle (meaning conveyed by color must also be conveyed by
 * a non-color signal).
 */
export function Badge({ label, tone = 'neutral' }: BadgeProps): React.JSX.Element {
  const color = toneColor[tone];
  return (
    <View style={[styles.badge, { borderColor: color }]} accessibilityLabel={`Status: ${label}`}>
      <Text style={[styles.label, { color }]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    borderWidth: 1,
    borderRadius: 6,
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: 2,
  },
  label: {
    ...theme.typography.caption,
    fontWeight: '600',
  },
});
