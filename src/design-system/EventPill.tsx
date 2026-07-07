import type { ReactNode } from 'react';

export type EventPillKind = 'tournament' | 'league' | 'quick';

export type EventPillProps = { kind?: EventPillKind; children: ReactNode };

/** Small colored calendar event label. Wraps `.event-pill` from globals.css. */
export function EventPill({ kind, children }: EventPillProps) {
  return <span className={['event-pill', kind].filter(Boolean).join(' ')}>{children}</span>;
}
