// Theme tokens, ported from the GymSync web app's CSS variables.
// Near-black background, emerald primary, no gradients in native UI.

export const colors = {
  background: '#090909',
  elevated: '#0f0f0f',
  card: 'rgba(255, 255, 255, 0.05)',
  border: 'rgba(255, 255, 255, 0.08)',
  borderStrong: 'rgba(255, 255, 255, 0.14)',
  text: '#f5f5f5',
  textSecondary: '#a0a0a0',
  textTertiary: '#6b6b6b',
  primary: '#059669',
  primaryStrong: '#10b981',
  danger: '#e5484d',
  warning: '#f5a623',
} as const;

export const spacing = {
  xs: 6,
  sm: 10,
  md: 16,
  lg: 24,
  xl: 32,
} as const;

export const radius = {
  sm: 8,
  md: 14,
  lg: 20,
} as const;
