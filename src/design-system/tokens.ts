/**
 * PadelMGT design tokens — mirrors the CSS custom properties declared in
 * src/app/globals.css `:root`. Kept as a TS object for design tooling that
 * wants token values outside of CSS; the CSS variables remain the source
 * of truth at runtime.
 */
export const colors = {
  black: '#111111',
  white: '#FFFFFF',
  neon: '#d6ff00',
  courtBlue: '#1a4ed8',
  courtBlueDeep: '#0a1638',
  turfGreen: '#1eaa52',
  bsLight: '#6fa3ff',
  grey50: '#FAFAFA',
  grey100: '#F5F5F5',
  grey200: '#E5E5E5',
  grey300: '#CACACB',
  grey400: '#9E9EA0',
  grey500: '#707072',
  grey700: '#39393B',
  grey800: '#28282A',
  grey900: '#1F1F21',
  textPrimary: '#111111',
  textSecondary: '#707072',
  red500: '#EE0005',
  green500: '#1EAA52',
} as const;

export const fonts = {
  display: "'Oswald', 'Helvetica Neue Condensed', Helvetica, Arial, sans-serif",
  body: "'Inter', Helvetica, Arial, sans-serif",
} as const;

export const motion = {
  easeStandard: 'cubic-bezier(0.4, 0, 0.2, 1)',
  durBase: '200ms',
} as const;
