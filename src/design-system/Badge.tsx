import type { CSSProperties, ReactNode } from 'react';

export type BadgeTone = 'neutral' | 'success' | 'warning' | 'danger' | 'info' | 'primary' | 'neon' | 'outline';

/**
 * Color pairs used across the dashboard for ad-hoc status/role badges
 * (e.g. league StatusBadge/RoleBadge). Centralized here so every page
 * reuses the same palette instead of redefining its own tone map.
 */
const TONE_STYLE: Record<BadgeTone, CSSProperties> = {
  neutral: { background: 'rgba(107,114,128,0.12)', color: '#6b7280' },
  success: { background: 'rgba(34,197,94,0.12)', color: '#16a34a' },
  warning: { background: 'rgba(234,179,8,0.12)', color: '#ca8a04' },
  danger: { background: 'var(--red-500)', color: '#fff' },
  info: { background: 'rgba(37,99,235,0.12)', color: '#2563eb' },
  primary: { background: 'var(--court-blue)', color: '#fff' },
  neon: { background: 'var(--neon)', color: 'var(--black)' },
  outline: { background: '#fff', color: 'var(--black)', border: '1px solid var(--grey-300)' },
};

export type BadgeProps = {
  tone?: BadgeTone;
  children: ReactNode;
  className?: string;
};

/** Small uppercase pill label. Wraps the real `.badge` class from globals.css with a governed color palette. */
export function Badge({ tone = 'neutral', children, className }: BadgeProps) {
  return (
    <span className={['badge', className].filter(Boolean).join(' ')} style={TONE_STYLE[tone]}>
      {children}
    </span>
  );
}
