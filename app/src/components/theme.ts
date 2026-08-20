/**
 * The single source of colors, spacing, and typography for the entire app (constitution:
 * Consistent Design System). Every shared component in this directory reads only from here —
 * no screen defines its own one-off color, spacing value, or type style.
 */

export const colors = {
  background: '#FFFFFF',
  surface: '#F5F6F8',
  border: '#E1E4E8',
  textPrimary: '#1A1D23',
  textSecondary: '#5B6270',
  primary: '#2F6FED',
  primaryText: '#FFFFFF',
  success: '#1E8E5A',
  warning: '#B5720B',
  danger: '#C4362D',
  disabled: '#C7CBD1',
} as const;

export const spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
} as const;

export const typography = {
  fontFamily: undefined, // system default; override once a brand font is chosen
  title: { fontSize: 24, fontWeight: '700' as const, lineHeight: 30 },
  heading: { fontSize: 18, fontWeight: '600' as const, lineHeight: 24 },
  body: { fontSize: 16, fontWeight: '400' as const, lineHeight: 22 },
  caption: { fontSize: 13, fontWeight: '400' as const, lineHeight: 18 },
} as const;

/**
 * Minimum tap target size (constitution: Accessibility) — every interactive shared component
 * must be at least this tall/wide, matching the larger of the two major platforms'
 * recommendations (iOS: 44pt, Android: 48dp).
 */
export const minTapTarget = 48;

export const theme = { colors, spacing, typography, minTapTarget } as const;

export type Theme = typeof theme;
