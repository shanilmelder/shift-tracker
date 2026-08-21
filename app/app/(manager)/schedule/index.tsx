import React, { useMemo, useState } from 'react';
import { View, Text, Pressable, ScrollView, FlatList, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { useQuery, useQueryClient, useMutation } from '@tanstack/react-query';
import { theme, Button, DateField, TextField, ListRow, Badge, EmptyState, Card, ConfirmDialog, SwipeToDelete } from '../../../src/components';
import { useShiftsList, useCreateShift, useDeleteShift } from '../../../src/queries/shifts.queries';
import type { Shift } from '../../../src/types/api/shifts';
import { rangeForView } from '../../../src/lib/date-ranges';
import { apiRequest } from '../../../src/api/client';
import * as templatesApi from '../../../src/api/shift-templates.api';
import { usePullToRefresh } from '../../../src/hooks';
import { ApiError } from '../../../src/types/api/common';

interface ShiftArea {
  id: string;
  name: string;
}

function formatTimeLabel(hhmm: string): string {
  const [h, m] = hhmm.split(':').map(Number);
  const d = new Date();
  d.setHours(h ?? 0, m ?? 0, 0, 0);
  return d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
}

function Chip({ label, on, onPress }: { label: string; on: boolean; onPress: () => void }): React.JSX.Element {
  return (
    <Pressable onPress={onPress} style={[styles.chip, on ? styles.chipOn : null]} accessibilityRole="button" accessibilityState={{ selected: on }}>
      <Text style={[styles.chipLabel, on ? styles.chipLabelOn : null]}>{label}</Text>
    </Pressable>
  );
}

/**
 * Manager "Build" tab (doc/design's Prototype.dc.html `mbuild`): Create shifts / Assign staff
 * as two tabs on one screen. Create defines a shift TEMPLATE — name + start/end time only, no
 * calendar date at all. Which date(s) it actually runs on is chosen in Assign instead, against
 * a picked template — one ordinary `shifts` row (a real dated instance) is created per date
 * picked there. No DB change to `shifts` itself: every instance is still a completely normal
 * row, so conflict detection, timesheets, and swaps all keep working unmodified. Staffing
 * (leader/workers) stays per-instance, via the existing Assign list → [shiftId]/staff.tsx flow.
 */
export default function BuildScreen(): React.JSX.Element {
  const router = useRouter();
  const [tab, setTab] = useState<'create' | 'assign'>('create');

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Build</Text>
      </View>
      <View style={styles.tabRow}>
        <Chip label="Create shifts" on={tab === 'create'} onPress={() => setTab('create')} />
        <Chip label="Assign staff" on={tab === 'assign'} onPress={() => setTab('assign')} />
      </View>
      {tab === 'create' ? <CreateTab onCreated={() => setTab('assign')} /> : <AssignTab router={router} />}
    </View>
  );
}

