import React, { useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { theme, Button, TextField } from '../../src/components';
import { signIn, fetchMe } from '../../src/api/auth.api';
import { useSessionStore } from '../../src/stores/session.store';
import { ApiError } from '../../src/types/api/common';

const LoginSchema = z.object({
  email: z.string().email('Enter a valid email address'),
  password: z.string().min(1, 'Password is required'),
});
type LoginForm = z.infer<typeof LoginSchema>;

/**
 * Sign-in only. There is intentionally no "Create account" link, and no route to one anywhere
 * in this app's navigation tree — account creation is manager-only (FR-002/FR-005).
 */
export default function LoginScreen(): React.JSX.Element {
  const setSession = useSessionStore((state) => state.setSession);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const {
    control,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginForm>({ resolver: zodResolver(LoginSchema) });

  async function onSubmit(values: LoginForm): Promise<void> {
    setSubmitError(null);
    try {
      const session = await signIn(values.email, values.password);
      const me = await fetchMe(session.accessToken);
      setSession({
        accessToken: session.accessToken,
        role: me.role,
        profileId: me.id,
        locationId: me.location_id,
        // 'pending' = signed in with a temporary password. The root layout routes on this.
        mustChangePassword: me.invite_status === 'pending',
      });
    } catch (err) {
      setSubmitError(err instanceof ApiError ? err.message : 'Sign-in failed. Please try again.');
    }
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Shift Tracker</Text>

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
      <Controller
        control={control}
        name="password"
        render={({ field }) => (
          <TextField
            label="Password"
            isPassword
            value={field.value ?? ''}
            onChangeText={field.onChange}
            errorMessage={errors.password?.message}
          />
        )}
      />

      {submitError ? <Text style={styles.submitError}>{submitError}</Text> : null}

      <Button label={isSubmitting ? 'Signing in…' : 'Sign in'} onPress={handleSubmit(onSubmit)} disabled={isSubmitting} />

      {/* No self-service reset: recovery is manager-issued, so the honest instruction is who
          to ask rather than a link to a flow that no longer exists. */}
      <Text style={styles.helpText}>
        Forgotten your password? Ask your manager to send you a new temporary one.
      </Text>
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
    marginBottom: theme.spacing.lg,
  },
  submitError: {
    ...theme.typography.body,
    color: theme.colors.danger,
    marginBottom: theme.spacing.md,
  },
  helpText: {
    ...theme.typography.caption,
    color: theme.colors.textSecondary,
    marginTop: theme.spacing.md,
    textAlign: 'center',
  },
  link: {
    ...theme.typography.body,
    color: theme.colors.primary,
    marginTop: theme.spacing.md,
    textAlign: 'center',
  },
});
