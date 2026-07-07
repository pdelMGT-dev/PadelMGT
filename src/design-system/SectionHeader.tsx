import type { ReactNode } from 'react';

export type SectionHeaderProps = { eyebrow: string; title: string; subtitle?: string; action?: ReactNode };

/** Marketing section header (eyebrow + big uppercase title + optional subtitle/action). Wraps `.section-*` classes from globals.css. */
export function SectionHeader({ eyebrow, title, subtitle, action }: SectionHeaderProps) {
  return (
    <div className="section-header-row">
      <div>
        <div className="section-eyebrow">{eyebrow}</div>
        <h2 className="section-title">{title}</h2>
        {subtitle && <p className="section-sub">{subtitle}</p>}
      </div>
      {action}
    </div>
  );
}
