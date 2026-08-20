import React from 'react';
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
export function TextField({ label, errorMessage, ...inputProps }: TextFieldProps): React.JSX.Element {
  return (
    <View style={styles.container}>
      <Text style={styles.label}>{label}</Text>
      <TextInput
        {...inputProps}
        accessibilityLabel={label}
        accessibilityHint={errorMessage}
        style={[styles.input, errorMessage ? styles.inputError : null]}
        placeholderTextColor={theme.colors.textSecondary}
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
    ...theme.typography.caption,
    color: theme.colors.textSecondary,
    marginBottom: theme.spacing.xs,
  },
  input: {
    ...theme.typography.body,
    minHeight: theme.minTapTarget,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: 8,
    paddingHorizontal: theme.spacing.sm,
    color: theme.colors.textPrimary,
    backgroundColor: theme.colors.background,
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
