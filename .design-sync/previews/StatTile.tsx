import { StatTile, StatTileGrid } from 'padelmgt-design-system';

export function Single() {
  return (
    <div style={{ background: 'var(--court-blue-deep)', padding: 16, display: 'inline-block' }}>
      <StatTile value={1240} label="Puntos" />
    </div>
  );
}

export function DashboardRow() {
  return (
    <div style={{ background: 'var(--court-blue-deep)', padding: 16 }}>
      <StatTileGrid>
        <StatTile value={1240} label="Puntos" />
        <StatTile value={18} label="Partidos" />
        <StatTile value="72%" label="Victorias" />
      </StatTileGrid>
    </div>
  );
}
