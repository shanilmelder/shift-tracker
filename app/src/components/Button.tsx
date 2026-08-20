import React from 'react';
import { Pressable, Text, StyleSheet, type StyleProp, type ViewStyle } from 'react-native';
import { theme } from './theme';

export type ButtonVariant = 'primary' | 'secondary' | 'danger';

export interface ButtonProps {
  label: string;
  onPress: () => void;
  variant?: ButtonVariant;
  disabled?: boolean;
  /** Extra context for screen readers when `label` alone is ambiguous (e.g. "Clock in — Floor shift, 9am"). */
  accessibilityHint?: string;
  style?: StyleProp<ViewStyle>;
}

/**
 * The shared button used everywhere an action is triggered. Meets the constitution's
 * accessibility requirements by construction: a real `accessibilityRole="button"`, the shared
 * minimum tap target height, and disabled state communicated to screen readers, not just
 * visually dimmed.
 */
export function Button({ label, onPress, variant = 'primary', disabled = false, accessibilityHint, style }: ButtonProps): React.JSX.Element {
  const backgroundColor = disabled
    ? theme.colors.disabled
    : variant === 'primary'
      ? theme.colors.primary
      : variant === 'danger'
        ? theme.colors.danger
        : theme.colors.surface;
  const textColor = variant === 'secondary' && !disabled ? theme.colors.textPrimary : theme.colors.primaryText;

  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityHint={accessibilityHint}
      accessibilityState={{ disabled }}
      style={[styles.base, { backgroundColor }, style]}
    >
      <Text style={[styles.label, { color: textColor }]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    minHeight: theme.minTapTarget,
    minWidth: theme.minTapTarget,
    paddingHorizontal: theme.spacing.md,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  label: {
    ...theme.typography.body,
    fontWeight: '600',
  },
});
