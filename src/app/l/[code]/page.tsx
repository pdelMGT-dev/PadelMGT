'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { QRCodeSVG } from 'qrcode.react';
import {
  getPlayerLeagueByCode,
  getLeagueSeasons,
  getActiveSeason,
  getLeagueMembers,
  getLeagueJoinRequestForPlayer,
  createLeagueJoinRequest,
  isLeagueMember,
  computeLeagueStandings,
  type PlayerLeague,
  type LeagueSeason,
  type LeagueStandingEntry,
  type LeagueJoinRequest,
} from '@/lib/player-league-store';
import { getAllGames } from '@/lib/game-store';
import { useCurrentUser } from '@/hooks/useCurrentUser';

type JoinState = 'idle' | 'submitting' | 'success' | 'error';

export default function PublicLeaguePage() {
  const { code } = useParams<{ code: string }>();
  const { user: currentUser } = useCurrentUser();

  const [league, setLeague] = useState<PlayerLeague | null | undefined>(undefined);
  const [seasons, setSeasons] = useState<LeagueSeason[]>([]);
  const [activeSeason, setActiveSeason] = useState<LeagueSeason | null>(null);
  const [memberCount, setMemberCount] = useState(0);
  const [standings, setStandings] = useState<LeagueStandingEntry[]>([]);
  const [joinRequest, setJoinRequest] = useState<LeagueJoinRequest | null>(null);
  const [isMember, setIsMember] = useState(false);
  const [joinMessage, setJoinMessage] = useState('');
  const [joinState, setJoinState] = useState<JoinState>('idle');
  const [shareUrl, setShareUrl] = useState('');
  const [copied, setCopied] = useState(false);

  // Load all data on mount / when user changes
  useEffect(() => {
    const l = getPlayerLeagueByCode(code);
    setLeague(l ?? null);
    if (!l) return;

    const allSeasons = getLeagueSeasons(l.id);
    setSeasons(allSeasons);

    const active = getActiveSeason(l.id);
    setActiveSeason(active);

    const members = getLeagueMembers(l.id);
    setMemberCount(members.length);

    const games = getAllGames();
    const computed = computeLeagueStandings(l.id, active?.id ?? null, games);
    setStandings(computed);

    if (currentUser) {
      const req = getLeagueJoinRequestForPlayer(l.id, currentUser.id);
      setJoinRequest(req);
      setIsMember(isLeagueMember(l.id, currentUser.id));
    }
  }, [code, currentUser?.id]);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      setShareUrl(window.location.href);
    }
  }, []);

  function handleJoinSubmit() {
    if (!currentUser || !league) return;
    setJoinState('submitting');
    try {
      const req = createLeagueJoinRequest({
        leagueId: league.id,
        playerId: currentUser.id,
        playerName: currentUser.name,
        playerEmail: currentUser.email,
        message: joinMessage.trim() || undefined,
      });
      setJoinRequest(req);
      setJoinState('success');
    } catch {
      setJoinState('error');
    }
  }

  function handleCopy() {
    navigator.clipboard.writeText(shareUrl).catch(() => {});
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  function rankMedal(rank: number): string {
    if (rank === 1) return '🥇';
    if (rank === 2) return '🥈';
    if (rank === 3) return '🥉';
    return String(rank);
  }

  // ── Loading state ──────────────────────────────────────────────────────────
  if (league === undefined) {
    return (
      <div style={{
        minHeight: '100vh', background: 'var(--black)', color: '#fff',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontFamily: 'var(--font-body)',
      }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{
            width: 40, height: 40, border: '3px solid rgba(255,255,255,0.1)',
            borderTopColor: 'var(--neon)', borderRadius: '50%',
            animation: 'spin 0.8s linear infinite', margin: '0 auto 16px',
          }} />
          <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
          <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.4)', letterSpacing: '0.15em', textTransform: 'uppercase' }}>
            Cargando liga…
          </div>
        </div>
      </div>
    );
  }

  // ── Not found ──────────────────────────────────────────────────────────────
  if (league === null) {
    return (
      <div style={{
        minHeight: '100vh', background: 'var(--black)', color: '#fff',
        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
        fontFamily: 'var(--font-body)', gap: 16, padding: '0 24px', textAlign: 'center',
      }}>
        <div style={{
          fontFamily: 'var(--font-display)', fontSize: 'clamp(64px, 15vw, 120px)',
          fontWeight: 700, textTransform: 'uppercase', letterSpacing: '-0.04em',
          color: 'var(--neon)', lineHeight: 1,
        }}>
          404
        </div>
        <div style={{ fontSize: 20, fontWeight: 700, color: '#fff', marginBottom: 4 }}>
          Liga no encontrada
        </div>
        <div style={{ fontSize: 14, color: 'rgba(255,255,255,0.5)', maxWidth: 320 }}>
          El código <strong style={{ color: 'var(--neon)' }}>{code}</strong> no corresponde a ninguna liga activa.
        </div>
        <Link href="/" style={{
          marginTop: 8, padding: '12px 28px',
          background: 'var(--neon)', color: 'var(--black)',
          textDecoration: 'none', fontSize: 12, fontWeight: 700,
          textTransform: 'uppercase', letterSpacing: '0.1em',
        }}>
          ← Volver al inicio
        </Link>
      </div>
    );
  }

  // ── Determine join UI state ─────────────────────────────────────────────────
  const userIsLoggedIn = !!currentUser;
  const hasPendingRequest = !!(joinRequest && joinRequest.status === 'pending');
  const userRank = currentUser
    ? standings.findIndex(s => s.playerId === currentUser.id) + 1
    : 0;

  // ── Format dates ───────────────────────────────────────────────────────────
  function fmtDate(d: string) {
    try {
      return new Date(d).toLocaleDateString('es-AR', { day: 'numeric', month: 'short', year: 'numeric' });
    } catch {
      return d;
    }
  }

  const heroQrUrl = shareUrl || `https://padelmgt.com/l/${code}`;

  return (
    <div style={{ minHeight: '100vh', background: 'var(--black)', color: '#fff', fontFamily: 'var(--font-body)' }}>

      {/* ── HERO ──────────────────────────────────────────────────────────────── */}
      <div style={{
        background: 'var(--black)',
        borderBottom: '1px solid rgba(255,255,255,0.08)',
        position: 'relative',
        overflow: 'hidden',
      }}>
        {/* Subtle neon accent line */}
        <div style={{
          position: 'absolute', top: 0, left: 0, right: 0,
          height: 3, background: 'var(--neon)',
        }} />

        {/* Background texture dots */}
        <div style={{
          position: 'absolute', inset: 0, opacity: 0.03,
          backgroundImage: 'radial-gradient(circle, #fff 1px, transparent 1px)',
          backgroundSize: '28px 28px',
          pointerEvents: 'none',
        }} />

        <div style={{ position: 'relative', maxWidth: 1200, margin: '0 auto', padding: 'clamp(32px,6vw,64px) clamp(20px,5vw,48px) clamp(40px,6vw,72px)' }}>

          {/* PadelMGT Logo */}
          <Link href="/" style={{
            display: 'inline-block', textDecoration: 'none',
            fontFamily: 'var(--font-display)', fontSize: 12,
            fontWeight: 700, letterSpacing: '0.18em', textTransform: 'uppercase',
            color: 'var(--neon)', marginBottom: 48,
          }}>
            PADELMGT
          </Link>

          {/* Private badge */}
          {!league.isPublic && (
            <div style={{ marginBottom: 20 }}>
              <span style={{
                display: 'inline-flex', alignItems: 'center', gap: 6,
                padding: '5px 14px', border: '1px solid rgba(255,255,255,0.2)',
                fontSize: 11, fontWeight: 700, letterSpacing: '0.1em',
                textTransform: 'uppercase', color: 'rgba(255,255,255,0.5)',
              }}>
                📊 Standings Privados
              </span>
            </div>
          )}

          {/* League name */}
          <h1 style={{
            fontFamily: 'var(--font-display)',
            fontSize: 'clamp(36px, 7vw, 64px)',
            fontWeight: 700,
            textTransform: 'uppercase',
            letterSpacing: '-0.025em',
            lineHeight: 0.92,
            color: '#fff',
            margin: '0 0 20px',
          }}>
            {league.name}
          </h1>

          {/* Description */}
          {league.description && (
            <p style={{
              fontSize: 15, color: 'rgba(255,255,255,0.55)',
              maxWidth: 560, margin: '0 0 28px', lineHeight: 1.6,
            }}>
              {league.description}
            </p>
          )}

          {/* Stats bar */}
          <div style={{
            display: 'flex', flexWrap: 'wrap', gap: 0,
            borderTop: '1px solid rgba(255,255,255,0.1)',
            paddingTop: 24,
          }}>
            <div style={{ paddingRight: 24, marginRight: 24, borderRight: '1px solid rgba(255,255,255,0.12)' }}>
              <div style={{ fontSize: 9, letterSpacing: '0.18em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.35)', marginBottom: 4, fontWeight: 600 }}>Miembros</div>
              <div style={{ fontFamily: 'var(--font-display)', fontSize: 28, fontWeight: 700, color: '#fff', lineHeight: 1 }}>{memberCount}</div>
            </div>
            {activeSeason ? (
              <>
                <div style={{ paddingRight: 24, marginRight: 24, borderRight: '1px solid rgba(255,255,255,0.12)' }}>
                  <div style={{ fontSize: 9, letterSpacing: '0.18em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.35)', marginBottom: 4, fontWeight: 600 }}>Temporada Activa</div>
                  <div style={{ fontFamily: 'var(--font-display)', fontSize: 18, fontWeight: 700, color: 'var(--neon)', lineHeight: 1 }}>{activeSeason.name}</div>
                </div>
                <div>
                  <div style={{ fontSize: 9, letterSpacing: '0.18em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.35)', marginBottom: 4, fontWeight: 600 }}>Período</div>
                  <div style={{ fontSize: 14, color: 'rgba(255,255,255,0.7)', lineHeight: 1.3 }}>
                    {fmtDate(activeSeason.startDate)} — {fmtDate(activeSeason.endDate)}
                  </div>
                </div>
              </>
            ) : (
              <div>
                <div style={{ fontSize: 9, letterSpacing: '0.18em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.35)', marginBottom: 4, fontWeight: 600 }}>Temporada</div>
                <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.4)' }}>Sin temporada activa</div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── MAIN CONTENT ──────────────────────────────────────────────────────── */}
      <div style={{ maxWidth: 1200, margin: '0 auto', padding: 'clamp(32px,5vw,56px) clamp(20px,5vw,48px) 80px' }}>
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'minmax(0, 1fr)',
          gap: 32,
        }}>
          {/* On desktop: 2-col layout using a wrapper approach */}
          <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr)', gap: 32 }}>
            <style>{`
              @media (min-width: 768px) {
                .league-layout { grid-template-columns: 60% 1fr !important; }
              }
            `}</style>
            <div className="league-layout" style={{
              display: 'grid',
              gridTemplateColumns: 'minmax(0, 1fr)',
              gap: 32,
            }}>

              {/* ── LEFT COLUMN ─────────────────────────────────────────────── */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>

                {/* STANDINGS TABLE */}
                {league.isPublic ? (
                  <div style={{ border: '1px solid rgba(255,255,255,0.12)', overflow: 'hidden' }}>
                    {/* Table header */}
                    <div style={{
                      padding: '16px 24px',
                      background: 'rgba(255,255,255,0.04)',
                      borderBottom: '1px solid rgba(255,255,255,0.1)',
                      display: 'flex', alignItems: 'center', gap: 10,
                    }}>
                      <div style={{
                        width: 3, height: 20, background: 'var(--neon)', flexShrink: 0,
                      }} />
                      <div style={{
                        fontFamily: 'var(--font-display)', fontSize: 13,
                        fontWeight: 700, textTransform: 'uppercase',
                        letterSpacing: '0.14em', color: '#fff',
                      }}>
                        Tabla de Posiciones
                      </div>
                      {activeSeason && (
                        <div style={{
                          marginLeft: 'auto', fontSize: 10,
                          color: 'rgba(255,255,255,0.35)',
                          letterSpacing: '0.08em', textTransform: 'uppercase',
                        }}>
                          {activeSeason.name}
                        </div>
                      )}
                    </div>

                    {standings.length === 0 ? (
                      <div style={{ padding: '48px 24px', textAlign: 'center' }}>
                        <div style={{
                          fontFamily: 'var(--font-display)',
                          fontSize: 32, fontWeight: 700,
                          textTransform: 'uppercase', letterSpacing: '-0.02em',
                          color: 'rgba(255,255,255,0.12)', marginBottom: 10,
                        }}>
                          SIN DATOS
                        </div>
                        <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.35)' }}>
                          Aún no hay resultados registrados
                        </div>
                      </div>
                    ) : (
                      <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                        <thead>
                          <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
                            {['#', 'Jugador', 'J', 'G', 'E', 'P', 'PTS'].map((h, i) => (
                              <th key={h} style={{
                                padding: i === 0 ? '10px 16px 10px 20px' : i === 1 ? '10px 16px' : '10px 10px',
                                textAlign: i > 1 ? 'center' : 'left',
                                fontSize: 9, fontWeight: 700,
                                letterSpacing: '0.14em', textTransform: 'uppercase',
                                color: 'rgba(255,255,255,0.35)',
                              }}>
                                {h}
                              </th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {standings.map((entry, idx) => {
                            const rank = idx + 1;
                            const isMe = currentUser && entry.playerId === currentUser.id;
                            return (
                              <tr key={entry.playerId} style={{
                                borderBottom: '1px solid rgba(255,255,255,0.06)',
                                background: isMe ? 'rgba(214,255,0,0.06)' : 'transparent',
                                transition: 'background 0.15s',
                              }}>
                                {/* Rank */}
                                <td style={{
                                  padding: '14px 8px 14px 20px',
                                  fontFamily: rank <= 3 ? 'var(--font-body)' : 'var(--font-display)',
                                  fontSize: rank <= 3 ? 18 : 15,
                                  fontWeight: 700, color: '#fff',
                                  width: 48,
                                }}>
                                  {rankMedal(rank)}
                                </td>

                                {/* Player name */}
                                <td style={{ padding: '14px 16px 14px 8px' }}>
                                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                    <span style={{
                                      fontSize: 14, fontWeight: isMe ? 700 : 500,
                                      color: isMe ? 'var(--neon)' : '#fff',
                                    }}>
                                      {entry.playerName}
                                    </span>
                                    {isMe && (
                                      <span style={{
                                        padding: '2px 7px', background: 'var(--neon)',
                                        color: 'var(--black)', fontSize: 9,
                                        fontWeight: 700, letterSpacing: '0.1em',
                                        textTransform: 'uppercase',
                                      }}>
                                        TÚ
                                      </span>
                                    )}
                                  </div>
                                </td>

                                {/* Stats */}
                                {[entry.played, entry.wins, entry.draws, entry.losses].map((val, si) => (
                                  <td key={si} style={{
                                    padding: '14px 10px', textAlign: 'center',
                                    fontSize: 13, color: 'rgba(255,255,255,0.55)',
                                    fontWeight: 500,
                                  }}>
                                    {val}
                                  </td>
                                ))}

                                {/* Points */}
                                <td style={{
                                  padding: '14px 20px 14px 10px', textAlign: 'center',
                                  fontFamily: 'var(--font-display)', fontSize: 22,
                                  fontWeight: 700, color: isMe ? 'var(--neon)' : '#fff',
                                }}>
                                  {entry.points}
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    )}
                  </div>
                ) : (
                  /* Private standings message */
                  <div style={{
                    border: '1px solid rgba(255,255,255,0.1)',
                    padding: '40px 32px', textAlign: 'center',
                  }}>
                    <div style={{
                      fontFamily: 'var(--font-display)', fontSize: 36,
                      fontWeight: 700, textTransform: 'uppercase',
                      letterSpacing: '-0.02em', color: 'rgba(255,255,255,0.15)',
                      marginBottom: 12,
                    }}>
                      PRIVADO
                    </div>
                    <div style={{ fontSize: 14, color: 'rgba(255,255,255,0.4)' }}>
                      La tabla de posiciones de esta liga es privada
                    </div>
                  </div>
                )}

                {/* ── JOIN SECTION ─────────────────────────────────────────── */}
                {isMember ? (
                  /* State D: already a member */
                  <div style={{
                    border: '1px solid rgba(214,255,0,0.25)',
                    padding: '24px 28px',
                    background: 'rgba(214,255,0,0.04)',
                  }}>
                    <div style={{
                      display: 'flex', alignItems: 'flex-start', gap: 16,
                      flexWrap: 'wrap',
                    }}>
                      <div style={{
                        width: 36, height: 36, background: 'var(--neon)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        flexShrink: 0, fontSize: 18,
                      }}>
                        ✓
                      </div>
                      <div style={{ flex: 1 }}>
                        <div style={{
                          fontFamily: 'var(--font-display)', fontSize: 14,
                          fontWeight: 700, textTransform: 'uppercase',
                          letterSpacing: '0.1em', color: 'var(--neon)', marginBottom: 4,
                        }}>
                          Ya eres miembro de esta liga
                        </div>
                        {league.isPublic && userRank > 0 && (
                          <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.6)' }}>
                            Tu posición actual:{' '}
                            <strong style={{ color: '#fff', fontFamily: 'var(--font-display)', fontSize: 16 }}>
                              #{userRank}
                            </strong>
                            {' '}con{' '}
                            <strong style={{ color: 'var(--neon)' }}>
                              {standings[userRank - 1]?.points ?? 0} pts
                            </strong>
                          </div>
                        )}
                        {league.isPublic && userRank === 0 && standings.length === 0 && (
                          <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.4)' }}>
                            Aún no hay partidos registrados
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ) : hasPendingRequest ? (
                  /* State C: has pending request */
                  <div style={{
                    background: 'var(--neon)',
                    padding: '20px 24px',
                    display: 'flex', alignItems: 'center', gap: 14,
                  }}>
                    <div style={{ fontSize: 20 }}>✓</div>
                    <div>
                      <div style={{
                        fontFamily: 'var(--font-display)', fontSize: 13,
                        fontWeight: 700, textTransform: 'uppercase',
                        letterSpacing: '0.1em', color: 'var(--black)',
                      }}>
                        Solicitud enviada
                      </div>
                      <div style={{ fontSize: 12, color: 'rgba(0,0,0,0.65)', marginTop: 2 }}>
                        El administrador revisará tu solicitud
                      </div>
                    </div>
                  </div>
                ) : !userIsLoggedIn ? (
                  /* State A: not logged in */
                  <div style={{ border: '1px solid rgba(255,255,255,0.12)', padding: '28px 28px' }}>
                    <div style={{
                      fontFamily: 'var(--font-display)', fontSize: 14,
                      fontWeight: 700, textTransform: 'uppercase',
                      letterSpacing: '0.1em', color: '#fff', marginBottom: 8,
                    }}>
                      Únete a esta liga
                    </div>
                    <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.5)', marginBottom: 20 }}>
                      Solicitá unirte a esta liga iniciando sesión con tu cuenta.
                    </div>
                    <Link href={`/login?returnTo=/l/${code}`} style={{
                      display: 'inline-block',
                      padding: '13px 28px',
                      background: 'var(--neon)', color: 'var(--black)',
                      textDecoration: 'none', fontSize: 12, fontWeight: 700,
                      textTransform: 'uppercase', letterSpacing: '0.1em',
                    }}>
                      Iniciar sesión para unirte →
                    </Link>
                  </div>
                ) : (
                  /* State B: logged in, not member, no request */
                  <div style={{ border: '1px solid rgba(255,255,255,0.12)' }}>
                    {/* Header */}
                    <div style={{
                      padding: '16px 24px',
                      background: 'rgba(255,255,255,0.04)',
                      borderBottom: '1px solid rgba(255,255,255,0.1)',
                      display: 'flex', alignItems: 'center', gap: 10,
                    }}>
                      <div style={{ width: 3, height: 20, background: 'var(--neon)', flexShrink: 0 }} />
                      <div style={{
                        fontFamily: 'var(--font-display)', fontSize: 13,
                        fontWeight: 700, textTransform: 'uppercase',
                        letterSpacing: '0.14em', color: '#fff',
                      }}>
                        Únete a esta liga
                      </div>
                    </div>

                    <div style={{ padding: '24px 24px' }}>
                      {!league.isOpen && (
                        <div style={{
                          display: 'flex', gap: 10, alignItems: 'flex-start',
                          padding: '12px 16px',
                          background: 'rgba(255,255,255,0.04)',
                          border: '1px solid rgba(255,255,255,0.1)',
                          marginBottom: 20,
                        }}>
                          <span style={{ fontSize: 14, flexShrink: 0 }}>⚑</span>
                          <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.55)', lineHeight: 1.5 }}>
                            <strong style={{ color: 'rgba(255,255,255,0.8)' }}>Liga privada</strong>
                            {' '}— tu solicitud será revisada por el administrador
                          </div>
                        </div>
                      )}

                      <div style={{ marginBottom: 16 }}>
                        <label style={{
                          display: 'block', fontSize: 10,
                          letterSpacing: '0.14em', textTransform: 'uppercase',
                          color: 'rgba(255,255,255,0.45)', marginBottom: 8, fontWeight: 600,
                        }}>
                          Mensaje para el administrador (opcional)
                        </label>
                        <textarea
                          value={joinMessage}
                          onChange={e => setJoinMessage(e.target.value.slice(0, 200))}
                          placeholder="Presentate o contá por qué quieres unirte…"
                          rows={3}
                          style={{
                            width: '100%', padding: '12px 16px',
                            background: 'rgba(255,255,255,0.06)',
                            border: '1px solid rgba(255,255,255,0.12)',
                            color: '#fff', fontSize: 13,
                            fontFamily: 'var(--font-body)',
                            outline: 'none', resize: 'vertical',
                            boxSizing: 'border-box',
                          }}
                        />
                        <div style={{
                          textAlign: 'right', fontSize: 10,
                          color: 'rgba(255,255,255,0.25)', marginTop: 4,
                        }}>
                          {joinMessage.length}/200
                        </div>
                      </div>

                      <button
                        onClick={handleJoinSubmit}
                        disabled={joinState === 'submitting'}
                        style={{
                          width: '100%', padding: '14px 24px',
                          background: joinState === 'submitting' ? 'rgba(214,255,0,0.6)' : 'var(--black)',
                          color: joinState === 'submitting' ? 'var(--black)' : '#fff',
                          border: '2px solid var(--neon)',
                          fontSize: 12, fontWeight: 700,
                          textTransform: 'uppercase', letterSpacing: '0.12em',
                          cursor: joinState === 'submitting' ? 'not-allowed' : 'pointer',
                          transition: 'all 0.15s',
                          fontFamily: 'var(--font-display)',
                        }}
                      >
                        {joinState === 'submitting' ? 'Enviando…' : 'Solicitar Ingreso'}
                      </button>

                      {joinState === 'error' && (
                        <div style={{ fontSize: 12, color: '#f87171', marginTop: 10, textAlign: 'center' }}>
                          Error al enviar la solicitud. Intentá de nuevo.
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* ── RIGHT COLUMN: QR SIDEBAR (desktop only) ────────────────── */}
              <div>
                <div style={{
                  border: '1px solid rgba(255,255,255,0.12)',
                  overflow: 'hidden',
                  position: 'sticky', top: 32,
                }}>
                  {/* Sidebar header */}
                  <div style={{
                    padding: '14px 20px',
                    background: 'rgba(255,255,255,0.04)',
                    borderBottom: '1px solid rgba(255,255,255,0.1)',
                    display: 'flex', alignItems: 'center', gap: 8,
                  }}>
                    <div style={{ width: 3, height: 16, background: 'var(--neon)', flexShrink: 0 }} />
                    <div style={{
                      fontFamily: 'var(--font-display)', fontSize: 11,
                      fontWeight: 700, textTransform: 'uppercase',
                      letterSpacing: '0.14em', color: '#fff',
                    }}>
                      Compartí esta liga
                    </div>
                  </div>

                  {/* QR Code */}
                  <div style={{
                    padding: '28px 24px', background: '#fff',
                    display: 'flex', justifyContent: 'center', alignItems: 'center',
                    minHeight: 200,
                  }}>
                    <QRCodeSVG
                      value={heroQrUrl}
                      size={160}
                      fgColor="#0a0a0a"
                      bgColor="#ffffff"
                    />
                  </div>

                  {/* URL + copy */}
                  <div style={{ padding: '16px 20px', borderTop: '1px solid rgba(255,255,255,0.08)' }}>
                    <div style={{
                      fontSize: 10, color: 'rgba(255,255,255,0.35)',
                      wordBreak: 'break-all', marginBottom: 12,
                      letterSpacing: '0.03em', lineHeight: 1.5,
                    }}>
                      {heroQrUrl || `https://padelmgt.com/l/${code}`}
                    </div>
                    <button
                      onClick={handleCopy}
                      style={{
                        width: '100%', padding: '10px',
                        background: copied ? 'var(--neon)' : 'rgba(255,255,255,0.08)',
                        border: `1px solid ${copied ? 'var(--neon)' : 'rgba(255,255,255,0.15)'}`,
                        color: copied ? 'var(--black)' : '#fff',
                        fontSize: 10, fontWeight: 700,
                        textTransform: 'uppercase', letterSpacing: '0.12em',
                        cursor: 'pointer', transition: 'all 0.2s',
                        fontFamily: 'var(--font-display)',
                      }}
                    >
                      {copied ? '✓ Copiado' : 'Copiar link'}
                    </button>
                  </div>

                  {/* League code badge */}
                  <div style={{
                    padding: '14px 20px',
                    borderTop: '1px solid rgba(255,255,255,0.08)',
                    textAlign: 'center',
                  }}>
                    <div style={{
                      fontSize: 9, letterSpacing: '0.18em', textTransform: 'uppercase',
                      color: 'rgba(255,255,255,0.3)', marginBottom: 4, fontWeight: 600,
                    }}>
                      Código de liga
                    </div>
                    <div style={{
                      fontFamily: 'var(--font-display)', fontSize: 22,
                      fontWeight: 700, letterSpacing: '0.18em',
                      color: 'var(--neon)',
                    }}>
                      {code}
                    </div>
                  </div>
                </div>
              </div>

            </div>
          </div>
        </div>
      </div>

      {/* ── FOOTER ─────────────────────────────────────────────────────────────── */}
      <div style={{
        borderTop: '1px solid rgba(255,255,255,0.08)',
        padding: '24px clamp(20px,5vw,48px)',
      }}>
        <div style={{
          maxWidth: 1200, margin: '0 auto',
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          flexWrap: 'wrap', gap: 12,
        }}>
          <div style={{ display: 'flex', gap: 20, alignItems: 'center', flexWrap: 'wrap' }}>
            <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.3)' }}>
              Powered by{' '}
              <Link href="/" style={{
                color: 'var(--neon)', textDecoration: 'none', fontWeight: 700,
              }}>
                PadelMGT
              </Link>
            </span>
            <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.2)' }}>|</span>
            <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.3)' }}>
              Creado por{' '}
              <strong style={{ color: 'rgba(255,255,255,0.55)' }}>
                {league.createdByName}
              </strong>
            </span>
          </div>
          <Link href="/" style={{
            fontSize: 10, color: 'rgba(255,255,255,0.25)',
            textDecoration: 'none', letterSpacing: '0.1em',
            textTransform: 'uppercase', fontWeight: 600,
          }}>
            padelmgt.com
          </Link>
        </div>
      </div>
    </div>
  );
}
