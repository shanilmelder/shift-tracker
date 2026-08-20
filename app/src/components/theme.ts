/**
 * The single source of colors, spacing, and typography for the entire app (constitution:
 * Consistent Design System). Every shared component in this directory reads only from here —
 * no screen defines its own one-off color, spacing value, or type style.
 *
 * Values are transcribed from the design system's token CSS under doc/design/_ds/ — see
 * doc/design/screens/ for the app rendered against it.
 */

export const colors = {
  background: '#FAFAF8',
  surface: '#FFFFFF',
  surfaceMuted: '#F2F1ED',
  border: '#E3E1DA',
  borderStrong: '#CDCAC0',
  textPrimary: '#1C1F1C',
  textSecondary: '#5F635C',
  textMuted: '#8B8F87',
  primary: '#1F6F4A',
  primaryHover: '#175A3B',
  primaryText: '#FFFFFF',
  /** Soft accent tint — pills/banners that highlight a selected or in-progress state (e.g. the
   * dashboard's location pill, a claimed-shift confirmation) without using the full solid fill. */
  accentSoft: '#E6F1EA',
  success: '#1F6F4A',
  warning: '#C2410C',
  danger: '#A03428',
  disabled: '#C7CBD1',
  /** The design system's fixed 2-tone chart palette (chart-1/chart-2) — for a chart's
   * positive/negative bars specifically, kept distinct from `success`/`danger` since those are
   * for UI state (a validation error, a destructive action), not data values. */
  chartPositive: '#1F6F4A',
  chartNegative: '#B4462F',
} as const;

export const spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
} as const;

export const radius = {
  sm: 4,
  md: 8,
  lg: 12,
  full: 9999,
} as const;

export const shadows = {
  raised: {
    shadowColor: '#1C1F1C',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  overlay: {
    shadowColor: '#1C1F1C',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 4,
  },
  modal: {
    shadowColor: '#1C1F1C',
    shadowOffset: { width: 0, height: 16 },
    shadowOpacity: 0.16,
    shadowRadius: 40,
    elevation: 16,
  },
} as const;

import type { TextStyle } from 'react-native';

// A pre-typed (mutable) array, not a fresh literal — so the `as const` below, which would
// otherwise freeze an inline array into a readonly tuple RN's TextStyle.fontVariant rejects,
// leaves this reference alone.
const tabularNums: TextStyle['fontVariant'] = ['tabular-nums'];

/**
 * Fraunces (titular text) and Inter (everything else) — loaded via `useFonts` in the root
 * layout. These family names must match the keys passed to `useFonts` there.
 */
export const fontFamilies = {
  display: 'Fraunces_600SemiBold',
  sansRegular: 'Inter_400Regular',
  sansMedium: 'Inter_500Medium',
  sansSemiBold: 'Inter_600SemiBold',
} as const;

export const typography = {
  title: { fontFamily: fontFamilies.display, fontSize: 32, lineHeight: 40 },
  heading: { fontFamily: fontFamilies.display, fontSize: 20, lineHeight: 28 },
  body: { fontFamily: fontFamilies.sansRegular, fontSize: 16, lineHeight: 24 },
  label: { fontFamily: fontFamilies.sansMedium, fontSize: 14, lineHeight: 20 },
  overline: {
    fontFamily: fontFamilies.sansMedium,
    fontSize: 12,
    lineHeight: 16,
    letterSpacing: 0.48,
    textTransform: 'uppercase' as const,
  },
  caption: { fontFamily: fontFamilies.sansRegular, fontSize: 12, lineHeight: 16 },
  /** KPI/timer figures — tabular-nums so columns of numbers align and don't jitter as they change. */
  value: {
    fontFamily: fontFamilies.sansSemiBold,
    fontSize: 20,
    lineHeight: 28,
    fontVariant: tabularNums,
  },
} as const;

/**
 * Minimum tap target size (constitution: Accessibility) — every interactive shared component
 * must be at least this tall/wide, matching the larger of the two major platforms'
 * recommendations (iOS: 44pt, Android: 48dp).
 */
export const minTapTarget = 48;

export const theme = { colors, spacing, radius, shadows, typography, minTapTarget } as const;

export type Theme = typeof theme;
