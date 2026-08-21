import React, { useState } from 'react';
import { Text, FlatList, ScrollView, StyleSheet } from 'react-native';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { theme, Button, TextField, DateField, ListRow, Badge, EmptyState } from '../../../src/components';
import * as timeOffApi from '../../../src/api/time-off-requests.api';
import { ApiError } from '../../../src/types/api/common';
import { usePullToRefresh } from '../../../src/hooks';

const TimeOffSchema = z.object({
  startDate: z.string().min(1, 'Start date is required (YYYY-MM-DD)'),
  endDate: z.string().min(1, 'End date is required (YYYY-MM-DD)'),
  reason: z.string().min(1, 'A reason is required'), // FR-018: required, not optional
});
type TimeOffForm = z.infer<typeof TimeOffSchema>;

/** FR-018: date range + REQUIRED reason. Status shown below the form once submitted. */
export default function TimeOffScreen(): React.JSX.Element {
  const queryClient = useQueryClient();
  const [submitError, setSubmitError] = useState<string | null>(null);
  const { data: requests, refetch } = useQuery({ queryKey: ['time-off-requests', 'mine'], queryFn: timeOffApi.listMyTimeOffRequests });
  const refreshControl = usePullToRefresh({ refetch });

  const {
    control,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<TimeOffForm>({ resolver: zodResolver(TimeOffSchema) });

  async function onSubmit(values: TimeOffForm): Promise<void> {
    setSubmitError(null);
    try {
      await timeOffApi.createTimeOffRequest(values);
      reset();
      void queryClient.invalidateQueries({ queryKey: ['time-off-requests', 'mine'] });
    } catch (err) {
      setSubmitError(err instanceof ApiError ? err.message : 'Could not submit your request. Please try again.');
    }
  }

  return (
    <ScrollView refreshControl={refreshControl} contentContainerStyle={styles.container}>
      <Text style={styles.title}>Request time off</Text>

      <Controller
        control={control}
        name="startDate"
        render={({ field }) => (
          <DateField label="Start date" mode="date" value={field.value ?? ''} onChange={field.onChange} errorMessage={errors.startDate?.message} />
        )}
      />
      <Controller
        control={control}
        name="endDate"
        render={({ field }) => (
          <DateField label="End date" mode="date" value={field.value ?? ''} onChange={field.onChange} errorMessage={errors.endDate?.message} />
        )}
      />
      <Controller
        control={control}
        name="reason"
        render={({ field }) => (
          <TextField label="Reason" value={field.value ?? ''} onChangeText={field.onChange} errorMessage={errors.reason?.message} multiline />
        )}
      />

      {submitError ? <Text style={styles.error}>{submitError}</Text> : null}

      <Button label={isSubmitting ? 'Submitting…' : 'Submit request'} onPress={handleSubmit(onSubmit)} disabled={isSubmitting} />

      <Text style={styles.sectionTitle}>Your requests</Text>
      {!requests || requests.length === 0 ? (
        <EmptyState title="No requests yet" />
      ) : (
        <FlatList
          data={requests}
          keyExtractor={(r) => r.id}
          renderItem={({ item }) => (
            <ListRow
              title={`${item.start_date} – ${item.end_date}`}
              subtitle={item.reason}
              right={<Badge label={item.status} tone={item.status === 'approved' ? 'success' : item.status === 'denied' ? 'danger' : 'warning'} />}
            />
          )}
        />
      )}
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
    marginBottom: theme.spacing.md,
  },
  error: {
    ...theme.typography.body,
    color: theme.colors.danger,
    marginBottom: theme.spacing.md,
  },
  sectionTitle: {
    ...theme.typography.heading,
    color: theme.colors.textPrimary,
    marginTop: theme.spacing.lg,
    marginBottom: theme.spacing.sm,
  },
});
