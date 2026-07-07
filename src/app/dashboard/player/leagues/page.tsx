'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import {
  getMyLeagues, getLeagueSeasons, getLeagueMembers, getActiveSeason,
  backfillMyLeaguesToSupabase, fetchMyLeaguesFromSupabase,
  type MyLeagueSummary,
} from '@/lib/player-league-store';

const lbl: React.CSSProperties = {
  fontSize: 10, fontWeight: 700, letterSpacing: '0.12em',
  textTransform: 'uppercase', color: 'var(--grey-400)',
};

type Status = 'active' | 'completed' | 'upcoming';
type RoleKey = 'creador' | 'coadmin' | 'jugador';

function StatusBadge({ status }: { status: Status }) {
  const map: Record<Status, { bg: string; color: string; label: string }> = {
    active:    { bg: 'rgba(34,197,94,0.12)',  color: '#16a34a', label: 'Activa' },
    upcoming:  { bg: 'rgba(234,179,8,0.12)',  color: '#ca8a04', label: 'Por iniciar' },
    completed: { bg: 'rgba(107,114,128,0.12)', color: '#6b7280', label: 'Completada' },
  };
  const c = map[status] ?? map.upcoming;
  return (
    <span style={{ background: c.bg, color: c.color, fontSize: 10, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', padding: '3px 8px', whiteSpace: 'nowrap' }}>
      {c.label}
    </span>
  );
}

function RoleBadge({ role }: { role: RoleKey }) {
  const map: Record<RoleKey, { bg: string; color: string; label: string }> = {
    creador:  { bg: 'var(--court-blue)',      color: '#fff',     label: 'Creador' },
    coadmin:  { bg: 'rgba(37,99,235,0.12)',   color: '#2563eb',  label: 'Coadministrador' },
    jugador:  { bg: 'rgba(107,114,128,0.14)', color: '#4b5563',  label: 'Jugador' },
  };
  const c = map[role] ?? map.jugador;
  return (
    <span style={{ background: c.bg, color: c.color, fontSize: 9, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', padding: '3px 8px', whiteSpace: 'nowrap' }}>
      {c.label}
    </span>
  );
}

const th: React.CSSProperties = {
  ...lbl, textAlign: 'left', padding: '12px 16px', whiteSpace: 'nowrap',
  borderBottom: '1px solid var(--grey-200)', background: 'var(--grey-50)',
};
const td: React.CSSProperties = { padding: '16px', verticalAlign: 'middle', borderBottom: '1px solid var(--grey-100)' };

// Derive "my leagues" summaries from the local cache for instant paint. Mirrors
// the enriched shape the /api/leagues GET returns so the table renders the same.
function localSummaries(playerId: string): MyLeagueSummary[] {
  return getMyLeagues(playerId).map(l => {
    const seasons = getLeagueSeasons(l.id);
    const active  = getActiveSeason(l.id);
    const members = getLeagueMembers(l.id);
    const mine    = l.createdBy === playerId;
    const myMember = members.find(m => m.playerId === playerId);
    const role: RoleKey = mine ? 'creador' : myMember?.role === 'admin' ? 'coadmin' : 'jugador';
    const status: Status = active ? 'active' : seasons.length > 0 ? 'completed' : 'upcoming';
    return {
      id: l.id, name: l.name, description: l.description ?? '', code: l.code,
      role, memberCount: members.length, seasonCount: seasons.length,
      activeSeasonName: active?.name ?? null, status, createdAt: l.createdAt,
    };
  });
}

export default function LeaguesPage() {
  const { user } = useCurrentUser();
  const [rows, setRows] = useState<MyLeagueSummary[]>([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    if (!user) return;
    let alive = true;

    // 1. Instant paint from the local cache (also derives the role locally).
    const localRows = localSummaries(user.id);
    setRows(localRows);

    // 2. Backfill any localStorage-only leagues, then read the authoritative
    //    list from Supabase and replace.
    (async () => {
      await backfillMyLeaguesToSupabase(user.id);
      const remote = await fetchMyLeaguesFromSupabase();
      if (!alive) return;
      if (remote !== null) setRows(remote);
      setLoaded(true);
    })();

    return () => { alive = false; };
  }, [user]);

  return (
    <div className="bs-page" style={{ padding: '40px clamp(16px, 4vw, 32px) 80px' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', gap: 16, flexWrap: 'wrap', marginBottom: 32 }}>
        <div>
          <div style={{ ...lbl, marginBottom: 6 }}>Competencias</div>
          <h1 className="bs-h1" style={{ fontFamily: 'var(--font-display)', fontSize: 'clamp(28px, 6vw, 40px)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '-0.02em', margin: 0 }}>
            MIS LIGAS
          </h1>
        </div>
        <Link
          href="/dashboard/player/leagues/create"
          style={{ padding: '12px 24px', background: 'var(--black)', color: '#fff', textDecoration: 'none', fontSize: 12, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', whiteSpace: 'nowrap' }}
        >
          + Crear Liga
        </Link>
      </div>

      {/* Empty state */}
      {rows.length === 0 && loaded && (
        <div style={{ border: '1px dashed var(--grey-300)', padding: 'clamp(40px, 8vw, 64px) 24px', textAlign: 'center', background: 'var(--grey-50)' }}>
          <div style={{ fontFamily: 'var(--font-display)', fontSize: 24, fontWeight: 600, textTransform: 'uppercase', color: 'var(--grey-300)', marginBottom: 12 }}>
            Sin ligas aún
          </div>
          <div style={{ fontSize: 14, color: 'var(--grey-400)', maxWidth: 420, margin: '0 auto 28px' }}>
            Creá tu propia liga o unite a una existente, e indicaremos aquí tu rol en cada una.
          </div>
          <Link
            href="/dashboard/player/leagues/create"
            style={{ display: 'inline-block', padding: '12px 28px', background: 'var(--black)', color: '#fff', textDecoration: 'none', fontSize: 12, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase' }}
          >
            Crear primera liga →
          </Link>
        </div>
      )}

      {/* Loading skeleton (first paint, no local rows yet) */}
      {rows.length === 0 && !loaded && (
        <div style={{ padding: '48px 0', textAlign: 'center', color: 'var(--grey-400)', fontSize: 14 }}>
          Cargando ligas…
        </div>
      )}

      {/* Responsive table — scrolls horizontally on narrow screens */}
      {rows.length > 0 && (
        <div style={{ border: '1px solid var(--grey-200)', overflowX: 'auto', WebkitOverflowScrolling: 'touch' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 720 }}>
            <thead>
              <tr>
                <th style={{ ...th, paddingLeft: 20 }}>Liga</th>
                <th style={th}>Mi rol</th>
                <th style={{ ...th, textAlign: 'center' }}>Miembros</th>
                <th style={{ ...th, textAlign: 'center' }}>Temporadas</th>
                <th style={th}>Temporada activa</th>
                <th style={th}>Estado</th>
                <th style={{ ...th, textAlign: 'right', paddingRight: 20 }}></th>
              </tr>
            </thead>
            <tbody>
              {rows.map(l => (
                <tr key={l.id} style={{ transition: 'background 0.12s' }}
                  onMouseEnter={e => (e.currentTarget.style.background = 'var(--grey-50)')}
                  onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                >
                  <td style={{ ...td, paddingLeft: 20, minWidth: 200 }}>
                    <Link href={`/dashboard/player/leagues/${l.id}`} style={{ textDecoration: 'none', color: 'inherit', display: 'block' }}>
                      <div style={{ fontFamily: 'var(--font-display)', fontSize: 16, fontWeight: 600, textTransform: 'uppercase', color: 'var(--black)', letterSpacing: '-0.01em' }}>
                        {l.name}
                      </div>
                      {l.description && (
                        <div style={{ fontSize: 12, color: 'var(--grey-500)', marginTop: 2, maxWidth: 260, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                          {l.description}
                        </div>
                      )}
                    </Link>
                  </td>
                  <td style={td}><RoleBadge role={l.role} /></td>
                  <td style={{ ...td, textAlign: 'center', fontFamily: 'var(--font-display)', fontSize: 18, fontWeight: 600 }}>{l.memberCount}</td>
                  <td style={{ ...td, textAlign: 'center', fontFamily: 'var(--font-display)', fontSize: 18, fontWeight: 600 }}>{l.seasonCount}</td>
                  <td style={{ ...td, fontSize: 13, color: 'var(--grey-600)', whiteSpace: 'nowrap' }}>
                    {l.activeSeasonName ? <strong style={{ color: 'var(--black)' }}>{l.activeSeasonName}</strong> : <span style={{ color: 'var(--grey-300)' }}>—</span>}
                  </td>
                  <td style={td}><StatusBadge status={l.status} /></td>
                  <td style={{ ...td, textAlign: 'right', paddingRight: 20 }}>
                    <Link href={`/dashboard/player/leagues/${l.id}`} style={{ fontSize: 12, fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'var(--court-blue)', textDecoration: 'none', whiteSpace: 'nowrap' }}>
                      Ver →
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
