'use client';
import React, { use, useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { getTournament, saveTournament } from '@/lib/tournament-store';
import type { Tournament } from '@/lib/tournament-store';
import { getInvitationsForPlayer, respondToInvitation } from '@/lib/invitation-store';

// ── Types ─────────────────────────────────────────────────────────────────────

type CurrentUser = { id: string; name: string; email: string; shortId?: string; ranking?: number };

// ── Helpers ───────────────────────────────────────────────────────────────────

function initials(name: string) {
  return name.split(' ').map((w: string) => w[0]).join('').slice(0, 2).toUpperCase();
}

function formatDateDDMMYYYY(dateStr: string): string {
  if (!dateStr) return '–';
  const parts = dateStr.slice(0, 10).split('-');
  if (parts.length !== 3) return dateStr;
  return `${parts[2]}/${parts[1]}/${parts[0]}`;
}

const FORMAT_LABEL: Record<string, string> = {
  americano: 'Americano', mexicano: 'Mexicano', round_robin: 'Round Robin',
  team_league: 'Team League', knockout: 'Knockout', world_cup: 'World Cup',
};

const MODALIDAD_LABEL: Record<string, string> = {
  individual: 'Individual', parejas: 'Parejas',
};

function statusInfo(status: string): { label: string; bg: string; color: string } {
  const map: Record<string, { label: string; bg: string; color: string }> = {
    created:       { label: 'Inscripciones abiertas', bg: 'rgba(124,58,237,0.1)',  color: '#7c3aed' },
    starting_soon: { label: 'Por Empezar',            bg: 'rgba(245,166,35,0.1)', color: '#f5a623' },
    live:          { label: 'En Vivo',                bg: 'rgba(0,180,0,0.1)',     color: 'var(--turf-green)' },
    finished:      { label: 'Finalizado',             bg: 'var(--grey-100)',       color: 'var(--grey-500)' },
    cancelled:     { label: 'Cancelado',              bg: 'rgba(220,38,38,0.1)',   color: '#dc2626' },
  };
  return map[status] ?? map.created;
}

// ── Shared styles ─────────────────────────────────────────────────────────────

const card: React.CSSProperties = {
  background: '#fff', border: '1px solid var(--grey-200)', padding: '20px 24px', marginBottom: 16,
};

const secTitle: React.CSSProperties = {
  fontSize: 9, letterSpacing: '0.18em', textTransform: 'uppercase', fontWeight: 700,
  color: 'var(--grey-400)', marginBottom: 16, paddingBottom: 10, borderBottom: '1px solid var(--grey-100)',
};

// ── Page Component ─────────────────────────────────────────────────────────────

export default function ViewTorneoPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();

  const [currentUser, setCurrentUser] = useState<CurrentUser | null>(null);
  const [tournament, setTournament] = useState<Tournament | null | undefined>(undefined);
  const [respondingId, setRespondingId] = useState<string | null>(null);

  // ── Load user ─────────────────────────────────────────────────────────────
  useEffect(() => {
    try {
      const u = localStorage.getItem('padelmgt_user');
      if (u) setCurrentUser(JSON.parse(u) as CurrentUser);
    } catch { /* ignore */ }
  }, []);

  // ── Load tournament (initial + polling) ───────────────────────────────────
  const loadTournament = useCallback(() => {
    const t = getTournament(id);
    setTournament(t ?? null);
  }, [id]);

  useEffect(() => {
    loadTournament();
    const timer = setInterval(loadTournament, 5000);
    return () => clearInterval(timer);
  }, [loadTournament]);

  // ── Guard: loading ────────────────────────────────────────────────────────
  if (tournament === undefined) {
    return (
      <div style={{ padding: '80px 40px', textAlign: 'center', color: 'var(--grey-400)' }}>
        Cargando...
      </div>
    );
  }

  // ── Guard: not found ──────────────────────────────────────────────────────
  if (tournament === null) {
    return (
      <div style={{ padding: '80px 40px', maxWidth: 500, textAlign: 'center', margin: '0 auto' }}>
        <div style={{ fontFamily: 'var(--font-display)', fontSize: 24, fontWeight: 700, textTransform: 'uppercase', marginBottom: 12 }}>
          Torneo no encontrado
        </div>
        <div style={{ fontSize: 13, color: 'var(--grey-400)', marginBottom: 28 }}>
          El torneo con ID <code>{id}</code> no existe o fue eliminado.
        </div>
        <Link href="/dashboard/player/tournaments"
          style={{ padding: '11px 24px', background: 'var(--black)', color: '#fff', fontSize: 12, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', textDecoration: 'none' }}>
          ← Mis Torneos
        </Link>
      </div>
    );
  }

  const t = tournament;
  const si = statusInfo(t.cancelledAt ? 'cancelled' : t.status);

  // ── Find player's invitation ───────────────────────────────────────────────
  const myInvitation = currentUser
    ? getInvitationsForPlayer(currentUser.id).find(inv => inv.gameId === t.id) ?? null
    : null;

  const isConfirmedPlayer = currentUser
    ? t.players.some(p => p.id === currentUser.id)
    : false;

  // ── Handlers ──────────────────────────────────────────────────────────────

  async function handleAccept() {
    if (!myInvitation || !currentUser) return;
    setRespondingId('accepting');
    respondToInvitation(myInvitation.id, 'accepted');
    // Move player from invitedPlayers to players
    const invitedEntry = (t.invitedPlayers ?? []).find(ip => ip.id === currentUser.id);
    const updated: Tournament = {
      ...t,
      players: [
        ...t.players,
        {
          id: currentUser.id,
          name: currentUser.name,
          ranking: invitedEntry?.ranking ?? currentUser.ranking ?? 999,
          isCreator: false,
          email: currentUser.email,
          shortId: currentUser.shortId,
        },
      ],
      invitedPlayers: (t.invitedPlayers ?? []).map(ip =>
        ip.id === currentUser.id ? { ...ip, status: 'accepted' as const } : ip
      ),
    };
    saveTournament(updated);
    setTournament(updated);
    setRespondingId(null);
  }

  async function handleReject() {
    if (!myInvitation || !currentUser) return;
    setRespondingId('rejecting');
    respondToInvitation(myInvitation.id, 'rejected');
    const updated: Tournament = {
      ...t,
      invitedPlayers: (t.invitedPlayers ?? []).map(ip =>
        ip.id === currentUser.id ? { ...ip, status: 'rejected' as const } : ip
      ),
    };
    saveTournament(updated);
    router.push('/dashboard/player/tournaments');
  }

  // ── Derived data ──────────────────────────────────────────────────────────
  const confirmedPlayers = t.players;
  const pendingInvited = (t.invitedPlayers ?? []).filter(ip =>
    ip.status === 'pending' && (t.status === 'created' || t.status === 'starting_soon')
  );
  const hasStandings = t.standings && t.standings.length > 0;

  // My invitation status from invitedPlayers array
  const myInvitedEntry = currentUser
    ? (t.invitedPlayers ?? []).find(ip => ip.id === currentUser.id)
    : null;

  const invStatus = myInvitedEntry?.status ?? (isConfirmedPlayer ? 'accepted' : null);

  return (
    <div style={{ padding: '0 0 80px', maxWidth: 800, margin: '0 auto' }}>

      {/* ── Top bar ── */}
      <div style={{
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        padding: '16px 40px', borderBottom: '1px solid var(--grey-100)',
        background: '#fff', position: 'sticky', top: 0, zIndex: 10,
      }}>
        <Link href="/dashboard/player/tournaments"
          style={{ fontSize: 12, color: 'var(--grey-500)', textDecoration: 'none', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em' }}>
          ← Mis Torneos
        </Link>
        <div style={{ fontFamily: 'var(--font-display)', fontSize: 14, fontWeight: 700, letterSpacing: '0.1em', color: 'var(--grey-400)' }}>
          PADELMGT
        </div>
        <span style={{ fontSize: 10, fontWeight: 700, padding: '3px 10px', background: si.bg, color: si.color, letterSpacing: '0.1em', textTransform: 'uppercase' }}>
          {si.label}
        </span>
      </div>

      {/* ── Header ── */}
      <div style={{ padding: '32px 40px 24px', borderBottom: '1px solid var(--grey-100)' }}>
        <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 40, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '-0.02em', margin: '0 0 16px' }}>
          {t.name}
        </h1>

        {/* Meta chips */}
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginBottom: 8 }}>
          {[
            formatDateDDMMYYYY(t.date),
            t.time,
            t.club,
            t.city,
            FORMAT_LABEL[t.format] ?? t.format,
            `${t.courts} canchas`,
            t.scoreConfig.type === 'points'
              ? `Pts ${t.scoreConfig.target ?? ''}`
              : `Trad. (${t.scoreConfig.setsPerMatch ?? 1} sets)`,
          ].filter(Boolean).map((chip, i) => (
            <span key={i} style={{
              fontSize: 11, fontWeight: 600, padding: '4px 12px',
              background: 'var(--grey-100)', color: 'var(--grey-500)',
              letterSpacing: '0.04em',
            }}>
              {chip}
            </span>
          ))}
        </div>
      </div>

      {/* ── Main content ── */}
      <div style={{ padding: '24px 40px' }}>

        {/* ── Player status banner ── */}
        {currentUser && (
          <>
            {/* Pending invitation */}
            {myInvitation && invStatus === 'pending' && (
              <div style={{
                padding: '16px 20px', background: '#fef9c3', border: '2px solid #fde047',
                color: '#854d0e', marginBottom: 20, display: 'flex',
                justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12,
              }}>
                <span style={{ fontSize: 14, fontWeight: 700 }}>
                  Tienes una invitación pendiente
                </span>
                <div style={{ display: 'flex', gap: 10 }}>
                  <button
                    onClick={handleAccept}
                    disabled={respondingId !== null}
                    style={{
                      padding: '9px 20px', background: 'var(--turf-green)', color: '#fff',
                      border: 'none', cursor: 'pointer', fontSize: 12, fontWeight: 700,
                      textTransform: 'uppercase', letterSpacing: '0.06em',
                    }}>
                    ✓ Aceptar
                  </button>
                  <button
                    onClick={handleReject}
                    disabled={respondingId !== null}
                    style={{
                      padding: '9px 20px', background: '#dc2626', color: '#fff',
                      border: 'none', cursor: 'pointer', fontSize: 12, fontWeight: 700,
                      textTransform: 'uppercase', letterSpacing: '0.06em',
                    }}>
                    ✗ Rechazar
                  </button>
                </div>
              </div>
            )}

            {/* Confirmed */}
            {isConfirmedPlayer && (
              <div style={{
                padding: '12px 20px', background: 'rgba(0,180,0,0.08)',
                border: '1px solid rgba(0,180,0,0.3)', color: 'var(--turf-green)',
                fontSize: 13, fontWeight: 700, marginBottom: 20,
              }}>
                Estás confirmado ✓
              </div>
            )}

            {/* Rejected */}
            {invStatus === 'rejected' && !isConfirmedPlayer && (
              <div style={{
                padding: '12px 20px', background: 'var(--grey-100)',
                border: '1px solid var(--grey-200)', color: 'var(--grey-500)',
                fontSize: 13, fontWeight: 600, marginBottom: 20,
              }}>
                Rechazaste esta invitación
              </div>
            )}
          </>
        )}

        {/* ── Confirmed players ── */}
        <div style={card}>
          <div style={secTitle}>Jugadores confirmados ({confirmedPlayers.length})</div>
          {confirmedPlayers.length === 0 && (
            <div style={{ fontSize: 13, color: 'var(--grey-400)', fontStyle: 'italic' }}>No hay jugadores confirmados aún.</div>
          )}
          {confirmedPlayers.map(p => (
            <div key={p.id} style={{
              display: 'flex', alignItems: 'center', gap: 12,
              padding: '10px 12px', marginBottom: 6,
              border: '1px solid var(--grey-200)',
              background: p.isCreator ? 'rgba(214,255,0,0.04)' : '#fff',
            }}>
              <div style={{
                width: 32, height: 32, borderRadius: '50%',
                background: p.isCreator ? 'var(--black)' : 'var(--turf-green)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 10, fontWeight: 700, color: '#fff', flexShrink: 0,
              }}>
                {initials(p.name)}
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 13, fontWeight: 600 }}>{p.name}</div>
              </div>
              {p.isCreator && (
                <span style={{ fontSize: 9, fontWeight: 700, padding: '2px 7px', background: 'var(--black)', color: 'var(--neon)', letterSpacing: '0.08em', textTransform: 'uppercase' }}>
                  CREADOR
                </span>
              )}
            </div>
          ))}
        </div>

        {/* ── Invited players (pending) — only in created/starting_soon ── */}
        {pendingInvited.length > 0 && (
          <div style={card}>
            <div style={secTitle}>Invitados pendientes ({pendingInvited.length})</div>
            {pendingInvited.map(ip => (
              <div key={ip.id} style={{
                display: 'flex', alignItems: 'center', gap: 12,
                padding: '10px 12px', marginBottom: 6, border: '1px dashed var(--grey-200)',
              }}>
                <div style={{
                  width: 32, height: 32, borderRadius: '50%', background: 'var(--grey-300)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 10, fontWeight: 700, color: '#fff', flexShrink: 0,
                }}>
                  {initials(ip.name)}
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 13, fontWeight: 500 }}>{ip.name}</div>
                </div>
                <span style={{
                  fontSize: 9, fontWeight: 700, padding: '2px 8px',
                  background: 'rgba(245,166,35,0.15)', color: '#f5a623',
                  letterSpacing: '0.08em', textTransform: 'uppercase',
                }}>
                  PENDIENTE
                </span>
              </div>
            ))}
          </div>
        )}

        {/* ── Tournament info box ── */}
        <div style={card}>
          <div style={secTitle}>Información del torneo</div>
          {[
            { label: 'Formato',    value: FORMAT_LABEL[t.format] ?? t.format },
            { label: 'Modalidad',  value: MODALIDAD_LABEL[t.pairType] ?? t.pairType },
            { label: 'Mixto',      value: t.mixto ? 'Sí' : 'No' },
            { label: 'Max. Jugadores', value: String(t.maxPlayers) },
            { label: 'Canchas',    value: String(t.courts) },
            { label: 'Puntuación', value: t.scoreConfig.type === 'points'
              ? `Por puntos (objetivo: ${t.scoreConfig.target ?? '–'})`
              : `Tradicional (${t.scoreConfig.setsPerMatch ?? 1} sets)` },
          ].map(row => (
            <div key={row.label} style={{
              display: 'flex', justifyContent: 'space-between',
              padding: '8px 0', borderBottom: '1px solid var(--grey-100)',
            }}>
              <span style={{ fontSize: 11, color: 'var(--grey-400)', textTransform: 'uppercase', fontWeight: 600, letterSpacing: '0.08em' }}>
                {row.label}
              </span>
              <span style={{ fontSize: 13, fontWeight: 600 }}>{row.value}</span>
            </div>
          ))}
        </div>

        {/* ── Standings ── */}
        {hasStandings && (() => {
          const isParejas = t.pairType === 'parejas' && t.fixedPairs && t.fixedPairs.length > 0;
          function pairLabel(playerId: string): string {
            if (isParejas) {
              const pair = t.fixedPairs!.find(p => p.player1Id === playerId);
              if (pair) return pair.name || `${pair.player1Name} / ${pair.player2Name}`;
            }
            return t.players.find(p => p.id === playerId)?.name ?? playerId;
          }
          function pairSub(playerId: string): string | null {
            if (!isParejas) return null;
            const pair = t.fixedPairs!.find(p => p.player1Id === playerId);
            return pair?.name ? `${pair.player1Name} / ${pair.player2Name}` : null;
          }
          const isMe = (playerId: string) => currentUser && (
            playerId === currentUser.id ||
            (isParejas && t.fixedPairs!.some(p => p.player1Id === playerId && (p.player1Id === currentUser.id || p.player2Id === currentUser.id)))
          );
          return (
            <div style={card}>
              <div style={secTitle}>Clasificación</div>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                <thead>
                  <tr style={{ borderBottom: '2px solid var(--grey-100)' }}>
                    {['Pos', isParejas ? 'Equipo' : 'Jugador', 'W', 'Pts', 'PJ', '+/-'].map(h => (
                      <th key={h} style={{
                        padding: '6px 8px', textAlign: h === 'Equipo' || h === 'Jugador' ? 'left' : 'center',
                        fontSize: 9, fontWeight: 700, letterSpacing: '0.12em',
                        textTransform: 'uppercase', color: 'var(--grey-400)',
                      }}>
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {t.standings.map((s, i) => {
                    const me = isMe(s.playerId);
                    const sub = pairSub(s.playerId);
                    return (
                      <tr key={s.playerId} style={{
                        borderBottom: '1px solid var(--grey-100)',
                        background: me ? 'rgba(214,255,0,0.06)' : 'transparent',
                      }}>
                        <td style={{ padding: '8px', textAlign: 'center', fontFamily: 'var(--font-display)', fontWeight: 700, color: i === 0 ? 'var(--turf-green)' : 'var(--grey-400)' }}>
                          {i === 0 ? '🥇' : i + 1}
                        </td>
                        <td style={{ padding: '8px', fontWeight: me ? 700 : 500 }}>
                          <div>{pairLabel(s.playerId)}{me && <span style={{ marginLeft: 4, fontSize: 11 }}>★</span>}</div>
                          {sub && <div style={{ fontSize: 10, color: 'var(--grey-400)', marginTop: 1 }}>{sub}</div>}
                        </td>
                        <td style={{ padding: '8px', textAlign: 'center' }}>{s.wins}</td>
                        <td style={{ padding: '8px', textAlign: 'center', fontWeight: 700 }}>{s.pts}</td>
                        <td style={{ padding: '8px', textAlign: 'center' }}>{s.played}</td>
                        <td style={{ padding: '8px', textAlign: 'center', color: s.diff >= 0 ? 'var(--turf-green)' : '#dc2626' }}>
                          {s.diff > 0 ? `+${s.diff}` : s.diff}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          );
        })()}

        {/* ── Footer link ── */}
        <div style={{ textAlign: 'center', paddingTop: 8 }}>
          <a
            href={`/tournament/${t.code}`}
            target="_blank"
            rel="noopener noreferrer"
            style={{ fontSize: 12, color: 'var(--grey-500)', textDecoration: 'none', fontWeight: 600, letterSpacing: '0.04em' }}>
            Ver página pública →
          </a>
        </div>
      </div>
    </div>
  );
}
