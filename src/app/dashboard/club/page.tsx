'use client';

import Link from 'next/link';
import { useState, useEffect } from 'react';
import { getAllGames } from '@/lib/game-store';
import type { ActiveGame, GameFormat } from '@/lib/game-engine';

// ── Mock data ─────────────────────────────────────────────────────────────────

const MOCK_MEMBERS = [
  { id: 'm1', name: 'Valentina Cruz',    ranking: 1420, joined: '12 Ene 2026' },
  { id: 'm2', name: 'Roberto Paz',       ranking: 1380, joined: '15 Ene 2026' },
  { id: 'm3', name: 'Camila Ortiz',      ranking: 1510, joined: '02 Feb 2026' },
  { id: 'm4', name: 'Santiago Mora',     ranking: 1290, joined: '14 Feb 2026' },
  { id: 'm5', name: 'Lucía Fernández',   ranking: 1470, joined: '01 Mar 2026' },
  { id: 'm6', name: 'Diego Herrera',     ranking: 1350, joined: '20 Mar 2026' },
  { id: 'm7', name: 'Ana González',      ranking: 1600, joined: '05 Abr 2026' },
  { id: 'm8', name: 'Marcos Rodríguez',  ranking: 1240, joined: '22 Abr 2026' },
];

const MOCK_COURTS = [
  { name: 'Cancha 1', status: 'Disponible'   as const },
  { name: 'Cancha 2', status: 'Ocupada'      as const },
  { name: 'Cancha 3', status: 'Disponible'   as const },
  { name: 'Cancha 4', status: 'Ocupada'      as const },
  { name: 'Cancha 5', status: 'Mantenimiento' as const },
  { name: 'Cancha 6', status: 'Disponible'   as const },
];

// ── Helpers ───────────────────────────────────────────────────────────────────

const TODAY = new Date().toISOString().slice(0, 10); // 'YYYY-MM-DD'

function isActive(game: ActiveGame): boolean {
  return (
    game.date === TODAY ||
    game.status === 'live' ||
    game.status === 'starting_soon' ||
    game.status === 'created'
  );
}

const TOURNAMENT_FORMATS: GameFormat[] = [
  'round_robin',
  'knockout',
  'world_cup',
  'team_league',
];

function gameAdminHref(game: ActiveGame): string {
  if (TOURNAMENT_FORMATS.includes(game.format)) {
    return `/dashboard/player/tournaments/${game.id}`;
  }
  return `/dashboard/player/quick-game/${game.id}`;
}

function statusLabel(status: ActiveGame['status']): string {
  switch (status) {
    case 'live':          return 'EN VIVO';
    case 'starting_soon': return 'PRONTO';
    case 'created':       return 'CREADO';
    case 'finished':      return 'FINALIZADO';
  }
}

function statusBg(status: ActiveGame['status']): string {
  switch (status) {
    case 'live':          return 'var(--turf-green)';
    case 'starting_soon': return '#f5a623';
    case 'created':       return '#7c3aed';
    case 'finished':      return 'var(--grey-400)';
  }
}

function formatLabel(fmt: GameFormat): string {
  const map: Record<GameFormat, string> = {
    americano:   'Americano',
    mexicano:    'Mexicano',
    round_robin: 'Round Robin',
    team_league: 'Team League',
    knockout:    'Knockout',
    world_cup:   'World Cup',
  };
  return map[fmt] ?? fmt;
}

