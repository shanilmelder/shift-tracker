import React, { useState } from 'react';
import { View, Text, ScrollView, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { theme, Button, TextField } from '../../../src/components';
import { createStaffMember } from '../../../src/api/admin-users.api';
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
 * Step in the closed-account model (FR-004): a manager enters a new person's details and an
 * invite is sent for them to set their own password (FR-007) — this screen never collects or
 * displays a password.
 */
export default function NewStaffScreen(): React.JSX.Element {
  const router = useRouter();
  const locationId = useSessionStore((state) => state.locationId);
  const [submitError, setSubmitError] = useState<string | null>(null);
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
      await createStaffMember({ ...values, locationId });
      router.back();
    } catch (err) {
      setSubmitError(err instanceof ApiError ? err.message : 'Could not create the account. Please try again.');
    }
  }

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.title}>Add staff member</Text>
      <Text style={styles.hint}>
        They'll receive an email invite to set their own password — no password is created here.
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

      <Button label={isSubmitting ? 'Creating…' : 'Send invite'} onPress={handleSubmit(onSubmit)} disabled={isSubmitting} />
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
});
