import React, { useState } from 'react';
import { View, Text, ScrollView, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { theme, Button, TextField, TempPasswordNotice } from '../../../src/components';
import { createStaffMember, type CreatedStaffMember } from '../../../src/api/admin-users.api';
import { useSessionStore } from '../../../src/stores/session.store';
import { ApiError } from '../../../src/types/api/common';

const CreateStaffSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  email: z.string().email('Enter a valid email address'),
  phone: z.string().optional(),
  jobRole: z.string().optional(),
  role: z.enum(['employee', 'manager']),
});
type CreateStaffForm = z.infer<typeof CreateStaffSchema>;

/**
 * Step in the closed-account model (FR-004): a manager enters a new person's details, and the
 * API provisions the account with a generated temporary password (FR-007).
 *
 * The manager never chooses that password — it is generated server-side — but they are shown it
 * once, here, so onboarding does not depend on email arriving. The new starter is made to
 * replace it the first time they sign in.
 */
export default function NewStaffScreen(): React.JSX.Element {
  const router = useRouter();
  const locationId = useSessionStore((state) => state.locationId);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [created, setCreated] = useState<CreatedStaffMember | null>(null);
  const {
    control,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<CreateStaffForm>({
    resolver: zodResolver(CreateStaffSchema),
    defaultValues: { role: 'employee' },
  });

  async function onSubmit(values: CreateStaffForm): Promise<void> {
    setSubmitError(null);
    if (!locationId) {
      setSubmitError('Missing your location — please sign in again.');
      return;
    }
    try {
      // Deliberately does NOT navigate away: the temp password is readable only in this
      // response, so leaving immediately would discard the one copy that exists.
      setCreated(await createStaffMember({ ...values, locationId }));
    } catch (err) {
      setSubmitError(err instanceof ApiError ? err.message : 'Could not create the account. Please try again.');
    }
  }

  if (created) {
    return (
      <ScrollView contentContainerStyle={styles.container}>
        <Text style={styles.title}>Account created</Text>
        <Text style={styles.hint}>{created.name} can sign in with the password below.</Text>
        <TempPasswordNotice
          name={created.name}
          tempPassword={created.tempPassword}
          emailSent={created.emailSent}
          emailError={created.emailError}
        />
        <Button label="Done" onPress={() => router.back()} style={styles.done} />
      </ScrollView>
    );
  }

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.title}>Add staff member</Text>
      <Text style={styles.hint}>
        A temporary password is generated for them and emailed over. You&apos;ll see it here too, once.
      </Text>

      <Controller
        control={control}
        name="name"
        render={({ field }) => (
          <TextField label="Full name" value={field.value ?? ''} onChangeText={field.onChange} errorMessage={errors.name?.message} />
        )}
      />
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
        name="phone"
        render={({ field }) => (
          <TextField label="Phone (optional)" keyboardType="phone-pad" value={field.value ?? ''} onChangeText={field.onChange} />
        )}
      />
      <Controller
        control={control}
        name="jobRole"
        render={({ field }) => (
          <TextField label="Job role (optional, e.g. Cashier)" value={field.value ?? ''} onChangeText={field.onChange} />
        )}
      />

      <View style={styles.roleRow}>
        <Controller
          control={control}
          name="role"
          render={({ field }) => (
            <>
              <Button
                label="Employee"
                variant={field.value === 'employee' ? 'primary' : 'secondary'}
                onPress={() => field.onChange('employee')}
                style={styles.roleButton}
              />
              <Button
                label="Manager"
                variant={field.value === 'manager' ? 'primary' : 'secondary'}
                onPress={() => field.onChange('manager')}
                style={styles.roleButton}
              />
            </>
          )}
        />
      </View>

      {submitError ? <Text style={styles.submitError}>{submitError}</Text> : null}

      <Button label={isSubmitting ? 'Creating…' : 'Create account'} onPress={handleSubmit(onSubmit)} disabled={isSubmitting} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: theme.spacing.lg,
    backgroundColor: theme.colors.background,
  },
  title: {
    ...theme.typography.title,
    color: theme.colors.textPrimary,
    marginBottom: theme.spacing.xs,
  },
  hint: {
    ...theme.typography.caption,
    color: theme.colors.textSecondary,
    marginBottom: theme.spacing.lg,
  },
  roleRow: {
    flexDirection: 'row',
    gap: theme.spacing.sm,
    marginBottom: theme.spacing.lg,
  },
  roleButton: {
    flex: 1,
  },
  submitError: {
    ...theme.typography.body,
    color: theme.colors.danger,
    marginBottom: theme.spacing.md,
  },
  done: {
    marginTop: theme.spacing.lg,
  },
});
