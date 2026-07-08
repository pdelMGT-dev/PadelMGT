import type { ReactNode } from 'react';

export type EmptyStateProps = { title: string; description: string; action?: ReactNode };

/** Dashed placeholder box for empty lists, with title/description/CTA. Matches the Mis Ligas empty state. */
export function EmptyState({ title, description, action }: EmptyStateProps) {
  return (
    <div style={{ border: '1px dashed var(--grey-300)', padding: 'clamp(40px, 8vw, 64px) 24px', textAlign: 'center', background: 'var(--grey-50)' }}>
      <div style={{ fontFamily: 'var(--font-display)', fontSize: 24, fontWeight: 600, textTransform: 'uppercase', color: 'var(--grey-300)', marginBottom: 12 }}>
        {title}
      </div>
      <div style={{ fontSize: 14, color: 'var(--grey-400)', maxWidth: 420, margin: '0 auto 28px' }}>
        {description}
      </div>
      {action}
    </div>
  );
}
