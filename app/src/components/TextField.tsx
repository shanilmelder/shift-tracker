import React, { useState } from 'react';
import { View, Text, TextInput, StyleSheet, type TextInputProps } from 'react-native';
import { theme } from './theme';

export interface TextFieldProps extends Omit<TextInputProps, 'style'> {
  label: string;
  errorMessage?: string;
}

/**
 * Shared text input with a visible label and inline error text wired to
 * `accessibilityLabel`/`accessibilityHint` so a screen-reader user hears the same information
 * a sighted user sees, per the constitution's Accessibility principle. Used by every form in
 * the app (paired with React Hook Form + Zod at the screen level).
 */
export function TextField({ label, errorMessage, onFocus, onBlur, ...inputProps }: TextFieldProps): React.JSX.Element {
  const [focused, setFocused] = useState(false);

  return (
    <View style={styles.container}>
      <Text style={styles.label}>{label}</Text>
      <TextInput
        {...inputProps}
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
  label: {
    ...theme.typography.label,
    color: theme.colors.textSecondary,
    marginBottom: theme.spacing.xs,
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
