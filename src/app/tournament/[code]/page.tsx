'use client';

import { use, useEffect, useState } from 'react';
import Link from 'next/link';
import { getTournamentByCode } from '@/lib/tournament-store';
import type { Tournament } from '@/lib/tournament-store';
import type { ScoreConfig } from '@/lib/game-engine';

// ── Helpers ────────────────────────────────────────────────────────────────────

const STATUS_INFO: Record<string, { label: string; color: string; dot?: boolean }> = {
  created:       { label: 'Inscripciones abiertas', color: '#7c3aed' },
  starting_soon: { label: 'Por Empezar',             color: '#f5a623' },
  live:          { label: 'En Vivo',                  color: 'var(--turf-green)', dot: true },
  finished:      { label: 'Finalizado',               color: 'var(--grey-400)' },
  cancelled:     { label: 'Cancelado',                color: '#ee0005' },
};

const FORMAT_LABEL: Record<string, string> = {
  americano: 'Americano', mexicano: 'Mexicano', round_robin: 'Round Robin',
  team_league: 'Team League', knockout: 'Knockout', world_cup: 'World Cup',
};

function scoreConfigLabel(cfg: ScoreConfig): string {
  if (cfg.type === 'points') return `Por Puntos · ${cfg.target} pts`;
  return `Tradicional · ${cfg.setsPerMatch ?? 1} set${(cfg.setsPerMatch ?? 1) !== 1 ? 's' : ''}`;
}

const secTitle: React.CSSProperties = {
  fontSize: 9, letterSpacing: '0.18em', textTransform: 'uppercase', fontWeight: 700,
  color: 'var(--grey-400)', marginBottom: 16, paddingBottom: 10,
  borderBottom: '1px solid var(--grey-100)',
};

