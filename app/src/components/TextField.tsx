import React, { useState } from 'react';
import { View, Text, TextInput, Pressable, StyleSheet, type TextInputProps } from 'react-native';
import { theme } from './theme';

export interface TextFieldProps extends Omit<TextInputProps, 'style' | 'secureTextEntry'> {
  label: string;
  errorMessage?: string;
  /** Renders a Show/Hide toggle next to the label and manages `secureTextEntry` internally —
   * pass this for password fields instead of `secureTextEntry` directly. */
  isPassword?: boolean;
}

/**
 * Shared text input with a visible label and inline error text wired to
 * `accessibilityLabel`/`accessibilityHint` so a screen-reader user hears the same information
 * a sighted user sees, per the constitution's Accessibility principle. Used by every form in
 * the app (paired with React Hook Form + Zod at the screen level).
 */
export function TextField({ label, errorMessage, isPassword, onFocus, onBlur, ...inputProps }: TextFieldProps): React.JSX.Element {
  const [focused, setFocused] = useState(false);
  const [revealed, setRevealed] = useState(false);

  return (
    <View style={styles.container}>
      <View style={styles.labelRow}>
        <Text style={styles.label}>{label}</Text>
        {isPassword ? (
          <Pressable onPress={() => setRevealed((v) => !v)} accessibilityRole="button" accessibilityLabel={revealed ? 'Hide password' : 'Show password'} hitSlop={8}>
            <Text style={styles.toggle}>{revealed ? 'Hide' : 'Show'}</Text>
          </Pressable>
        ) : null}
      </View>
      <TextInput
        {...inputProps}
        secureTextEntry={isPassword ? !revealed : undefined}
        onFocus={(e) => {
          setFocused(true);
          onFocus?.(e);
        }}
        onBlur={(e) => {
          setFocused(false);
          onBlur?.(e);
        }}
        accessibilityLabel={label}
        accessibilityHint={errorMessage}
        style={[styles.input, focused ? styles.inputFocused : null, errorMessage ? styles.inputError : null]}
        placeholderTextColor={theme.colors.textMuted}
      />
      {errorMessage ? (
        <Text style={styles.error} accessibilityLiveRegion="polite">
          {errorMessage}
        </Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: theme.spacing.md,
  },
  labelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: theme.spacing.xs,
  },
  label: {
    ...theme.typography.label,
    color: theme.colors.textSecondary,
  },
  toggle: {
    ...theme.typography.label,
    color: theme.colors.primary,
  },
  input: {
    ...theme.typography.body,
    minHeight: theme.minTapTarget,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.radius.sm,
    paddingHorizontal: theme.spacing.sm,
    color: theme.colors.textPrimary,
    backgroundColor: theme.colors.surface,
  },
  inputFocused: {
    borderColor: theme.colors.borderStrong,
  },
  inputError: {
    borderColor: theme.colors.danger,
  },
  error: {
    ...theme.typography.caption,
    color: theme.colors.danger,
    marginTop: theme.spacing.xs,
  },
});
