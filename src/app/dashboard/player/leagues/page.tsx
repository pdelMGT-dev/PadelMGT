'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import { getMyLeagues, getLeagueSeasons, getLeagueMembers, getActiveSeason, type PlayerLeague } from '@/lib/player-league-store';

const lbl: React.CSSProperties = {
  fontSize: 10, fontWeight: 700, letterSpacing: '0.12em',
  textTransform: 'uppercase', color: 'var(--grey-400)',
};

function statusBadge(status: string) {
  const colors: Record<string, { bg: string; color: string }> = {
    active:    { bg: 'rgba(34,197,94,0.12)',  color: '#16a34a' },
    upcoming:  { bg: 'rgba(234,179,8,0.12)',  color: '#ca8a04' },
    completed: { bg: 'rgba(107,114,128,0.12)', color: '#6b7280' },
  };
  const c = colors[status] ?? colors.upcoming;
  return (
    <span style={{ ...c, fontSize: 10, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', padding: '3px 8px' }}>
      {status === 'active' ? 'Activa' : status === 'upcoming' ? 'Por iniciar' : 'Completada'}
    </span>
  );
}

export default function LeaguesPage() {
  const { user } = useCurrentUser();
  const [leagues, setLeagues] = useState<PlayerLeague[]>([]);

  useEffect(() => {
    if (!user) return;
    setLeagues(getMyLeagues(user.id));
  }, [user]);

  return (
    <div style={{ padding: '40px 32px 80px', maxWidth: 900, margin: '0 auto' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: 40 }}>
        <div>
          <div style={{ ...lbl, marginBottom: 6 }}>Competencias</div>
          <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 40, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '-0.02em', margin: 0 }}>
            MIS LIGAS
          </h1>
        </div>
        <Link
          href="/dashboard/player/leagues/create"
          style={{ padding: '12px 24px', background: 'var(--black)', color: '#fff', textDecoration: 'none', fontSize: 12, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase' }}
        >
          + Crear Liga
        </Link>
      </div>

      {/* Empty state */}
      {leagues.length === 0 && (
        <div style={{ border: '1px dashed var(--grey-300)', padding: '64px 40px', textAlign: 'center', background: 'var(--grey-50)' }}>
          <div style={{ fontFamily: 'var(--font-display)', fontSize: 24, fontWeight: 600, textTransform: 'uppercase', color: 'var(--grey-300)', marginBottom: 12 }}>
            Sin ligas aún
          </div>
          <div style={{ fontSize: 14, color: 'var(--grey-400)', marginBottom: 28, maxWidth: 420, margin: '0 auto 28px' }}>
            Creá tu propia liga, invitá jugadores y llevá un ranking interno con tus propios puntos.
          </div>
          <Link
            href="/dashboard/player/leagues/create"
            style={{ display: 'inline-block', padding: '12px 28px', background: 'var(--black)', color: '#fff', textDecoration: 'none', fontSize: 12, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase' }}
          >
            Crear primera liga →
          </Link>
        </div>
      )}

      {/* League list */}
      {leagues.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {leagues.map(league => {
            const seasons = getLeagueSeasons(league.id);
            const active  = getActiveSeason(league.id);
            const members = getLeagueMembers(league.id);
            const isMine  = league.createdBy === user?.id;

            return (
              <Link
                key={league.id}
                href={`/dashboard/player/leagues/${league.id}`}
                style={{ textDecoration: 'none', display: 'block' }}
              >
                <div style={{ background: '#fff', border: '1px solid var(--grey-200)', padding: '20px 24px', transition: 'border-color 0.15s', cursor: 'pointer' }}
                  onMouseEnter={e => (e.currentTarget.style.borderColor = 'var(--black)')}
                  onMouseLeave={e => (e.currentTarget.style.borderColor = 'var(--grey-200)')}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 16 }}>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
                        <span style={{ fontFamily: 'var(--font-display)', fontSize: 20, fontWeight: 600, textTransform: 'uppercase', color: 'var(--black)', letterSpacing: '-0.01em' }}>
                          {league.name}
                        </span>
                        {isMine && (
                          <span style={{ fontSize: 9, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', background: 'var(--neon)', color: 'var(--black)', padding: '2px 6px' }}>
                            Admin
                          </span>
                        )}
                      </div>
                      {league.description && (
                        <div style={{ fontSize: 13, color: 'var(--grey-500)', marginBottom: 10, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                          {league.description}
                        </div>
                      )}
                      <div style={{ display: 'flex', gap: 20, flexWrap: 'wrap' }}>
                        <span style={{ ...lbl, fontWeight: 500 }}>{members.length} miembro{members.length !== 1 ? 's' : ''}</span>
                        <span style={{ ...lbl, fontWeight: 500 }}>{seasons.length} temporada{seasons.length !== 1 ? 's' : ''}</span>
                        {active && (
                          <span style={{ ...lbl, fontWeight: 500 }}>
                            Temporada activa: <strong style={{ color: 'var(--black)' }}>{active.name}</strong>
                          </span>
                        )}
                      </div>
                    </div>
                    <div style={{ flexShrink: 0 }}>
                      {active ? statusBadge('active') : seasons.length > 0 ? statusBadge('completed') : statusBadge('upcoming')}
                    </div>
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
