import React, { useState } from 'react';
import { View, Text, Pressable, Modal, StyleSheet } from 'react-native';
import { theme } from './theme';
import { Button } from './Button';

export type DateFieldMode = 'date' | 'time' | 'datetime';

export interface DateFieldProps {
  label: string;
  mode: DateFieldMode;
  /** 'date' → "YYYY-MM-DD", 'time' → "HH:MM", 'datetime' → an ISO string — same string shapes
   * the existing Zod schemas and API payloads already expect, so callers don't have to convert. */
  value: string;
  onChange: (value: string) => void;
  errorMessage?: string;
  minimumDate?: Date;
  /** What the picker opens to the first time it's shown, while `value` is still unset — e.g.
   * an "Ends" field passing the already-chosen "Starts" value, so it doesn't open on
   * right-now (which, left untouched, silently submits an end time before the start). Falls
   * back to the current date/time when omitted. */
  defaultValue?: Date;
}

const WEEKDAY_LABELS = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];
const MONTH_LABELS = [
  'January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December',
];

function pad(n: number): string {
  return String(n).padStart(2, '0');
}

function toDate(value: string, mode: DateFieldMode, fallback?: Date): Date {
  if (!value) return fallback ?? new Date();
  if (mode === 'time') {
    const [h, m] = value.split(':').map(Number);
    const d = new Date();
    d.setHours(h ?? 0, m ?? 0, 0, 0);
    return d;
  }
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? (fallback ?? new Date()) : parsed;
}

function fromDate(date: Date, mode: DateFieldMode): string {
  if (mode === 'date') return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
  if (mode === 'time') return `${pad(date.getHours())}:${pad(date.getMinutes())}`;
  return date.toISOString();
}

