import type { ReactNode } from 'react';

export type PageHeaderProps = { title: string; subtitle?: string; children?: ReactNode };

/** Public marketing page hero header (dark, full-bleed court background). Wraps `.page-header` from globals.css. */
export function PageHeader({ title, subtitle, children }: PageHeaderProps) {
  return (
    <div className="page-header">
      <div className="page-header-bg" />
      <div className="page-header-scrim" />
      <div className="page-header-content">
        <h1 className="page-title">{title}</h1>
        {subtitle && <p className="page-sub">{subtitle}</p>}
        {children}
      </div>
    </div>
  );
}

export type DashboardPageHeaderProps = { eyebrow: string; title: string; action?: ReactNode };

/** Player dashboard page header (light, eyebrow label + uppercase title). Matches Mis Ligas / Mis Juegos pattern. */
export function DashboardPageHeader({ eyebrow, title, action }: DashboardPageHeaderProps) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', gap: 16, flexWrap: 'wrap', marginBottom: 32 }}>
      <div>
        <div className="ds-eyebrow-label" style={{ marginBottom: 6 }}>{eyebrow}</div>
        <h1
          className="bs-h1"
          style={{
            fontFamily: 'var(--font-display)', fontSize: 'clamp(28px, 6vw, 40px)', fontWeight: 600,
            textTransform: 'uppercase', letterSpacing: '-0.02em', margin: 0,
          }}
        >
          {title}
        </h1>
      </div>
      {action}
    </div>
  );
}
