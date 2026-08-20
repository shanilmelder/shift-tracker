import React, { useMemo, useState } from 'react';
import { View, Text, Pressable, ScrollView, FlatList, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { useQuery, useQueryClient, useMutation } from '@tanstack/react-query';
import { theme, Button, DateField, TextField, ListRow, Badge, EmptyState, Card } from '../../../src/components';
import { useShiftsList, useCreateShift } from '../../../src/queries/shifts.queries';
import { rangeForView } from '../../../src/lib/date-ranges';
import { apiRequest } from '../../../src/api/client';
import * as templatesApi from '../../../src/api/shift-templates.api';

const WEEKDAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const WEEKDAYS = [1, 2, 3, 4, 5];
const WEEKEND = [0, 6];

interface ShiftArea {
  id: string;
  name: string;
}

function pad(n: number): string {
  return String(n).padStart(2, '0');
}

function formatTimeLabel(hhmm: string): string {
  const [h, m] = hhmm.split(':').map(Number);
  const d = new Date();
  d.setHours(h ?? 0, m ?? 0, 0, 0);
  return d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
}

/** Every calendar date (YYYY-MM-DD) from `startDate` to `endDate` inclusive whose weekday is in `weekdays`. */
function datesInRange(startDate: string, endDate: string, weekdays: Set<number>): string[] {
  if (!startDate || !endDate || weekdays.size === 0) return [];
  const dates: string[] = [];
  const cursor = new Date(`${startDate}T00:00:00`);
  const end = new Date(`${endDate}T00:00:00`);
  while (cursor.getTime() <= end.getTime()) {
    if (weekdays.has(cursor.getDay())) {
      dates.push(`${cursor.getFullYear()}-${pad(cursor.getMonth() + 1)}-${pad(cursor.getDate())}`);
    }
    cursor.setDate(cursor.getDate() + 1);
  }
  return dates;
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
  const { data: areas } = useQuery({ queryKey: ['shift-areas'], queryFn: () => apiRequest<ShiftArea[]>('/shift-areas') });
  const { data: templates, isLoading: templatesLoading } = useQuery({ queryKey: ['shift-templates'], queryFn: templatesApi.listShiftTemplates });

  const [name, setName] = useState('');
  const [startTime, setStartTime] = useState(''); // HH:MM
  const [endTime, setEndTime] = useState(''); // HH:MM
  const [shiftAreaId, setShiftAreaId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const createMutation = useMutation({
    mutationFn: () => templatesApi.createShiftTemplate({ name: name.trim(), startTime, endTime, shiftAreaId: shiftAreaId ?? undefined }),
    onSuccess: () => {
      setName('');
      setStartTime('');
      setEndTime('');
      setShiftAreaId(null);
      void queryClient.invalidateQueries({ queryKey: ['shift-templates'] });
      onCreated();
    },
  });

  const deleteMutation = useMutation({
    mutationFn: templatesApi.deleteShiftTemplate,
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: ['shift-templates'] }),
  });

  function handleCreate(): void {
    setError(null);
    if (!name.trim()) return setError('Shift name is required');
    if (!startTime || !endTime) return setError('Start and end time are required');
    if (startTime >= endTime) return setError('End time must be after start time');
    createMutation.mutate();
  }

  return (
    <ScrollView contentContainerStyle={styles.tabContent}>
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
          <Card key={template.id} style={styles.templateRow}>
            <View style={styles.templateTextBlock}>
              <Text style={styles.templateName}>{template.name}</Text>
              <Text style={styles.hint}>
                {formatTimeLabel(template.start_time)} – {formatTimeLabel(template.end_time)}
              </Text>
            </View>
            <Pressable onPress={() => deleteMutation.mutate(template.id)} accessibilityRole="button" accessibilityLabel={`Delete ${template.name}`}>
              <Text style={styles.deleteLabel}>Delete</Text>
            </Pressable>
          </Card>
        ))
      )}
    </ScrollView>
  );
}

function AssignTab({ router }: { router: ReturnType<typeof useRouter> }): React.JSX.Element {
  const { data: templates, isLoading: templatesLoading } = useQuery({ queryKey: ['shift-templates'], queryFn: templatesApi.listShiftTemplates });
  const [selectedTemplateId, setSelectedTemplateId] = useState<string | null>(null);
  const selectedTemplate = templates?.find((t) => t.id === selectedTemplateId) ?? null;

  return (
    <ScrollView style={styles.assignContainer} contentContainerStyle={styles.tabContent}>
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

      {selectedTemplate ? <AssignDatesPanel template={selectedTemplate} /> : null}

      <Text style={styles.sectionLabel}>Existing shifts</Text>
      <ExistingShiftsList router={router} />
    </ScrollView>
  );
}