function displayText(value: string, mode: DateFieldMode): string | null {
  if (!value) return null;
  const date = toDate(value, mode);
  if (mode === 'date') return date.toLocaleDateString('en-US', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' });
  if (mode === 'time') return date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
  return date.toLocaleString('en-US', { weekday: 'short', day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' });
}

function sameDay(a: Date, b: Date): boolean {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}
function startOfDay(d: Date): Date {
  const copy = new Date(d);
  copy.setHours(0, 0, 0, 0);
  return copy;
}

/**
 * Date/time picker with no native dependency — built entirely from RN primitives (Modal, View,
 * Pressable) rather than `@react-native-community/datetimepicker`, so it works in Expo Go
 * without a custom dev client (the native picker rendered as an empty placeholder there, since
 * Expo Go doesn't bundle that module). Replaces the mockup's `<input type="datetime-local">`
 * fields, for which there's no RN equivalent anyway.
 */
export function DateField({ label, mode, value, onChange, errorMessage, minimumDate, defaultValue }: DateFieldProps): React.JSX.Element {
  const [show, setShow] = useState(false);
  const [draft, setDraft] = useState<Date>(() => toDate(value, mode, defaultValue));

  function open(): void {
    setDraft(toDate(value, mode, defaultValue));
    setShow(true);
  }

  function confirm(): void {
    onChange(fromDate(draft, mode));
    setShow(false);
  }

  const text = displayText(value, mode);

  return (
    <View style={styles.container}>
      <Text style={styles.label}>{label}</Text>
      <Pressable
        onPress={open}
        accessibilityRole="button"
        accessibilityLabel={label}
        accessibilityHint={text ?? 'No value set'}
        style={[styles.input, errorMessage ? styles.inputError : null]}
      >
        <Text style={text ? styles.value : styles.placeholder}>{text ?? `Select ${mode === 'datetime' ? 'date & time' : mode}`}</Text>
      </Pressable>
      {errorMessage ? (
        <Text style={styles.error} accessibilityLiveRegion="polite">
          {errorMessage}
        </Text>
      ) : null}

      <Modal visible={show} transparent animationType="fade" onRequestClose={() => setShow(false)}>
        <Pressable style={styles.backdrop} onPress={() => setShow(false)}>
          <Pressable style={styles.sheet} onPress={(e) => e.stopPropagation()}>
            <Text style={styles.sheetTitle}>{label}</Text>
            {mode !== 'time' ? <CalendarGrid value={draft} onChange={setDraft} minimumDate={minimumDate} /> : null}
            {mode !== 'date' ? <TimeSteppers value={draft} onChange={setDraft} /> : null}
            <View style={styles.sheetActions}>
              <Button label="Cancel" variant="secondary" onPress={() => setShow(false)} style={styles.sheetButton} />
              <Button label="Done" onPress={confirm} style={styles.sheetButton} />
            </View>
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}

function CalendarGrid({ value, onChange, minimumDate }: { value: Date; onChange: (d: Date) => void; minimumDate?: Date }): React.JSX.Element {
  const [viewYear, setViewYear] = useState(value.getFullYear());
  const [viewMonth, setViewMonth] = useState(value.getMonth());

  const firstOfMonth = new Date(viewYear, viewMonth, 1);
  const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
  const leadingBlanks = firstOfMonth.getDay();
  const cells: Array<number | null> = [...Array(leadingBlanks).fill(null), ...Array.from({ length: daysInMonth }, (_, i) => i + 1)];
  const minDay = minimumDate ? startOfDay(minimumDate) : null;

  function selectDay(day: number): void {
    const next = new Date(value);
    next.setFullYear(viewYear, viewMonth, day);
    onChange(next);
  }

  function shiftMonth(delta: number): void {
    const next = new Date(viewYear, viewMonth + delta, 1);
    setViewYear(next.getFullYear());
    setViewMonth(next.getMonth());
  }

  return (
    <View>
      <View style={styles.calendarHeader}>
        <Pressable onPress={() => shiftMonth(-1)} accessibilityRole="button" accessibilityLabel="Previous month" hitSlop={8}>
          <Text style={styles.calendarNav}>‹</Text>
        </Pressable>
        <Text style={styles.calendarMonth}>
          {MONTH_LABELS[viewMonth]} {viewYear}
        </Text>
        <Pressable onPress={() => shiftMonth(1)} accessibilityRole="button" accessibilityLabel="Next month" hitSlop={8}>
          <Text style={styles.calendarNav}>›</Text>
        </Pressable>
      </View>
      <View style={styles.calendarWeekRow}>
        {WEEKDAY_LABELS.map((label, i) => (
          <Text key={i} style={styles.calendarWeekLabel}>
            {label}
          </Text>
        ))}
      </View>
      <View style={styles.calendarGrid}>
        {cells.map((day, i) => {
          if (day === null) return <View key={i} style={styles.calendarCell} />;
          const cellDate = new Date(viewYear, viewMonth, day);
          const disabled = Boolean(minDay && cellDate.getTime() < minDay.getTime());
          const selected = sameDay(cellDate, value);
          return (
            <Pressable
              key={i}
              onPress={() => !disabled && selectDay(day)}
              disabled={disabled}
              style={styles.calendarCell}
              accessibilityRole="button"
              accessibilityLabel={cellDate.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
              accessibilityState={{ selected, disabled }}
            >
              <View style={[styles.calendarDay, selected ? styles.calendarDaySelected : null]}>
                <Text style={[styles.calendarDayLabel, selected ? styles.calendarDayLabelSelected : null, disabled ? styles.calendarDayLabelDisabled : null]}>
                  {day}
                </Text>
              </View>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

function TimeSteppers({ value, onChange }: { value: Date; onChange: (d: Date) => void }): React.JSX.Element {
  const hour24 = value.getHours();
  const minute = value.getMinutes();
  const isPM = hour24 >= 12;
  const hour12 = ((hour24 + 11) % 12) + 1;

  function setHour12(next: number): void {
    const wrapped = ((next - 1 + 12) % 12) + 1;
    const next24 = (wrapped % 12) + (isPM ? 12 : 0);
    const d = new Date(value);
    d.setHours(next24);
    onChange(d);
  }
  function setMinute(next: number): void {
    const wrapped = (next + 60) % 60;
    const d = new Date(value);
    d.setMinutes(wrapped);
    onChange(d);
  }
  function togglePeriod(): void {
    const d = new Date(value);
    d.setHours((hour24 + 12) % 24);
    onChange(d);
  }

  return (
    <View style={styles.timeRow}>
      <Stepper label="Hour" value={pad(hour12)} onDecrease={() => setHour12(hour12 - 1)} onIncrease={() => setHour12(hour12 + 1)} />
      <Text style={styles.timeColon}>:</Text>
      <Stepper label="Minute" value={pad(minute)} onDecrease={() => setMinute(minute - 5)} onIncrease={() => setMinute(minute + 5)} />
      <Pressable onPress={togglePeriod} style={styles.periodToggle} accessibilityRole="button" accessibilityLabel={isPM ? 'PM, tap for AM' : 'AM, tap for PM'}>
        <Text style={styles.periodLabel}>{isPM ? 'PM' : 'AM'}</Text>
      </Pressable>
    </View>
  );
}

function Stepper({ label, value, onDecrease, onIncrease }: { label: string; value: string; onDecrease: () => void; onIncrease: () => void }): React.JSX.Element {
  return (
    <View style={styles.stepper}>
      <Pressable onPress={onIncrease} accessibilityRole="button" accessibilityLabel={`Increase ${label}`} style={styles.stepperButton} hitSlop={8}>
        <Text style={styles.stepperButtonLabel}>+</Text>
      </Pressable>
      <Text style={styles.stepperValue}>{value}</Text>
      <Pressable onPress={onDecrease} accessibilityRole="button" accessibilityLabel={`Decrease ${label}`} style={styles.stepperButton} hitSlop={8}>
        <Text style={styles.stepperButtonLabel}>−</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: theme.spacing.md,
  },
  label: {
    ...theme.typography.label,
    color: theme.colors.textSecondary,
    marginBottom: theme.spacing.xs,
  },
  input: {
    minHeight: theme.minTapTarget,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.radius.sm,
    paddingHorizontal: theme.spacing.sm,
    backgroundColor: theme.colors.surface,
    justifyContent: 'center',
  },
  inputError: {
    borderColor: theme.colors.danger,
  },
  value: {
    ...theme.typography.body,
    color: theme.colors.textPrimary,
  },
  placeholder: {
    ...theme.typography.body,
    color: theme.colors.textMuted,
  },
  error: {
    ...theme.typography.caption,
    color: theme.colors.danger,
    marginTop: theme.spacing.xs,
  },
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(28,31,28,0.4)',
    justifyContent: 'center',
    padding: theme.spacing.lg,
  },
  sheet: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.lg,
    padding: theme.spacing.lg,
    gap: theme.spacing.md,
    ...theme.shadows.modal,
  },
  sheetTitle: {
    ...theme.typography.heading,
    color: theme.colors.textPrimary,
  },
  sheetActions: {
    flexDirection: 'row',
    gap: theme.spacing.sm,
  },
  sheetButton: {
    flex: 1,
  },
  calendarHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  calendarNav: {
    ...theme.typography.heading,
    color: theme.colors.primary,
    paddingHorizontal: theme.spacing.sm,
  },
  calendarMonth: {
    ...theme.typography.label,
    color: theme.colors.textPrimary,
  },
  calendarWeekRow: {
    flexDirection: 'row',
  },
  calendarWeekLabel: {
    flex: 1,
    textAlign: 'center',
    ...theme.typography.caption,
    color: theme.colors.textMuted,
  },
  calendarGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  calendarCell: {
    width: `${100 / 7}%`,
    aspectRatio: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  calendarDay: {
    width: 32,
    height: 32,
    borderRadius: theme.radius.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  calendarDaySelected: {
    backgroundColor: theme.colors.primary,
  },
  calendarDayLabel: {
    ...theme.typography.body,
    fontSize: 14,
    color: theme.colors.textPrimary,
  },
  calendarDayLabelSelected: {
    color: theme.colors.primaryText,
    fontFamily: theme.typography.label.fontFamily,
  },
  calendarDayLabelDisabled: {
    color: theme.colors.disabled,
  },
  timeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: theme.spacing.sm,
  },
  timeColon: {
    ...theme.typography.title,
    color: theme.colors.textPrimary,
  },
  stepper: {
    alignItems: 'center',
    gap: theme.spacing.xs,
  },
  stepperButton: {
    width: 40,
    height: 40,
    borderRadius: theme.radius.full,
    borderWidth: 1,
    borderColor: theme.colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepperButtonLabel: {
    ...theme.typography.heading,
    color: theme.colors.primary,
  },
  stepperValue: {
    ...theme.typography.title,
    fontVariant: ['tabular-nums'],
    color: theme.colors.textPrimary,
    minWidth: 48,
    textAlign: 'center',
  },
  periodToggle: {
    marginLeft: theme.spacing.xs,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.radius.sm,
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: theme.spacing.sm,
  },
  periodLabel: {
    ...theme.typography.label,
    color: theme.colors.textPrimary,
  },
});
