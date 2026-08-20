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
    backgroundColor: theme.colors.background,
    borderColor: theme.colors.border,
    borderWidth: 1,
    borderRadius: 12,
    padding: theme.spacing.md,
  },
});
