'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { getAllGames } from '@/lib/game-store';
import type { ActiveGame } from '@/lib/game-engine';

type CurrentUser = { id: string; name: string; role: string };

const stats = [
  { label: 'Torneos jugados', value: '24', delta: '+3 este mes' },
  { label: 'Victorias', value: '16', delta: '67% win rate' },
  { label: 'Ranking', value: '#47', delta: '▲4 posiciones' },
  { label: 'Puntos', value: '1,840', delta: '+120 esta semana' },
];

const recentMatches = [
  { date: '11 May', tournament: 'Americano Barrio Norte', partner: 'Ana R.', vs: 'Carlos V. / Sofía L.', result: 'V', score: '24–18' },
  { date: '08 May', tournament: 'Liga Premier LATAM', partner: 'Ana R.', vs: 'Pedro M. / Laura T.', result: 'D', score: '19–21' },
  { date: '04 May', tournament: 'Open Knockout Mayo', partner: 'Marcos H.', vs: 'Diego F. / Isabel B.', result: 'V', score: '6–3, 6–4' },
];

const upcomingTournament = {
  name: 'Mexicano del Club',
  date: 'Sábado 17 Mayo · 10:00',
  club: 'Club La Cantera',
  city: 'Córdoba',
  format: 'Mexicano',
  spots: '6 / 8 jugadores',
};

const friends = [
  { name: 'Ana Rodríguez', ranking: '#52', activity: 'Ganó su partido hace 2h' },
  { name: 'Carlos Vega', ranking: '#38', activity: 'Se inscribió a Open Knockout' },
  { name: 'Marcos Herrera', ranking: '#61', activity: 'Nuevo ranking personal' },
];

const STATUS_LABEL: Record<string, string> = {
  created: 'Inscripto',
  starting_soon: 'Por comenzar',
  live: 'En juego',
};

