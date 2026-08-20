/**
 * Pure date-range helpers for the calendar's day/week/month views. Kept dependency-free and
 * side-effect-free so they're trivially unit-testable (constitution: Testable Business
 * Logic) — though calendar range math isn't itself a business rule, splitting it out keeps
 * the screen component free of date arithmetic.
 */
export type CalendarView = 'day' | 'week' | 'month';

export function startOfDay(date: Date): Date {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
}

export function addDays(date: Date, days: number): Date {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
}

export function startOfWeek(date: Date): Date {
  const d = startOfDay(date);
  const day = d.getDay(); // 0 = Sunday
  return addDays(d, -day);
}

export function startOfMonth(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

export function endOfMonth(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth() + 1, 0, 23, 59, 59, 999);
}

export function rangeForView(view: CalendarView, anchor: Date): { from: Date; to: Date } {
  switch (view) {
    case 'day': {
      const from = startOfDay(anchor);
      return { from, to: addDays(from, 1) };
    }
    case 'week': {
      const from = startOfWeek(anchor);
      return { from, to: addDays(from, 7) };
    }
    case 'month':
      return { from: startOfMonth(anchor), to: endOfMonth(anchor) };
  }
}

export function groupByDay<T extends { start_time: string }>(items: T[]): Array<{ dateKey: string; items: T[] }> {
  const groups = new Map<string, T[]>();
  for (const item of items) {
    const key = item.start_time.slice(0, 10); // YYYY-MM-DD
    const existing = groups.get(key) ?? [];
    existing.push(item);
    groups.set(key, existing);
  }
  return Array.from(groups.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([dateKey, items]) => ({ dateKey, items }));
}
