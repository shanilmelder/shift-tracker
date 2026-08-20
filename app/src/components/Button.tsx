import React from 'react';
import { Pressable, Text, StyleSheet, type StyleProp, type ViewStyle } from 'react-native';
import { theme, fontFamilies } from './theme';

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

const fillColor: Record<ButtonVariant, string> = {
  primary: theme.colors.primary,
  secondary: theme.colors.surface,
  danger: theme.colors.danger,
};

const pressedFillColor: Record<ButtonVariant, string> = {
  primary: theme.colors.primaryHover,
  secondary: theme.colors.surfaceMuted,
  danger: theme.colors.danger,
};

const textColor: Record<ButtonVariant, string> = {
  primary: theme.colors.primaryText,
  secondary: theme.colors.textPrimary,
  danger: theme.colors.primaryText,
};

/**
 * The shared button used everywhere an action is triggered. Meets the constitution's
 * accessibility requirements by construction: a real `accessibilityRole="button"`, the shared
 * minimum tap target height, and disabled state communicated to screen readers, not just
 * visually dimmed.
 */
export function Button({ label, onPress, variant = 'primary', disabled = false, accessibilityHint, style }: ButtonProps): React.JSX.Element {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityHint={accessibilityHint}
      accessibilityState={{ disabled }}
      style={({ pressed }) => [
        styles.base,
        variant === 'secondary' ? styles.secondaryOutline : null,
        { backgroundColor: pressed && !disabled ? pressedFillColor[variant] : fillColor[variant] },
        disabled ? styles.disabled : null,
        style,
      ]}
    >
      <Text style={[styles.label, { color: textColor[variant] }]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    minHeight: theme.minTapTarget,
    minWidth: theme.minTapTarget,
    paddingHorizontal: theme.spacing.md,
    borderRadius: theme.radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  secondaryOutline: {
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  // Ledger's disabled rule: opacity only, never a color swap (see theme.ts's colors.disabled,
  // which is now unused here for that reason — kept in the palette for anything non-Button
  // that still wants a flat disabled fill).
  disabled: {
    opacity: 0.4,
  },
  label: {
    fontFamily: fontFamilies.sansSemiBold,
    fontSize: theme.typography.body.fontSize,
    lineHeight: theme.typography.body.lineHeight,
  },
});