export default function PlayerHomePage() {
  const [nextGame, setNextGame] = useState<ActiveGame | null>(null);
  const [currentUser, setCurrentUser] = useState<CurrentUser | null>(null);
  const [myActiveGames, setMyActiveGames] = useState<ActiveGame[]>([]);

  useEffect(() => {
    try {
      const raw = localStorage.getItem('padelmgt_user');
      if (raw) setCurrentUser(JSON.parse(raw));
    } catch {}
    const games = getAllGames();
    const upcoming = games.find(g => g.status !== 'finished');
    setNextGame(upcoming ?? null);
  }, []);

  useEffect(() => {
    if (!currentUser) return;
    const games = getAllGames();
    const active = games.filter(g =>
      g.status !== 'finished' &&
      g.players.some(p => p.id === currentUser.id)
    );
    setMyActiveGames(active);
  }, [currentUser]);

  const gameHref = nextGame
    ? (['americano', 'mexicano'].includes(nextGame.format)
        ? `/dashboard/player/quick-game/${nextGame.id}`
        : `/dashboard/player/tournaments/${nextGame.id}`)
    : '/dashboard/player/tournaments';

  const displayGame = nextGame ? {
    name: nextGame.name,
    date: `${nextGame.date} · ${nextGame.time}`,
    club: nextGame.club,
    city: nextGame.city,
    format: nextGame.format,
    spots: `${nextGame.players.length} / ${nextGame.maxPlayers} jugadores`,
  } : upcomingTournament;

  return (
    <div style={{ padding: '40px 40px 80px' }}>
      {/* Header */}
      <div style={{ marginBottom: 40 }}>
        <div style={{ fontSize: 11, letterSpacing: '0.16em', textTransform: 'uppercase', color: 'var(--grey-400)', fontWeight: 600, marginBottom: 6 }}>Bienvenido de vuelta</div>
        <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 48, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '-0.02em', lineHeight: 0.95, margin: 0 }}>
          HOLA,<br /><span style={{ color: 'var(--court-blue)' }}>DIEGO.</span>
        </h1>
      </div>

      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 1, background: 'var(--grey-200)', marginBottom: 32 }}>
        {stats.map((s) => (
          <div key={s.label} style={{ background: '#fff', padding: '28px 24px' }}>
            <div style={{ fontFamily: 'var(--font-display)', fontSize: 44, fontWeight: 600, letterSpacing: '-0.03em', color: 'var(--black)', lineHeight: 1 }}>{s.value}</div>
            <div style={{ fontSize: 11, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--grey-400)', fontWeight: 600, margin: '6px 0 4px' }}>{s.label}</div>
            <div style={{ fontSize: 12, color: s.delta.startsWith('▲') ? 'var(--turf-green)' : 'var(--grey-400)' }}>{s.delta}</div>
          </div>
        ))}
      </div>

      {/* Mis Juegos Activos */}
      {myActiveGames.length > 0 && (
        <div style={{ background: '#fff', border: '1px solid var(--grey-200)', marginBottom: 24 }}>
          <div style={{ padding: '20px 24px', borderBottom: '1px solid var(--grey-200)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ fontSize: 11, letterSpacing: '0.12em', textTransform: 'uppercase', fontWeight: 700, color: 'var(--grey-500)' }}>Mis Juegos Activos</div>
            <Link href="/dashboard/player/quick-game" style={{ fontSize: 12, color: 'var(--black)', fontWeight: 600, textDecoration: 'none' }}>Ver todos →</Link>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
            {myActiveGames.map((g) => {
              const href = ['americano', 'mexicano'].includes(g.format)
                ? `/dashboard/player/quick-game/${g.id}`
                : `/dashboard/player/tournaments/${g.id}`;
              const isCreator = g.players.some(p => p.id === currentUser?.id && p.isCreator);
              const statusColor = g.status === 'live' ? 'var(--turf-green)' : g.status === 'starting_soon' ? 'var(--neon)' : 'var(--grey-400)';
              return (
                <div key={g.id} style={{ padding: '16px 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid var(--grey-100)', gap: 16 }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                      <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--black)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{g.name}</span>
                      {isCreator && <span style={{ fontSize: 9, background: 'var(--black)', color: 'var(--neon)', padding: '2px 6px', fontWeight: 700, letterSpacing: '0.08em', flexShrink: 0 }}>CREADOR</span>}
                    </div>
                    <div style={{ fontSize: 12, color: 'var(--grey-400)' }}>{g.date} · {g.time} · {g.club}, {g.city}</div>
                    <div style={{ display: 'flex', gap: 8, marginTop: 6 }}>
                      <span style={{ fontSize: 9, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: statusColor }}>{STATUS_LABEL[g.status] ?? g.status}</span>
                      <span style={{ fontSize: 9, color: 'var(--grey-400)' }}>·</span>
                      <span style={{ fontSize: 9, color: 'var(--grey-400)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>{g.players.length}/{g.maxPlayers} jugadores</span>
                    </div>
                  </div>
                  <Link href={href} className="btn btn-sm" style={{ background: 'var(--black)', color: '#fff', borderRadius: 0, whiteSpace: 'nowrap', flexShrink: 0 }}>
                    {isCreator ? 'Gestionar →' : 'Ver juego →'}
                  </Link>
                </div>
              );
            })}
          </div>
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 320px', gap: 24, marginBottom: 24 }}>
        {/* Próximo torneo */}
        <div style={{ background: 'var(--black)', padding: '32px' }}>
          <div style={{ fontSize: 10, letterSpacing: '0.16em', textTransform: 'uppercase', color: 'var(--neon)', fontWeight: 700, marginBottom: 12 }}>Próximo Torneo</div>
          <div style={{ fontFamily: 'var(--font-display)', fontSize: 28, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '-0.01em', color: '#fff', marginBottom: 8 }}>{displayGame.name}</div>
          <div style={{ display: 'flex', gap: 20, fontSize: 13, color: 'rgba(255,255,255,0.55)', marginBottom: 24 }}>
            <span>{displayGame.date}</span>
            <span>·</span>
            <span>{displayGame.club}, {displayGame.city}</span>
          </div>
          <div style={{ display: 'flex', gap: 8, marginBottom: 24 }}>
            <span className="chip" style={{ fontSize: 10, background: 'rgba(255,255,255,0.08)', color: 'rgba(255,255,255,0.7)', border: 'none' }}>{displayGame.format}</span>
            <span className="chip" style={{ fontSize: 10, background: 'rgba(255,255,255,0.08)', color: 'rgba(255,255,255,0.7)', border: 'none' }}>{displayGame.spots}</span>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <Link href={gameHref} className="btn btn-sm" style={{ background: 'var(--neon)', color: 'var(--black)', borderRadius: 0, fontWeight: 700 }}>Ver detalles</Link>
            <Link href="/dashboard/player/calendar" className="btn btn-sm" style={{ background: 'rgba(255,255,255,0.08)', color: '#fff', borderRadius: 0 }}>Mi calendario</Link>
          </div>
        </div>

        {/* Friends activity */}
        <div style={{ background: '#fff', border: '1px solid var(--grey-200)', padding: '24px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
            <div style={{ fontSize: 11, letterSpacing: '0.12em', textTransform: 'uppercase', fontWeight: 700, color: 'var(--grey-500)' }}>Amigos</div>
            <Link href="/dashboard/player/friends" style={{ fontSize: 12, color: 'var(--black)', fontWeight: 600, textDecoration: 'none' }}>Ver todos →</Link>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {friends.map((f) => (
              <div key={f.name} style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
                <div style={{ width: 36, height: 36, background: 'var(--grey-100)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'var(--font-display)', fontSize: 14, fontWeight: 600, color: 'var(--black)', flexShrink: 0 }}>
                  {f.name.split(' ').map((w: string) => w[0]).join('')}
                </div>
                <div>
                  <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                    <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--black)' }}>{f.name}</span>
                    <span style={{ fontSize: 11, color: 'var(--grey-400)' }}>{f.ranking}</span>
                  </div>
                  <div style={{ fontSize: 12, color: 'var(--grey-400)', marginTop: 2 }}>{f.activity}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Recent matches */}
      <div style={{ background: '#fff', border: '1px solid var(--grey-200)' }}>
        <div style={{ padding: '20px 24px', borderBottom: '1px solid var(--grey-200)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ fontSize: 11, letterSpacing: '0.12em', textTransform: 'uppercase', fontWeight: 700, color: 'var(--grey-500)' }}>Últimos Partidos</div>
          <Link href="/dashboard/player/matches" style={{ fontSize: 12, color: 'var(--black)', fontWeight: 600, textDecoration: 'none' }}>Ver todos →</Link>
        </div>
        <table className="rank-table">
          <thead>
            <tr>
              <th style={{ paddingLeft: 24 }}>Fecha</th>
              <th>Torneo</th>
              <th>Pareja</th>
              <th>Rivales</th>
              <th style={{ textAlign: 'center' }}>Resultado</th>
              <th style={{ textAlign: 'center' }}>Score</th>
            </tr>
          </thead>
          <tbody>
            {recentMatches.map((m, i) => (
              <tr key={i}>
                <td style={{ paddingLeft: 24, fontSize: 12, color: 'var(--grey-400)' }}>{m.date}</td>
                <td style={{ fontWeight: 500, fontSize: 14 }}>{m.tournament}</td>
                <td style={{ fontSize: 13, color: 'var(--grey-500)' }}>{m.partner}</td>
                <td style={{ fontSize: 13, color: 'var(--grey-500)' }}>{m.vs}</td>
                <td style={{ textAlign: 'center' }}>
                  <span style={{ display: 'inline-flex', width: 28, height: 28, borderRadius: '50%', background: m.result === 'V' ? 'var(--turf-green)' : '#ee0005', color: '#fff', fontSize: 11, fontWeight: 700, alignItems: 'center', justifyContent: 'center' }}>
                    {m.result}
                  </span>
                </td>
                <td style={{ textAlign: 'center', fontFamily: 'var(--font-display)', fontSize: 16, fontWeight: 600 }}>{m.score}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