export default function PublicTournamentPage({ params }: { params: Promise<{ code: string }> }) {
  const { code } = use(params);
  const [tournament, setTournament] = useState<Tournament | null>(() =>
    typeof window !== 'undefined' ? getTournamentByCode(code) : null
  );
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);

  useEffect(() => {
    try {
      const raw = localStorage.getItem('padelmgt_user');
      if (raw) { const u = JSON.parse(raw); setCurrentUserId(u?.id ?? null); }
    } catch {}
  }, []);

  useEffect(() => {
    const load = () => setTournament(getTournamentByCode(code));
    load();
    const interval = setInterval(load, 5000);
    return () => clearInterval(interval);
  }, [code]);

  if (!tournament) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 32, fontFamily: 'var(--font-body)' }}>
        <div style={{ fontFamily: 'var(--font-display)', fontSize: 20, fontWeight: 700, textTransform: 'uppercase', marginBottom: 12 }}>Torneo no encontrado</div>
        <div style={{ fontSize: 13, color: 'var(--grey-400)', marginBottom: 24 }}>El código <strong>{code}</strong> no corresponde a ningún torneo.</div>
        <Link href="/" style={{ fontSize: 12, fontWeight: 600, color: 'var(--black)', textDecoration: 'none' }}>← Volver al inicio</Link>
      </div>
    );
  }

  const si = STATUS_INFO[tournament.status] ?? STATUS_INFO.created;
  const isLive     = tournament.status === 'live';
  const isFinished = tournament.status === 'finished';
  const isPending  = tournament.status === 'created' || tournament.status === 'starting_soon';

  function getName(pid: string) {
    return tournament!.players.find(p => p.id === pid)?.name ?? pid;
  }

  const currentRound = tournament.rounds.find(r => r.num === tournament.currentRound) ?? null;
  const doneRounds   = tournament.rounds.filter(r => r.status === 'completed');

  return (
    <div style={{ minHeight: '100vh', background: 'var(--grey-50)', fontFamily: 'var(--font-body)' }}>

      {/* Top bar */}
      <div style={{ background: 'var(--black)', color: '#fff', padding: '14px 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
        <div style={{ fontFamily: 'var(--font-display)', fontSize: 18, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '-0.01em' }}>PADELMGT</div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          {si.dot && <span style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--turf-green)', display: 'inline-block', animation: 'pulse 2s infinite' }} />}
          <span style={{ fontSize: 11, fontWeight: 700, color: si.color, textTransform: 'uppercase', letterSpacing: '0.1em' }}>{si.label}</span>
        </div>
      </div>

      <div style={{ maxWidth: 800, margin: '0 auto', padding: '32px 24px 80px' }}>

        {/* Header */}
        <div style={{ marginBottom: 28 }}>
          <div style={{ fontSize: 10, letterSpacing: '0.16em', textTransform: 'uppercase', color: 'var(--grey-400)', fontWeight: 600, marginBottom: 6 }}>
            Torneo · {tournament.code}
          </div>
          <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 40, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '-0.02em', margin: '0 0 10px' }}>
            {tournament.name}
          </h1>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, fontSize: 12, color: 'var(--grey-500)', marginBottom: 14 }}>
            {[tournament.date, tournament.time, tournament.club, tournament.city,
              FORMAT_LABEL[tournament.format] ?? tournament.format,
              scoreConfigLabel(tournament.scoreConfig),
            ].filter(Boolean).map((item, i) => (
              <span key={i} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                {i > 0 && <span style={{ color: 'var(--grey-300)' }}>·</span>}
                {item}
              </span>
            ))}
          </div>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <span style={{ fontSize: 11, background: 'var(--grey-100)', color: 'var(--grey-500)', padding: '4px 10px', fontWeight: 600 }}>
              {tournament.pairType === 'parejas' ? 'Pareja Fija' : tournament.mixto ? 'Mixto' : 'Intercambio'}
            </span>
            <span style={{ fontSize: 11, background: 'var(--grey-100)', color: 'var(--grey-500)', padding: '4px 10px', fontWeight: 600 }}>
              {tournament.courts} cancha{tournament.courts !== 1 ? 's' : ''}
            </span>
            <span style={{ fontSize: 11, background: 'var(--grey-100)', color: 'var(--grey-500)', padding: '4px 10px', fontWeight: 600 }}>
              {tournament.players.length}/{tournament.maxPlayers} jugadores
            </span>
          </div>
        </div>

        {/* Pending state */}
        {isPending && (
          <div style={{ background: '#fff', border: '1px solid var(--grey-200)', padding: '32px', textAlign: 'center', marginBottom: 32 }}>
            <div style={{ fontSize: 36, marginBottom: 12 }}>🏆</div>
            <div style={{ fontFamily: 'var(--font-display)', fontSize: 18, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '-0.01em', marginBottom: 8 }}>
              Inscripciones Abiertas
            </div>
            <div style={{ fontSize: 13, color: 'var(--grey-400)' }}>
              {tournament.date} a las {tournament.time} · {tournament.players.length}/{tournament.maxPlayers} jugadores confirmados
            </div>
            {currentUserId && tournament.players.some(p => p.id === currentUserId) && (
              <div style={{ marginTop: 16, display: 'inline-block', padding: '8px 20px', background: 'rgba(40,167,69,0.1)', border: '1px solid rgba(40,167,69,0.3)', color: 'var(--turf-green)', fontSize: 13, fontWeight: 700 }}>
                Ya estás inscrito ✓
              </div>
            )}
          </div>
        )}

        {/* Finished banner */}
        {isFinished && (
          <div style={{ background: 'var(--black)', color: '#fff', padding: '20px 24px', marginBottom: 24 }}>
            <div style={{ fontSize: 10, letterSpacing: '0.16em', textTransform: 'uppercase', color: 'var(--neon)', fontWeight: 700, marginBottom: 6 }}>Torneo Finalizado</div>
            <div style={{ fontFamily: 'var(--font-display)', fontSize: 22, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '-0.01em' }}>{tournament.name}</div>
            <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.5)', marginTop: 4 }}>{tournament.date} · {tournament.club}, {tournament.city}</div>
          </div>
        )}

        {/* Standings */}
        {tournament.standings.length > 0 && (
          <div style={{ marginBottom: 32 }}>
            <div style={secTitle}>{isFinished ? 'Clasificación Final' : 'Clasificación'}</div>
            <div style={{ background: '#fff', border: '1px solid var(--grey-200)', overflow: 'hidden' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ background: 'var(--grey-50)', borderBottom: '2px solid var(--grey-200)' }}>
                    {['Pos', 'Jugador', 'W', 'Pts', 'PJ', '+/-'].map(h => (
                      <th key={h} style={{ padding: '10px 14px', textAlign: h === 'Pos' ? 'center' : 'left', fontSize: 9, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--grey-400)' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {tournament.standings.map((s, i) => {
                    const isMe = currentUserId != null && s.playerId === currentUserId;
                    return (
                      <tr key={s.playerId} style={{ borderBottom: '1px solid var(--grey-100)', background: isMe ? 'rgba(214,255,0,0.06)' : i % 2 === 0 ? '#fff' : 'var(--grey-50)' }}>
                        <td style={{ padding: '12px 14px', textAlign: 'center', fontFamily: 'var(--font-display)', fontSize: i < 3 ? 20 : 14, fontWeight: 700 }}>
                          {i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : i + 1}
                        </td>
                        <td style={{ padding: '12px 14px' }}>
                          <span style={{ fontSize: 13, fontWeight: isMe ? 700 : 500 }}>{s.playerName}</span>
                          {isMe && <span style={{ marginLeft: 8, fontSize: 9, background: 'var(--neon)', color: 'var(--black)', padding: '2px 6px', fontWeight: 700 }}>TÚ</span>}
                        </td>
                        <td style={{ padding: '12px 14px', fontFamily: 'var(--font-display)', fontSize: 15, fontWeight: 600 }}>{s.wins}</td>
                        <td style={{ padding: '12px 14px', fontFamily: 'var(--font-display)', fontSize: 15, fontWeight: 700 }}>{s.pts}</td>
                        <td style={{ padding: '12px 14px', fontSize: 12, color: 'var(--grey-400)' }}>{s.played}</td>
                        <td style={{ padding: '12px 14px', fontSize: 12, fontWeight: 600, color: s.diff >= 0 ? 'var(--turf-green)' : '#e53e3e' }}>
                          {s.diff >= 0 ? '+' : ''}{s.diff}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Live round */}
        {isLive && currentRound && (
          <div style={{ marginBottom: 36 }}>
            <div style={secTitle}>Ronda {currentRound.num} de {tournament.rounds.length} — {currentRound.status === 'completed' ? 'Completada' : 'En curso'}</div>
            {currentRound.resting.length > 0 && (
              <div style={{ marginBottom: 14, fontSize: 12, color: 'var(--grey-400)' }}>
                Descansan: {currentRound.resting.map(pid => getName(pid)).join(', ')}
              </div>
            )}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {currentRound.courts.map(court => {
                const isDone = court.status === 'completed';
                return (
                  <div key={court.courtNum} style={{ background: '#fff', border: `2px solid ${isDone ? 'var(--grey-200)' : 'var(--turf-green)'}`, padding: '18px 22px' }}>
                    <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'var(--grey-400)', marginBottom: 12 }}>Cancha {court.courtNum}</div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr auto 1fr', alignItems: 'center', gap: 14 }}>
                      <div>{court.pair1.map(pid => <div key={pid} style={{ fontSize: 13, fontWeight: 700 }}>{getName(pid)}</div>)}</div>
                      <div style={{ textAlign: 'center' }}>
                        {isDone ? (
                          <div style={{ fontFamily: 'var(--font-display)', fontSize: 28, fontWeight: 700 }}>
                            <span style={{ color: (court.pair1Score ?? 0) > (court.pair2Score ?? 0) ? 'var(--turf-green)' : 'var(--grey-400)' }}>{court.pair1Score}</span>
                            <span style={{ color: 'var(--grey-300)', margin: '0 6px' }}>–</span>
                            <span style={{ color: (court.pair2Score ?? 0) > (court.pair1Score ?? 0) ? 'var(--turf-green)' : 'var(--grey-400)' }}>{court.pair2Score}</span>
                          </div>
                        ) : (
                          <div style={{ fontSize: 11, color: '#f5a623', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em' }}>En juego</div>
                        )}
                      </div>
                      <div style={{ textAlign: 'right' }}>{court.pair2.map(pid => <div key={pid} style={{ fontSize: 13, fontWeight: 700 }}>{getName(pid)}</div>)}</div>
                    </div>
                  </div>
                );
              })}
            </div>
            <div style={{ marginTop: 10, fontSize: 11, color: 'var(--grey-400)', textAlign: 'right' }}>Actualiza cada 5 seg.</div>
          </div>
        )}

        {/* Round history */}
        {doneRounds.length > 0 && (
          <div style={{ marginBottom: 32 }}>
            <div style={secTitle}>Rondas Jugadas</div>
            {doneRounds.map(round => (
              <div key={round.num} style={{ marginBottom: 16 }}>
                <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--grey-500)', marginBottom: 8 }}>Ronda {round.num}</div>
                {round.courts.map(court => (
                  <div key={court.courtNum} style={{ background: '#fff', border: '1px solid var(--grey-200)', padding: '14px 20px', marginBottom: 4, display: 'grid', gridTemplateColumns: '1fr auto 1fr', alignItems: 'center', gap: 12 }}>
                    <div>{court.pair1.map(pid => <div key={pid} style={{ fontSize: 12, fontWeight: 600 }}>{getName(pid)}</div>)}</div>
                    <div style={{ textAlign: 'center' }}>
                      {court.pair1Score !== null && (
                        <span style={{ fontFamily: 'var(--font-display)', fontSize: 22, fontWeight: 700 }}>
                          {court.pair1Score} – {court.pair2Score}
                        </span>
                      )}
                      <div style={{ fontSize: 9, color: 'var(--grey-300)', marginTop: 2 }}>CANCHA {court.courtNum}</div>
                    </div>
                    <div style={{ textAlign: 'right' }}>{court.pair2.map(pid => <div key={pid} style={{ fontSize: 12, fontWeight: 600 }}>{getName(pid)}</div>)}</div>
                  </div>
                ))}
              </div>
            ))}
          </div>
        )}

        {/* Players */}
        <div style={{ marginTop: 32 }}>
          <div style={secTitle}>Jugadores ({tournament.players.length}/{tournament.maxPlayers})</div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            {tournament.players.map(p => (
              <div key={p.id} style={{ padding: '8px 14px', background: '#fff', border: '1px solid var(--grey-200)', fontSize: 13, fontWeight: p.isCreator ? 700 : 500, display: 'flex', alignItems: 'center', gap: 6 }}>
                {p.name}
                {p.isCreator && <span style={{ fontSize: 9, background: 'var(--grey-100)', color: 'var(--grey-500)', padding: '2px 5px', fontWeight: 700 }}>ORG</span>}
              </div>
            ))}
            {Array.from({ length: Math.max(0, tournament.maxPlayers - tournament.players.length) }).map((_, i) => (
              <div key={`empty-${i}`} style={{ padding: '8px 14px', background: 'var(--grey-50)', border: '1px dashed var(--grey-200)', fontSize: 13, color: 'var(--grey-300)' }}>
                Slot disponible
              </div>
            ))}
          </div>
        </div>

        {/* Organizer footer */}
        {currentUserId && currentUserId === tournament.creatorId && (
          <div style={{ marginTop: 32, padding: '20px 24px', background: 'var(--black)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16 }}>
            <span style={{ fontSize: 13, color: 'rgba(255,255,255,0.7)' }}>Sos el organizador de este torneo</span>
            <Link href={`/dashboard/player/tournaments/${tournament.id}`}
              style={{ padding: '10px 22px', background: 'var(--neon)', color: 'var(--black)', fontSize: 12, fontWeight: 800, textDecoration: 'none', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
              Gestionar →
            </Link>
          </div>
        )}

      </div>
    </div>
  );
}