function CreateTab({ onCreated }: { onCreated: () => void }): React.JSX.Element {
  const queryClient = useQueryClient();
  const { data: areas, refetch: refetchAreas } = useQuery({ queryKey: ['shift-areas'], queryFn: () => apiRequest<ShiftArea[]>('/shift-areas') });
  const { data: templates, isLoading: templatesLoading, refetch: refetchTemplates } = useQuery({ queryKey: ['shift-templates'], queryFn: templatesApi.listShiftTemplates });
  const refreshControl = usePullToRefresh({ refetch: refetchAreas }, { refetch: refetchTemplates });

  const [name, setName] = useState('');
  const [startTime, setStartTime] = useState(''); // HH:MM
  const [endTime, setEndTime] = useState(''); // HH:MM
  const [shiftAreaId, setShiftAreaId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const createMutation = useMutation({
    mutationFn: () => templatesApi.createShiftTemplate({ name: name.trim(), startTime, endTime, shiftAreaId: shiftAreaId ?? undefined }),
    // `async` on purpose: TanStack Query awaits an async onSuccess, so the Assign tab is not
    // shown until the template list has actually refetched. Firing `onCreated()` alongside a
    // fire-and-forget invalidate raced the tab switch — Assign mounted against the stale
    // cache and the just-created shift only appeared after navigating away and back.
    onSuccess: async () => {
      setName('');
      setStartTime('');
      setEndTime('');
      setShiftAreaId(null);
      await queryClient.refetchQueries({ queryKey: ['shift-templates'] });
      onCreated();
    },
  });

  // Deleting a template cascades to every dated shift built from it (and their staffing), so
  // this is confirmed against the specific template rather than acting on a single tap.
  const [pendingDelete, setPendingDelete] = useState<templatesApi.ShiftTemplate | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const deleteMutation = useMutation({
    mutationFn: templatesApi.deleteShiftTemplate,
    onSuccess: () => {
      setDeleteError(null);
      void queryClient.invalidateQueries({ queryKey: ['shift-templates'] });
      // The cascade removed dated shifts, so the schedule list is stale too.
      void queryClient.invalidateQueries({ queryKey: ['shifts', 'list'] });
    },
    onError: (err) => {
      // The API refuses when any generated shift already has clock-in records.
      setDeleteError(err instanceof ApiError ? err.message : 'Could not delete this shift. Please try again.');
    },
  });

  function handleCreate(): void {
    setError(null);
    if (!name.trim()) return setError('Shift name is required');
    if (!startTime || !endTime) return setError('Start and end time are required');
    if (startTime >= endTime) return setError('End time must be after start time');
    createMutation.mutate();
  }

  return (
    <ScrollView contentContainerStyle={styles.tabContent} refreshControl={refreshControl}>
      <Card style={styles.card}>
        <Text style={styles.cardLabel}>New shift</Text>
        <TextField label="Shift name" placeholder="e.g. Morning floor" value={name} onChangeText={setName} />
        <View style={styles.row}>
          <View style={styles.rowItem}>
            <DateField label="Starts" mode="time" value={startTime} onChange={setStartTime} />
          </View>
          <View style={styles.rowItem}>
            <DateField label="Ends" mode="time" value={endTime} onChange={setEndTime} />
          </View>
        </View>

        {areas && areas.length > 0 ? (
          <>
            <Text style={styles.cardLabel}>Area</Text>
            <View style={styles.chipRow}>
              {areas.map((area) => (
                <Chip key={area.id} label={area.name} on={shiftAreaId === area.id} onPress={() => setShiftAreaId((v) => (v === area.id ? null : area.id))} />
              ))}
            </View>
          </>
        ) : null}

        {error ? <Text style={styles.error}>{error}</Text> : null}

        <Button label={createMutation.isPending ? 'Creating…' : 'Create shift'} onPress={handleCreate} disabled={createMutation.isPending} />
        <Text style={styles.hint}>This defines the shift's name and time of day. Pick which dates it runs on next, in Assign.</Text>
      </Card>

      <Text style={styles.sectionLabel}>Created shifts</Text>
      {templatesLoading ? (
        <Text style={styles.status}>Loading…</Text>
      ) : !templates || templates.length === 0 ? (
        <Card style={styles.emptyCard}>
          <Text style={styles.status}>No shifts created yet.</Text>
        </Card>
      ) : (
        templates.map((template) => (
          <SwipeToDelete
            key={template.id}
            onDelete={() => setPendingDelete(template)}
            accessibilityLabel={`${template.name}, ${formatTimeLabel(template.start_time)} to ${formatTimeLabel(template.end_time)}`}
          >
            <Card style={styles.templateRow}>
              <View style={styles.templateTextBlock}>
                <Text style={styles.templateName}>{template.name}</Text>
                <Text style={styles.hint}>
                  {formatTimeLabel(template.start_time)} – {formatTimeLabel(template.end_time)}
                </Text>
              </View>
            </Card>
          </SwipeToDelete>
        ))
      )}

      {deleteError ? <Text style={styles.error}>{deleteError}</Text> : null}

      <ConfirmDialog
        visible={pendingDelete !== null}
        destructive
        title="Delete this shift?"
        message={
          pendingDelete === null
            ? ''
            : pendingDelete.shift_count === 0
              ? `"${pendingDelete.name}" will be deleted. No dates have been assigned to it yet.`
              : `"${pendingDelete.name}" will be deleted, along with the ${pendingDelete.shift_count} scheduled date${
                  pendingDelete.shift_count === 1 ? '' : 's'
                } created from it and all staffing on them. Anyone staffed will be notified. This can't be undone.`
        }
        confirmLabel="Delete"
        onConfirm={() => {
          if (pendingDelete) deleteMutation.mutate(pendingDelete.id);
          setPendingDelete(null);
        }}
        onCancel={() => setPendingDelete(null)}
      />
    </ScrollView>
  );
}

function AssignTab({ router }: { router: ReturnType<typeof useRouter> }): React.JSX.Element {
  const { data: templates, isLoading: templatesLoading, refetch: refetchTemplates } = useQuery({ queryKey: ['shift-templates'], queryFn: templatesApi.listShiftTemplates });
  const refreshControl = usePullToRefresh({ refetch: refetchTemplates });
  const [selectedTemplateId, setSelectedTemplateId] = useState<string | null>(null);
  const selectedTemplate = templates?.find((t) => t.id === selectedTemplateId) ?? null;

  return (
    <ScrollView style={styles.assignContainer} contentContainerStyle={styles.tabContent} refreshControl={refreshControl}>
      <Text style={styles.sectionLabel}>Pick a shift</Text>
      {templatesLoading ? (
        <Text style={styles.status}>Loading…</Text>
      ) : !templates || templates.length === 0 ? (
        <Card style={styles.emptyCard}>
          <Text style={styles.status}>Create a shift first, in the Create shifts tab.</Text>
        </Card>
      ) : (
        templates.map((template) => (
          <Pressable
            key={template.id}
            onPress={() => setSelectedTemplateId((id) => (id === template.id ? null : template.id))}
            style={styles.templatePickRow}
            accessibilityRole="button"
            accessibilityState={{ selected: selectedTemplateId === template.id }}
          >
            <View style={styles.templateTextBlock}>
              <Text style={styles.templateName}>{template.name}</Text>
              <Text style={styles.hint}>
                {formatTimeLabel(template.start_time)} – {formatTimeLabel(template.end_time)}
              </Text>
            </View>
            <View style={[styles.radio, selectedTemplateId === template.id ? styles.radioOn : null]} />
          </Pressable>
        ))
      )}

      {selectedTemplate ? <AssignDatesPanel template={selectedTemplate} router={router} /> : null}

      <Text style={styles.sectionLabel}>Existing shifts</Text>
      <ExistingShiftsList router={router} />
    </ScrollView>
  );
}

function AssignDatesPanel({ template, router }: { template: templatesApi.ShiftTemplate; router: ReturnType<typeof useRouter> }): React.JSX.Element {
  const createShift = useCreateShift();
  const [date, setDate] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isCreating, setIsCreating] = useState(false);

  async function handleCreate(): Promise<void> {
    setError(null);
    if (!date) {
      setError('Pick the date this shift runs on');
      return;
    }

    setIsCreating(true);
    try {
      const shift = await createShift.mutateAsync({
        name: template.name,
        startTime: new Date(`${date}T${template.start_time}`).toISOString(),
        endTime: new Date(`${date}T${template.end_time}`).toISOString(),
        shiftAreaId: template.shift_area_id ?? undefined,
        templateId: template.id,
      });
      setDate('');
      // Creating a dated shift and staffing it are one continuous task, so this goes straight
      // to step 2 rather than leaving the manager to find the new row in the list below.
      router.push(`/(manager)/schedule/${shift.id}/staff`);
    } catch {
      setError('Could not create the shift. Please try again.');
    } finally {
      setIsCreating(false);
    }
  }

  return (
    <Card style={styles.card}>
      <Text style={styles.cardLabel}>
        {template.name} · {formatTimeLabel(template.start_time)}–{formatTimeLabel(template.end_time)}
      </Text>
      <DateField label="Shift date" mode="date" value={date} onChange={setDate} />

      {error ? <Text style={styles.error}>{error}</Text> : null}

      <Button label={isCreating ? 'Creating…' : 'Create shift'} onPress={handleCreate} disabled={isCreating} />
    </Card>
  );
}

