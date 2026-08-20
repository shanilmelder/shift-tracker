import React, { useState } from 'react';
import { View, Text, Pressable, Platform, StyleSheet } from 'react-native';
import DateTimePicker, { type DateTimePickerEvent } from '@react-native-community/datetimepicker';
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
   * an "Ends" field passing the already-chosen "Starts" value, so the wheel doesn't open on
   * right-now (which, left untouched, silently submits an end time before the start). Falls
   * back to the current date/time when omitted. */
  defaultValue?: Date;
}

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
  return Number.isNaN(parsed.getTime()) ? new Date() : parsed;
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

/**
 * Native date/time picker behind a TextField-styled trigger (replaces the free-typed
 * "YYYY-MM-DD" / "HH:MM" / ISO string fields the mockup instead renders as
 * `<input type="datetime-local">` — there's no RN equivalent of that single HTML control, so
 * this is the native-picker version of the same idea). iOS keeps the spinner open under the
 * field with an explicit Done button, since iOS's picker fires continuously and never closes
 * itself; Android's picker is a self-dismissing dialog.
 */
export function DateField({ label, mode, value, onChange, errorMessage, minimumDate, defaultValue }: DateFieldProps): React.JSX.Element {
  const [show, setShow] = useState(false);

  function handleChange(event: DateTimePickerEvent, selected?: Date): void {
    if (Platform.OS === 'android') setShow(false);
    if (event.type === 'dismissed' || !selected) return;
    onChange(fromDate(selected, mode));
  }

  const text = displayText(value, mode);

  return (
    <View style={styles.container}>
      <Text style={styles.label}>{label}</Text>
      <Pressable
        onPress={() => setShow(true)}
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
      {show ? (
        <View style={styles.pickerWrap}>
          <DateTimePicker
            value={toDate(value, mode, defaultValue)}
            mode={mode === 'datetime' ? 'datetime' : mode}
            display={Platform.OS === 'ios' ? 'spinner' : 'default'}
            onChange={handleChange}
            minimumDate={minimumDate}
          />
          {Platform.OS === 'ios' ? <Button label="Done" variant="secondary" onPress={() => setShow(false)} /> : null}
        </View>
      ) : null}
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
  pickerWrap: {
    marginTop: theme.spacing.xs,
    alignItems: 'center',
  },
});
