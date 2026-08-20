import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Link } from 'expo-router';
import * as Linking from 'expo-linking';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { theme, Button, TextField } from '../../src/components';
import { setPassword } from '../../src/api/auth.api';
import { parseFragmentParams } from '../../src/lib/deep-link';
import { ApiError } from '../../src/types/api/common';

const SetPasswordSchema = z.object({
  password: z.string().min(8, 'Password must be at least 8 characters'),
});
type SetPasswordForm = z.infer<typeof SetPasswordSchema>;

/**
 * Landing screen for both the invite and password-reset emails (see api/src/config/app-links.ts
 * — both redirect here). The `access_token` in the URL fragment is a normal Supabase session
 * JWT, used directly as this screen's one-off bearer token; the app never establishes a
 * session from it (see PATCH /v1/auth/password's doc comment) — success just routes to login.
 */
export default function ResetPasswordScreen(): React.JSX.Element {
  const url = Linking.useURL();
  const [submitted, setSubmitted] = React.useState(false);
  const [submitError, setSubmitError] = React.useState<string | null>(null);
  const {
    control,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<SetPasswordForm>({ resolver: zodResolver(SetPasswordSchema) });

  const accessToken = url ? parseFragmentParams(url).access_token : undefined;

  async function onSubmit(values: SetPasswordForm): Promise<void> {
    if (!accessToken) return;
    setSubmitError(null);
    try {
      await setPassword(values.password, accessToken);
      setSubmitted(true);
    } catch (err) {
      setSubmitError(err instanceof ApiError ? err.message : 'Something went wrong. Please try again.');
    }
  }

  if (!accessToken) {
    return (
      <View style={styles.container}>
        <Text style={styles.title}>Link expired or invalid</Text>
        <Text style={styles.body}>Request a new invite or reset link and open it directly from your email.</Text>
      </View>
    );
  }

  if (submitted) {
    return (
      <View style={styles.container}>
        <Text style={styles.title}>Password set</Text>
        <Text style={styles.body}>You can now sign in with your new password.</Text>
        <Link href="/(auth)/login" style={styles.link}>
          Go to sign in
        </Link>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Set your password</Text>
      <Controller
        control={control}
        name="password"
        render={({ field }) => (
          <TextField
            label="New password"
            secureTextEntry
            value={field.value ?? ''}
            onChangeText={field.onChange}
            errorMessage={errors.password?.message}
          />
        )}
      />
      {submitError ? <Text style={styles.submitError}>{submitError}</Text> : null}
      <Button label={isSubmitting ? 'Saving…' : 'Set password'} onPress={handleSubmit(onSubmit)} disabled={isSubmitting} />
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
  link: {
    ...theme.typography.body,
    color: theme.colors.primary,
    marginTop: theme.spacing.md,
    textAlign: 'center',
  },
});
