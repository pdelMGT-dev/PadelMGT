import type { ReactNode } from 'react';

export type StatTileProps = { value: string | number; label: string };

/** Small stat block used in the player dashboard hero (value + uppercase label). Wraps `.bs-tile` from globals.css. */
export function StatTile({ value, label }: StatTileProps) {
  return (
    <div className="bs-tile">
      <div className="bs-tile-value">{value}</div>
      <div className="bs-tile-label">{label}</div>
    </div>
  );
}

export function StatTileGrid({ children }: { children: ReactNode }) {
  return <div className="bs-tiles">{children}</div>;
}
