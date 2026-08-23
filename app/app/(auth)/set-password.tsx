import React, { useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { theme, Button, TextField } from '../../src/components';
import { setPassword } from '../../src/api/auth.api';
import { useSessionStore } from '../../src/stores/session.store';
import { ApiError } from '../../src/types/api/common';

const SetPasswordSchema = z
  .object({
    password: z.string().min(8, 'Password must be at least 8 characters'),
    confirm: z.string(),
  })
  // Confirmed because there is no way back: the temporary password stops working the moment
  // this succeeds, so a typo here would lock the user out and need another manager reset.
  .refine((values) => values.password === values.confirm, {
    message: 'Passwords do not match',
    path: ['confirm'],
  });
type SetPasswordForm = z.infer<typeof SetPasswordSchema>;

/**
 * Forced password change, shown immediately after signing in with a manager-issued temporary
 * password and not dismissible — there is deliberately no skip, no back, and no tab bar here.
 *
 * The block is not this screen's doing: the API refuses every other route while the account is
 * still 'pending' (see the API's require-password-change middleware), so skipping it would only
 * produce an app full of 403s. This makes that state legible instead.
 */
export default function SetPasswordScreen(): React.JSX.Element {
  const clearPasswordChangeRequirement = useSessionStore((state) => state.clearPasswordChangeRequirement);
  const clearSession = useSessionStore((state) => state.clearSession);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const {
    control,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<SetPasswordForm>({ resolver: zodResolver(SetPasswordSchema) });

  async function onSubmit(values: SetPasswordForm): Promise<void> {
    setSubmitError(null);
    try {
      await setPassword(values.password);
      // Lifting this is what lets the root layout route onward; the session token itself stays
      // valid, so there is no need to sign in again.
      clearPasswordChangeRequirement();
    } catch (err) {
      setSubmitError(err instanceof ApiError ? err.message : 'Could not set your password. Please try again.');
    }
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Choose a password</Text>
      <Text style={styles.body}>
        You signed in with a temporary password. Pick your own to finish setting up your account — the temporary one
        stops working straight away.
      </Text>

      <Controller
        control={control}
        name="password"
        render={({ field }) => (
          <TextField
            label="New password"
            isPassword
            value={field.value ?? ''}
            onChangeText={field.onChange}
            errorMessage={errors.password?.message}
          />
        )}
      />
      <Controller
        control={control}
        name="confirm"
        render={({ field }) => (
          <TextField
            label="Confirm password"
            isPassword
            value={field.value ?? ''}
            onChangeText={field.onChange}
            errorMessage={errors.confirm?.message}
          />
        )}
      />

      {submitError ? <Text style={styles.submitError}>{submitError}</Text> : null}

      <Button label={isSubmitting ? 'Saving…' : 'Set password'} onPress={handleSubmit(onSubmit)} disabled={isSubmitting} />

      {/* The only other way out. Without it, someone who signed in as the wrong person would be
          stuck on a screen that changes an account they do not own. */}
      <Button label="Sign out" variant="secondary" onPress={clearSession} style={styles.signOut} />
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
  submitError: {
    ...theme.typography.body,
    color: theme.colors.danger,
    marginBottom: theme.spacing.md,
  },
  signOut: {
    marginTop: theme.spacing.md,
  },
});
