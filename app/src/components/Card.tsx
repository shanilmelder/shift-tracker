import React from 'react';
import { View, StyleSheet, type StyleProp, type ViewStyle } from 'react-native';
import { theme } from './theme';

export interface CardProps {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
}

/** Shared surface container — the one place card elevation/border/radius is defined. */
export function Card({ children, style }: CardProps): React.JSX.Element {
  return <View style={[styles.card, style]}>{children}</View>;
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: theme.colors.surface,
    borderColor: theme.colors.border,
    borderWidth: 1,
    borderRadius: theme.radius.md,
    // Ledger's card-padding token is 24 (theme.spacing.lg), not the 16 (md) used elsewhere.
    padding: theme.spacing.lg,
    ...theme.shadows.raised,
  },
});
