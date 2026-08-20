import React, { useState } from 'react';
import { Text, ScrollView, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { theme, Button, TextField, DateField } from '../../../src/components';
import { useCreateShift } from '../../../src/queries/shifts.queries';
import { ApiError } from '../../../src/types/api/common';

const NewShiftSchema = z
  .object({
    name: z.string().min(1, 'Shift name is required'),
    startTime: z.string().min(1, 'Start time is required'),
    endTime: z.string().min(1, 'End time is required'),
  })
  .refine((form) => new Date(form.endTime).getTime() > new Date(form.startTime).getTime(), {
    message: 'End time must be after start time',
    path: ['endTime'],
  });
type NewShiftForm = z.infer<typeof NewShiftSchema>;

/**
 * Step 1 of the two-step schedule builder (FR-026): name + start/end time ONLY. There is no
 * staffing field on this screen at all — staffing happens later, on a separate route
 * (`[shiftId]/staff.tsx`), which is the entire point of the two-step split.
 */
export default function NewShiftScreen(): React.JSX.Element {
  const router = useRouter();
  const createShift = useCreateShift();
  const [submitError, setSubmitError] = useState<string | null>(null);
  const {
    control,
    handleSubmit,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<NewShiftForm>({ resolver: zodResolver(NewShiftSchema) });
  const startTime = watch('startTime');

  async function onSubmit(values: NewShiftForm): Promise<void> {
    setSubmitError(null);
    try {
      const startIso = new Date(values.startTime).toISOString();
      const endIso = new Date(values.endTime).toISOString();
      const shift = await createShift.mutateAsync({ name: values.name, startTime: startIso, endTime: endIso });
      router.replace(`/(manager)/schedule/${shift.id}/staff`);
    } catch (err) {
      setSubmitError(err instanceof ApiError ? err.message : 'Could not create the shift. Please try again.');
    }
  }

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.title}>New shift</Text>
      <Text style={styles.hint}>This creates an unstaffed shift. You'll assign staff next, as a separate step.</Text>

      <Controller
        control={control}
        name="name"
        render={({ field }) => (
          <TextField label="Shift name" value={field.value ?? ''} onChangeText={field.onChange} errorMessage={errors.name?.message} />
        )}
      />
      <Controller
        control={control}
        name="startTime"
        render={({ field }) => (
          <DateField label="Starts" mode="datetime" value={field.value ?? ''} onChange={field.onChange} errorMessage={errors.startTime?.message} />
        )}
      />
      <Controller
        control={control}
        name="endTime"
        render={({ field }) => (
          <DateField
            label="Ends"
            mode="datetime"
            value={field.value ?? ''}
            onChange={field.onChange}
            errorMessage={errors.endTime?.message}
            defaultValue={startTime ? new Date(new Date(startTime).getTime() + 60 * 60 * 1000) : undefined}
            minimumDate={startTime ? new Date(startTime) : undefined}
          />
        )}
      />

      {submitError ? <Text style={styles.submitError}>{submitError}</Text> : null}

      <Button label={isSubmitting ? 'Creating…' : 'Create shift'} onPress={handleSubmit(onSubmit)} disabled={isSubmitting} />
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
  submitError: {
    ...theme.typography.body,
    color: theme.colors.danger,
    marginBottom: theme.spacing.md,
  },
});
