import React, { useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { theme, Button, TextField } from '../../src/components';
import { requestPasswordReset } from '../../src/api/auth.api';
import { ApiError } from '../../src/types/api/common';

const ForgotPasswordSchema = z.object({
  email: z.string().email('Enter a valid email address'),
});
type ForgotPasswordForm = z.infer<typeof ForgotPasswordSchema>;

export default function ForgotPasswordScreen(): React.JSX.Element {
  const [sent, setSent] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const {
    control,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<ForgotPasswordForm>({ resolver: zodResolver(ForgotPasswordSchema) });

  async function onSubmit(values: ForgotPasswordForm): Promise<void> {
    setSubmitError(null);
    try {
      await requestPasswordReset(values.email);
      setSent(true);
    } catch (err) {
      setSubmitError(err instanceof ApiError ? err.message : 'Something went wrong. Please try again.');
    }
  }

  if (sent) {
    return (
      <View style={styles.container}>
        <Text style={styles.title}>Check your email</Text>
        <Text style={styles.body}>If an account exists for that address, a reset link is on its way.</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Reset your password</Text>
      <Controller
        control={control}
        name="email"
        render={({ field }) => (
          <TextField
            label="Email"
            autoCapitalize="none"
            keyboardType="email-address"
            value={field.value ?? ''}
            onChangeText={field.onChange}
            errorMessage={errors.email?.message}
          />
        )}
      />
      {submitError ? <Text style={styles.submitError}>{submitError}</Text> : null}
      <Button label={isSubmitting ? 'Sending…' : 'Send reset link'} onPress={handleSubmit(onSubmit)} disabled={isSubmitting} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    padding: theme.spacing.lg,
    backgroundColor: theme.colors.background,
  },
  title: {
    ...theme.typography.title,
    color: theme.colors.textPrimary,
    marginBottom: theme.spacing.md,
  },
  body: {
    ...theme.typography.body,
    color: theme.colors.textSecondary,
  },
  submitError: {
    ...theme.typography.body,
    color: theme.colors.danger,
    marginBottom: theme.spacing.md,
  },
});
