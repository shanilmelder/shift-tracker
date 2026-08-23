import React, { useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { theme, Button, TextField } from '../../src/components';
import { requestTempPassword } from '../../src/api/auth.api';
import { ApiError } from '../../src/types/api/common';

const ForgotPasswordSchema = z.object({
  email: z.string().email('Enter a valid email address'),
});
type ForgotPasswordForm = z.infer<typeof ForgotPasswordSchema>;

/**
 * Self-service recovery: emails a temporary password, which the user is then made to replace
 * on sign-in exactly as a newly created account is.
 *
 * The confirmation is deliberately worded to say nothing about whether the address is
 * registered, and is shown even for an address that is not. The API behaves identically for
 * both, and a screen that distinguished them would give away the difference the API is careful
 * to hide — turning this into a way to test which staff emails exist.
 */
export default function ForgotPasswordScreen(): React.JSX.Element {
  const router = useRouter();
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
      await requestTempPassword(values.email);
      setSent(true);
    } catch (err) {
      // Only reachable if the request itself failed to complete — the API returns the same
      // success whether or not the address is known, so this is never "no such account".
      setSubmitError(err instanceof ApiError ? err.message : 'Something went wrong. Please try again.');
    }
  }

  if (sent) {
    return (
      <View style={styles.container}>
        <Text style={styles.title}>Check your email</Text>
        <Text style={styles.body}>
          If that address belongs to an account, a temporary password is on its way. Sign in with it and you&apos;ll be
          asked to choose a new one.
        </Text>
        <Text style={styles.caption}>
          Nothing arrived? Check your spam folder, or ask your manager to reset it for you.
        </Text>
        <Button label="Back to sign in" onPress={() => router.replace('/(auth)/login')} style={styles.action} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Forgotten password</Text>
      <Text style={styles.body}>
        Enter your email and we&apos;ll send you a temporary password to sign in with.
      </Text>

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

      <Button
        label={isSubmitting ? 'Sending…' : 'Send temporary password'}
        onPress={handleSubmit(onSubmit)}
        disabled={isSubmitting}
      />
      <Button label="Back to sign in" variant="secondary" onPress={() => router.back()} style={styles.action} />
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
    marginBottom: theme.spacing.sm,
  },
  body: {
    ...theme.typography.body,
    color: theme.colors.textSecondary,
    marginBottom: theme.spacing.lg,
  },
  caption: {
    ...theme.typography.caption,
    color: theme.colors.textMuted,
    marginTop: theme.spacing.sm,
  },
  submitError: {
    ...theme.typography.body,
    color: theme.colors.danger,
    marginBottom: theme.spacing.md,
  },
  action: {
    marginTop: theme.spacing.md,
  },
});