function AssignDatesPanel({ template }: { template: templatesApi.ShiftTemplate }): React.JSX.Element {
  const createShift = useCreateShift();
  const queryClient = useQueryClient();
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [weekdays, setWeekdays] = useState<Set<number>>(new Set());
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<string | null>(null);
  const [isCreating, setIsCreating] = useState(false);

  function toggleWeekday(day: number): void {
    setWeekdays((prev) => {
      const next = new Set(prev);
      if (next.has(day)) next.delete(day);
      else next.add(day);
      return next;
    });
  }

  const matchingDates = useMemo(() => datesInRange(startDate, endDate, weekdays), [startDate, endDate, weekdays]);

  async function handleCreate(): Promise<void> {
    setError(null);
    setResult(null);
    if (matchingDates.length === 0) return setError('Pick a date range and at least one day of the week');

    setIsCreating(true);
    try {
      for (const date of matchingDates) {
        await createShift.mutateAsync({
          name: template.name,
          startTime: new Date(`${date}T${template.start_time}`).toISOString(),
          endTime: new Date(`${date}T${template.end_time}`).toISOString(),
          shiftAreaId: template.shift_area_id ?? undefined,
        });
      }
      setResult(`Created ${matchingDates.length} shift${matchingDates.length === 1 ? '' : 's'} — staff them below.`);
      setStartDate('');
      setEndDate('');
      setWeekdays(new Set());
      void queryClient.invalidateQueries({ queryKey: ['shifts', 'list'] });
    } catch {
      setError('Could not create every date — check below for what was saved and try again for the rest.');
    } finally {
      setIsCreating(false);
    }
  }

  return (
    <Card style={styles.card}>
      <Text style={styles.cardLabel}>
        {template.name} · {formatTimeLabel(template.start_time)}–{formatTimeLabel(template.end_time)}
      </Text>
      <Text style={styles.cardLabel}>Which days</Text>
      <View style={styles.row}>
        <View style={styles.rowItem}>
          <DateField label="From" mode="date" value={startDate} onChange={setStartDate} />
        </View>
        <View style={styles.rowItem}>
          <DateField label="To" mode="date" value={endDate} onChange={setEndDate} minimumDate={startDate ? new Date(`${startDate}T00:00:00`) : undefined} />
        </View>
      </View>
      <View style={styles.chipRow}>
        {WEEKDAY_LABELS.map((label, day) => (
          <Chip key={day} label={label} on={weekdays.has(day)} onPress={() => toggleWeekday(day)} />
        ))}
      </View>
      <View style={styles.chipRow}>
        <Chip label="Weekdays" on={false} onPress={() => setWeekdays(new Set(WEEKDAYS))} />
        <Chip label="Weekend" on={false} onPress={() => setWeekdays(new Set(WEEKEND))} />
        <Chip label="All" on={false} onPress={() => setWeekdays(new Set([0, 1, 2, 3, 4, 5, 6]))} />
        <Chip label="Clear" on={false} onPress={() => setWeekdays(new Set())} />
      </View>

      {matchingDates.length > 0 ? (
        <Text style={styles.hint}>
          {matchingDates.length} shift{matchingDates.length === 1 ? '' : 's'} will be created.
        </Text>
      ) : null}
      {error ? <Text style={styles.error}>{error}</Text> : null}
      {result ? <Text style={styles.success}>{result}</Text> : null}

      <Button label={isCreating ? 'Creating…' : 'Create shift(s)'} onPress={handleCreate} disabled={isCreating} />
    </Card>
  );
}

function ExistingShiftsList({ router }: { router: ReturnType<typeof useRouter> }): React.JSX.Element {
  const { from, to } = useMemo(() => rangeForView('month', new Date()), []);
  const { data: shifts, isLoading } = useShiftsList({ from: from.toISOString(), to: to.toISOString() });

  if (isLoading) return <Text style={styles.status}>Loading schedule…</Text>;
  if (!shifts || shifts.length === 0) return <EmptyState title="No shifts yet" message="Create and assign a shift above to see it here." />;

  return (
    <FlatList
      data={[...shifts].sort((a, b) => a.start_time.localeCompare(b.start_time))}
      keyExtractor={(shift) => shift.id}
      scrollEnabled={false}
      renderItem={({ item: shift }) => (
        <ListRow
          title={shift.name}
          subtitle={`${new Date(shift.start_time).toLocaleString([], { weekday: 'short', month: 'short', day: 'numeric' })} · ${new Date(shift.start_time).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })} – ${new Date(shift.end_time).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}`}
          onPress={() => router.push(`/(manager)/schedule/${shift.id}/staff`)}
          right={<Badge label={shift.status} tone={shift.status === 'draft' ? 'warning' : 'neutral'} />}
        />
      )}
    />
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
  deleteLabel: { ...theme.typography.label, color: theme.colors.danger },
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