function initials(name: string): string {
  return name
    .split(' ')
    .map((w) => w[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();
}

// ── Court status dot color ────────────────────────────────────────────────────

function courtDotColor(status: 'Disponible' | 'Ocupada' | 'Mantenimiento'): string {
  if (status === 'Disponible')    return 'var(--turf-green)';
  if (status === 'Ocupada')       return 'var(--red-500, #ee0005)';
  return '#f5a623';
}

// ── Styles ────────────────────────────────────────────────────────────────────

const sectionTitle: React.CSSProperties = {
  fontSize: 11,
  letterSpacing: '0.14em',
  textTransform: 'uppercase',
  fontWeight: 700,
  color: 'var(--grey-500)',
};

const cardStyle: React.CSSProperties = {
  background: '#fff',
  border: '1px solid var(--grey-200)',
};

// ══════════════════════════════════════════════════════════════════════════════
// PAGE COMPONENT
// ══════════════════════════════════════════════════════════════════════════════

export default function ClubAdminDashboard() {
  const [games, setGames] = useState<ActiveGame[]>([]);
  const [showMembers, setShowMembers] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    setGames(getAllGames());
  }, []);

  const activeGames = games.filter(isActive);

  return (
    <div style={{ fontFamily: 'var(--font-body)', color: 'var(--black)', background: 'var(--grey-50)', minHeight: '100vh' }}>

      {/* ── Back nav ── */}
      <div style={{ padding: '16px 40px 0', display: 'flex', alignItems: 'center' }}>
        <Link
          href="/dashboard/player/quick-game"
          style={{
            fontSize: 12,
            fontWeight: 700,
            letterSpacing: '0.08em',
            textTransform: 'uppercase',
            color: 'var(--grey-500)',
            textDecoration: 'none',
            display: 'inline-flex',
            alignItems: 'center',
            gap: 6,
          }}
        >
          ← Dashboard
        </Link>
      </div>

      {/* ── Header ── */}
      <div style={{ padding: '32px 40px 40px' }}>
        <div style={{ fontSize: 11, letterSpacing: '0.18em', textTransform: 'uppercase', color: 'var(--grey-500)', fontWeight: 600, marginBottom: 8 }}>
          Panel de administración
        </div>
        <h1
          style={{
            fontFamily: 'var(--font-display)',
            fontSize: 40,
            fontWeight: 600,
            textTransform: 'uppercase',
            letterSpacing: '-0.02em',
            margin: '0 0 6px',
            lineHeight: 1,
          }}
        >
          MI CLUB
        </h1>
        <div style={{ fontSize: 15, color: 'var(--grey-500)', fontWeight: 500 }}>Club Barrio Norte</div>
      </div>

      {/* ── Stats bar ── */}
      <div style={{ margin: '0 40px 32px', display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 1, background: 'var(--grey-200)' }}>
        {[
          { label: 'Torneos activos', value: '2' },
          { label: 'Miembros',         value: '148' },
          { label: 'Canchas',          value: '6' },
        ].map((s) => (
          <div key={s.label} style={{ background: '#fff', padding: '24px 28px' }}>
            <div style={{ fontFamily: 'var(--font-display)', fontSize: 44, fontWeight: 600, letterSpacing: '-0.03em', color: 'var(--black)', lineHeight: 1 }}>
              {s.value}
            </div>
            <div style={{ fontSize: 11, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--grey-400)', fontWeight: 600, marginTop: 6 }}>
              {s.label}
            </div>
          </div>
        ))}
      </div>

      {/* ── Quick actions ── */}
      <div style={{ margin: '0 40px 32px', display: 'flex', gap: 10, flexWrap: 'wrap' }}>
        <Link
          href="/dashboard/player/tournaments?create=true"
          className="btn btn-primary btn-sm"
          style={{ borderRadius: 0 }}
        >
          + Crear Torneo
        </Link>
        <Link
          href="/dashboard/player/tournaments"
          className="btn btn-secondary btn-sm"
          style={{ borderRadius: 0 }}
        >
          Ver mis torneos
        </Link>
        <button
          onClick={() => setShowMembers((v) => !v)}
          className={`btn btn-sm${showMembers ? ' btn-primary' : ' btn-secondary'}`}
          style={{ borderRadius: 0 }}
        >
          {showMembers ? 'Ocultar miembros' : 'Gestionar miembros'}
        </button>
      </div>

      {/* ── Active tournaments ── */}
      <div style={{ margin: '0 40px 32px' }}>
        <div style={{ ...cardStyle }}>
          {/* header row */}
          <div style={{ padding: '16px 24px', borderBottom: '1px solid var(--grey-200)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={sectionTitle}>Torneos activos</span>
            <Link href="/dashboard/player/tournaments" style={{ fontSize: 12, color: 'var(--black)', fontWeight: 600, textDecoration: 'none' }}>
              Ver todos →
            </Link>
          </div>

          {activeGames.length === 0 ? (
            <div style={{ padding: '48px 24px', textAlign: 'center', color: 'var(--grey-400)', fontSize: 14 }}>
              No hay torneos activos
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 1, background: 'var(--grey-200)' }}>
              {activeGames.map((game) => (
                <div
                  key={game.id}
                  style={{ background: '#fff', padding: '18px 24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 16, flexWrap: 'wrap' }}
                >
                  {/* Left info */}
                  <div style={{ flex: '1 1 auto', minWidth: 200 }}>
                    <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 6, flexWrap: 'wrap' }}>
                      {/* Status badge */}
                      <span
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: 5,
                          padding: '3px 10px',
                          background: statusBg(game.status),
                          color: '#fff',
                          fontSize: 9,
                          fontWeight: 700,
                          letterSpacing: '0.1em',
                          textTransform: 'uppercase',
                        }}
                      >
                        {game.status === 'live' && (
                          <span style={{ width: 6, height: 6, background: '#fff', borderRadius: '50%', display: 'inline-block' }} />
                        )}
                        {statusLabel(game.status)}
                      </span>
                      {/* Format chip */}
                      <span className="chip" style={{ fontSize: 10 }}>{formatLabel(game.format)}</span>
                    </div>

                    <div style={{ fontWeight: 600, fontSize: 15 }}>{game.name}</div>

                    <div style={{ display: 'flex', gap: 16, marginTop: 4, flexWrap: 'wrap' }}>
                      <span style={{ fontSize: 12, color: 'var(--grey-400)' }}>
                        Código: <span style={{ fontWeight: 700, color: 'var(--black)', letterSpacing: '0.04em' }}>{game.code}</span>
                      </span>
                      <span style={{ fontSize: 12, color: 'var(--grey-400)' }}>
                        {game.players.length} / {game.maxPlayers} jugadores
                      </span>
                      <span style={{ fontSize: 12, color: 'var(--grey-400)' }}>
                        {game.date} · {game.time}
                      </span>
                    </div>
                  </div>

                  {/* Action button */}
                  <Link
                    href={gameAdminHref(game)}
                    className="btn btn-secondary btn-sm"
                    style={{ borderRadius: 0, flexShrink: 0 }}
                  >
                    Gestionar →
                  </Link>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* ── Members section (toggled) ── */}
      {showMembers && (
        <div style={{ margin: '0 40px 32px' }}>
          <div style={cardStyle}>
            <div style={{ padding: '16px 24px', borderBottom: '1px solid var(--grey-200)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={sectionTitle}>Miembros del club</span>
              <span style={{ fontSize: 12, color: 'var(--grey-400)' }}>
                {MOCK_MEMBERS.length} miembros
              </span>
            </div>

            <table className="rank-table" style={{ width: '100%' }}>
              <thead>
                <tr>
                  <th style={{ paddingLeft: 24 }}>Nombre</th>
                  <th style={{ textAlign: 'center' }}>Ranking</th>
                  <th>Ingresó</th>
                  <th style={{ paddingRight: 24 }}></th>
                </tr>
              </thead>
              <tbody>
                {MOCK_MEMBERS.map((m) => (
                  <tr key={m.id}>
                    <td style={{ paddingLeft: 24 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <div
                          style={{
                            width: 32,
                            height: 32,
                            borderRadius: '50%',
                            background: 'var(--court-blue)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontSize: 11,
                            fontWeight: 700,
                            color: '#fff',
                            flexShrink: 0,
                          }}
                        >
                          {initials(m.name)}
                        </div>
                        <span style={{ fontWeight: 500, fontSize: 14 }}>{m.name}</span>
                      </div>
                    </td>
                    <td style={{ textAlign: 'center', fontFamily: 'var(--font-display)', fontSize: 18, fontWeight: 600, color: 'var(--black)' }}>
                      {m.ranking}
                    </td>
                    <td style={{ fontSize: 13, color: 'var(--grey-400)' }}>{m.joined}</td>
                    <td style={{ paddingRight: 24 }}>
                      <Link
                        href={`/profile/${m.id}`}
                        className="btn btn-secondary btn-sm"
                        style={{ borderRadius: 0 }}
                      >
                        Ver perfil
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── Courts section ── */}
      <div style={{ margin: '0 40px 60px' }}>
        <div style={cardStyle}>
          <div style={{ padding: '16px 24px', borderBottom: '1px solid var(--grey-200)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={sectionTitle}>Estado de canchas</span>
            <span style={{ fontSize: 12, color: 'var(--grey-400)' }}>
              {MOCK_COURTS.filter((c) => c.status === 'Disponible').length} disponibles / {MOCK_COURTS.length}
            </span>
          </div>

          <div
            style={{
              padding: '20px 24px',
              display: 'grid',
              gridTemplateColumns: 'repeat(3, 1fr)',
              gap: 12,
            }}
          >
            {MOCK_COURTS.map((court, i) => (
              <div
                key={i}
                style={{
                  padding: '16px 18px',
                  border: '1px solid var(--grey-200)',
                  background: '#fff',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 12,
                }}
              >
                {/* Color dot */}
                <span
                  style={{
                    width: 10,
                    height: 10,
                    borderRadius: '50%',
                    background: courtDotColor(court.status),
                    flexShrink: 0,
                    display: 'inline-block',
                  }}
                />
                <div>
                  <div style={{ fontWeight: 600, fontSize: 14 }}>{court.name}</div>
                  <div
                    style={{
                      fontSize: 11,
                      color:
                        court.status === 'Disponible'
                          ? 'var(--turf-green)'
                          : court.status === 'Mantenimiento'
                          ? '#f5a623'
                          : 'var(--grey-400)',
                      fontWeight: 600,
                      textTransform: 'uppercase',
                      letterSpacing: '0.06em',
                      marginTop: 2,
                    }}
                  >
                    {court.status}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

    </div>
  );
}