function ExistingShiftsList({ router }: { router: ReturnType<typeof useRouter> }): React.JSX.Element {
  const { from, to } = useMemo(() => rangeForView('month', new Date()), []);
  const { data: shifts, isLoading, refetch: refetchShifts } = useShiftsList({ from: from.toISOString(), to: to.toISOString() });
  const refreshControl = usePullToRefresh({ refetch: refetchShifts });

  const deleteShift = useDeleteShift();
  const [pendingDelete, setPendingDelete] = useState<Shift | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  function confirmDelete(): void {
    const shift = pendingDelete;
    setPendingDelete(null);
    if (!shift) return;
    setDeleteError(null);
    deleteShift.mutate(shift.id, {
      // The API refuses when the shift already has clock-in records (409).
      onError: (err) => setDeleteError(err instanceof ApiError ? err.message : 'Could not delete this shift. Please try again.'),
    });
  }

  if (isLoading) return <Text style={styles.status}>Loading schedule…</Text>;
  if (!shifts || shifts.length === 0) {
    return <EmptyState refreshControl={refreshControl} title="No shifts yet" message="Create and assign a shift above to see it here." />;
  }

  return (
    <>
      {deleteError ? <Text style={styles.error}>{deleteError}</Text> : null}
      <FlatList
        refreshControl={refreshControl}
        data={[...shifts].sort((a, b) => a.start_time.localeCompare(b.start_time))}
        keyExtractor={(shift) => shift.id}
        scrollEnabled={false}
        renderItem={({ item: shift }) => (
          <SwipeToDelete onDelete={() => setPendingDelete(shift)} accessibilityLabel={shift.name}>
            <ListRow
              title={shift.name}
              subtitle={`${new Date(shift.start_time).toLocaleString([], { weekday: 'short', month: 'short', day: 'numeric' })} · ${new Date(shift.start_time).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })} – ${new Date(shift.end_time).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}`}
              onPress={() => router.push(`/(manager)/schedule/${shift.id}/edit`)}
              right={<Badge label={shift.status} tone={shift.status === 'draft' ? 'warning' : 'neutral'} />}
            />
          </SwipeToDelete>
        )}
      />

      <ConfirmDialog
        visible={pendingDelete !== null}
        destructive
        title="Delete this shift?"
        message={
          pendingDelete === null
            ? ''
            : `"${pendingDelete.name}" will be permanently deleted, along with any staffing on it. Anyone staffed will be notified. This can't be undone.`
        }
        confirmLabel="Delete"
        onConfirm={confirmDelete}
        onCancel={() => setPendingDelete(null)}
      />
    </>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.background },
  header: { padding: theme.spacing.md, paddingBottom: 0 },
  title: { ...theme.typography.title, color: theme.colors.textPrimary },
  tabRow: { flexDirection: 'row', gap: theme.spacing.xs, paddingHorizontal: theme.spacing.md, paddingVertical: theme.spacing.sm },
  tabContent: { padding: theme.spacing.md, paddingTop: 0, gap: theme.spacing.sm },
  assignContainer: { flex: 1 },
  card: { gap: theme.spacing.xs },
  emptyCard: { alignItems: 'center' },
  cardLabel: { ...theme.typography.overline, color: theme.colors.textMuted, marginTop: theme.spacing.xs },
  sectionLabel: { ...theme.typography.overline, color: theme.colors.textMuted, marginTop: theme.spacing.sm },
  row: { flexDirection: 'row', gap: theme.spacing.sm },
  rowItem: { flex: 1 },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: theme.spacing.xs },
  chip: {
    borderRadius: theme.radius.full,
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: 7,
    borderWidth: 1,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.surface,
    minHeight: theme.minTapTarget,
    justifyContent: 'center',
  },
  chipOn: { borderColor: theme.colors.primary },
  chipLabel: { ...theme.typography.label, color: theme.colors.textSecondary },
  chipLabelOn: { color: theme.colors.primary, fontWeight: '600' },
  hint: { ...theme.typography.caption, color: theme.colors.textMuted },
  error: { ...theme.typography.body, color: theme.colors.danger },
  success: { ...theme.typography.body, color: theme.colors.primary },
  status: { ...theme.typography.body, color: theme.colors.textSecondary },
  templateRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  templatePickRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.radius.md,
    padding: theme.spacing.md,
    minHeight: theme.minTapTarget,
  },
  templateTextBlock: { flexShrink: 1 },
  templateName: { ...theme.typography.body, color: theme.colors.textPrimary },
  radio: {
    width: 20,
    height: 20,
    borderRadius: theme.radius.full,
    borderWidth: 1,
    borderColor: theme.colors.borderStrong,
    backgroundColor: theme.colors.surface,
  },
  radioOn: {
    borderColor: theme.colors.primary,
    backgroundColor: theme.colors.primary,
  },
});
