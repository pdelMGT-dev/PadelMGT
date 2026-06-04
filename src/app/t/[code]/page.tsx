'use client';

import { use, useEffect, useState } from 'react';
import Link from 'next/link';
import { QRCodeSVG } from 'qrcode.react';
import { getTournamentByCode } from '@/lib/tournament-store';
import type { Tournament } from '@/lib/tournament-store';
import { submitJoinRequest, getMyJoinRequest, syncMyJoinRequestFromSupabase, type JoinRequest } from '@/lib/join-request-store';
import { useCurrentUser } from '@/hooks/useCurrentUser';

const STATUS_INFO: Record<string, { label: string; color: string }> = {
  created:       { label: 'Inscripciones abiertas', color: '#a78bfa' },
  starting_soon: { label: 'Por Empezar',             color: '#f5a623' },
  live:          { label: 'En Vivo',                  color: 'var(--neon)' },
  finished:      { label: 'Finalizado',               color: 'rgba(255,255,255,0.5)' },
};

const FORMAT_LABEL: Record<string, string> = {
  americano: 'Americano', mexicano: 'Mexicano', round_robin: 'Round Robin',
  team_league: 'Team League', knockout: 'Knockout', world_cup: 'World Cup',
};

interface TournamentSnap {
  id?: string;
  n: string; cl: string; ci: string; co: string;
  st: string; p: number; mp: number;
  fmt: string; pt: string; lv: string; d: string;
}

export default function PublicTournamentPage({ params }: { params: Promise<{ code: string }> }) {
  const { code } = use(params);
  const { user: currentUser } = useCurrentUser();

  const [tournament, setTournament] = useState<Tournament | null>(() =>
    typeof window !== 'undefined' ? getTournamentByCode(code) : null
  );
  const [snap, setSnap] = useState<TournamentSnap | null>(null);
  const [myRequest, setMyRequest] = useState<JoinRequest | null>(null);
  const [joinName, setJoinName] = useState('');
  const [joinSent, setJoinSent] = useState(false);
  const [joinError, setJoinError] = useState('');
  const [shareUrl, setShareUrl] = useState('');

  useEffect(() => {
    setShareUrl(window.location.href);
    const sp = new URLSearchParams(window.location.search).get('s');
    if (sp) {
      try {
        const decoded = JSON.parse(decodeURIComponent(escape(atob(sp)))) as TournamentSnap;
        setSnap(decoded);
      } catch {}
    }
  }, []);

  useEffect(() => {
    const load = () => {
      const t = getTournamentByCode(code);
      setTournament(t);
      if (currentUser && t) {
        // Check Supabase for status updates from the creator on another device
        syncMyJoinRequestFromSupabase(t.id, currentUser.id)
          .then(req => setMyRequest(req))
          .catch(() => setMyRequest(getMyJoinRequest(t.id, currentUser.id)));
      }
    };
    load();
    const interval = setInterval(load, 5000);
    return () => clearInterval(interval);
  }, [code, currentUser?.id]);

  function handleJoin(entityId: string) {
    if (!currentUser) return;
    const name = (joinName.trim() || currentUser.name || '').trim();
    if (!name) { setJoinError('Ingresá tu nombre'); return; }
    submitJoinRequest(entityId, 'tournament', currentUser.id, name, currentUser.email);
    setJoinSent(true);
    setJoinError('');
  }

  const t = tournament;
  const si = t ? (STATUS_INFO[t.status] ?? { label: t.status, color: '#fff' }) : null;
  const filled = t ? t.players.length >= t.maxPlayers : (snap ? snap.p >= snap.mp : false);
  const canJoin = t ? t.status === 'created' && !filled : (snap ? snap.st === 'created' && !filled : false);

  // ── Full tournament view (found in localStorage) ──────────────────────────
  if (t) {
    return (
      <div style={{ minHeight: '100vh', background: '#0a0f1e', color: '#fff', fontFamily: 'var(--font-body)' }}>
        <div style={{ position: 'relative', background: '#0a0f1e', padding: 'clamp(80px,10vw,140px) clamp(20px,5vw,48px) clamp(32px,4vw,48px)', borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
          <div style={{ position: 'relative', maxWidth: 1200, margin: '0 auto' }}>
            <Link href="/tournaments" style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 11, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.5)', textDecoration: 'none', marginBottom: 24, fontWeight: 600 }}>← Torneos</Link>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
              <span style={{ padding: '5px 14px', borderRadius: 30, border: `1px solid ${si?.color ?? '#fff'}`, color: si?.color ?? '#fff', fontSize: 11, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase' }}>
                {si?.label ?? t.status}
              </span>
              <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)', letterSpacing: '0.1em', textTransform: 'uppercase', fontWeight: 600 }}>{code}</span>
            </div>
            <h1 style={{ fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: 'clamp(36px, 6vw, 80px)', lineHeight: 0.92, textTransform: 'uppercase', letterSpacing: '-0.025em', margin: '0 0 16px', color: '#fff' }}>{t.name}</h1>
            <p style={{ fontSize: 14, color: 'rgba(255,255,255,0.6)', margin: 0 }}>{[t.date, t.time, t.club, t.city].filter(Boolean).join(' · ')}</p>
          </div>
        </div>

        <div style={{ background: 'rgba(255,255,255,0.04)', borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
          <div style={{ maxWidth: 1200, margin: '0 auto', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))', padding: '0 clamp(20px,5vw,48px)' }}>
            {[
              { label: 'Formato', value: FORMAT_LABEL[t.format] ?? t.format },
              { label: 'Modalidad', value: t.pairType === 'individual' ? 'Individual' : 'Parejas' },
              { label: 'Nivel', value: t.levelLabel || 'Todos los niveles' },
              { label: 'Jugadores', value: `${t.players.length} / ${t.maxPlayers}` },
              { label: 'Canchas', value: String(t.courts) },
            ].map(({ label, value }) => (
              <div key={label} style={{ padding: '20px 16px', borderRight: '1px solid rgba(255,255,255,0.06)' }}>
                <div style={{ fontSize: 9, letterSpacing: '0.18em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.4)', fontWeight: 600, marginBottom: 6 }}>{label}</div>
                <div style={{ fontFamily: 'var(--font-display)', fontSize: 18, fontWeight: 600, color: '#fff' }}>{value}</div>
              </div>
            ))}
          </div>
        </div>

        <div style={{ maxWidth: 1200, margin: '0 auto', padding: '40px clamp(20px,5vw,48px) 80px', display: 'grid', gridTemplateColumns: '1fr 300px', gap: 32 }}>
          <div>
            <div style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', padding: 24, marginBottom: 24 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                <span style={{ fontSize: 13, color: 'rgba(255,255,255,0.7)' }}>Jugadores confirmados</span>
                <span style={{ fontFamily: 'var(--font-display)', fontSize: 22, fontWeight: 700, color: '#fff' }}>{t.players.length}<span style={{ fontSize: 14, color: 'rgba(255,255,255,0.4)' }}>/{t.maxPlayers}</span></span>
              </div>
              <div style={{ height: 6, background: 'rgba(255,255,255,0.1)', overflow: 'hidden' }}>
                <div style={{ height: '100%', width: `${Math.min(100, (t.players.length / t.maxPlayers) * 100)}%`, background: 'var(--neon)', transition: 'width 0.3s' }} />
              </div>
              {t.players.length > 0 && (
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 16 }}>
                  {t.players.map(p => (
                    <span key={p.id} style={{ fontSize: 12, padding: '4px 12px', background: 'rgba(255,255,255,0.08)', color: 'rgba(255,255,255,0.7)' }}>{p.name}</span>
                  ))}
                </div>
              )}
            </div>

            {canJoin && (
              currentUser ? (
                myRequest || joinSent ? (
                  <div style={{ background: 'rgba(214,255,0,0.08)', border: '1px solid rgba(214,255,0,0.3)', padding: '20px 24px' }}>
                    <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--neon)', marginBottom: 4 }}>✓ Solicitud enviada</div>
                    <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.65)' }}>El organizador confirmará tu inscripción.</div>
                  </div>
                ) : (
                  <div style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.12)', padding: 24 }}>
                    <div style={{ fontSize: 14, fontWeight: 700, color: '#fff', marginBottom: 16 }}>Unirte a este torneo</div>
                    <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                      <input value={joinName} onChange={e => setJoinName(e.target.value)} placeholder={currentUser.name} style={{ flex: 1, padding: '10px 14px', background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.15)', color: '#fff', fontSize: 13, outline: 'none' }} />
                      <button onClick={() => handleJoin(t.id)} style={{ padding: '10px 24px', background: 'var(--neon)', color: '#000', border: 'none', fontSize: 12, fontWeight: 700, cursor: 'pointer', textTransform: 'uppercase', whiteSpace: 'nowrap' }}>Solicitar</button>
                    </div>
                    {joinError && <div style={{ fontSize: 12, color: '#f87171', marginTop: 8 }}>{joinError}</div>}
                  </div>
                )
              ) : (
                <div style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.12)', padding: 24 }}>
                  <div style={{ fontSize: 14, fontWeight: 700, color: '#fff', marginBottom: 8 }}>¿Querés unirte?</div>
                  <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.6)', marginBottom: 16 }}>Iniciá sesión para solicitar unirte al torneo.</div>
                  <div style={{ display: 'flex', gap: 12 }}>
                    <Link href={`/login?redirect=${encodeURIComponent(typeof window !== 'undefined' ? window.location.href : '')}`} className="btn btn-on-dark">Iniciar sesión →</Link>
                    <Link href="/register" className="btn btn-outline-dark">Crear cuenta</Link>
                  </div>
                </div>
              )
            )}
            {!canJoin && t.status !== 'created' && (
              <div style={{ padding: '16px 20px', border: '1px solid rgba(255,255,255,0.1)', fontSize: 13, color: 'rgba(255,255,255,0.5)' }}>
                {t.status === 'finished' ? 'Este torneo ya finalizó.' : t.status === 'live' ? 'Este torneo está en juego.' : 'Cupos completos.'}
              </div>
            )}
          </div>

          <div style={{ position: 'sticky', top: 24, alignSelf: 'start' }}>
            <div style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', padding: 24, textAlign: 'center' }}>
              <QRCodeSVG value={shareUrl || `https://padelmgt.com/t/${code}`} size={160} style={{ marginBottom: 16 }} />
              <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.5)', wordBreak: 'break-all', marginBottom: 16 }}>{shareUrl}</div>
              <button onClick={() => navigator.clipboard.writeText(shareUrl).catch(() => {})} style={{ width: '100%', padding: '10px', background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.15)', color: '#fff', fontSize: 11, fontWeight: 700, cursor: 'pointer', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Copiar link</button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ── Snapshot view (cross-device) ──────────────────────────────────────────
  if (!t && snap) {
    const si2 = STATUS_INFO[snap.st] ?? { label: snap.st, color: '#fff' };
    return (
      <div style={{ minHeight: '100vh', background: '#0a0f1e', color: '#fff', fontFamily: 'var(--font-body)' }}>
        <div style={{ position: 'relative', background: '#0a0f1e', padding: 'clamp(80px,10vw,140px) clamp(20px,5vw,48px) clamp(32px,4vw,48px)', borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
          <div style={{ position: 'relative', maxWidth: 1200, margin: '0 auto' }}>
            <Link href="/tournaments" style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 11, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.5)', textDecoration: 'none', marginBottom: 24, fontWeight: 600 }}>← Torneos</Link>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
              <span style={{ padding: '5px 14px', borderRadius: 30, border: `1px solid ${si2.color}`, color: si2.color, fontSize: 11, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase' }}>{si2.label}</span>
              <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)', letterSpacing: '0.1em', textTransform: 'uppercase', fontWeight: 600 }}>{code}</span>
            </div>
            <h1 style={{ fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: 'clamp(36px, 6vw, 80px)', lineHeight: 0.92, textTransform: 'uppercase', letterSpacing: '-0.025em', margin: '0 0 16px', color: '#fff' }}>{snap.n}</h1>
            <p style={{ fontSize: 14, color: 'rgba(255,255,255,0.6)', margin: 0 }}>{[snap.cl, snap.ci, snap.co, snap.d].filter(Boolean).join(' · ')}</p>
          </div>
        </div>

        <div style={{ maxWidth: 1200, margin: '0 auto', padding: '40px clamp(20px,5vw,48px) 80px' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 20, maxWidth: 560 }}>
            {[
              { label: 'Formato', value: FORMAT_LABEL[snap.fmt] ?? snap.fmt },
              { label: 'Jugadores', value: `${snap.p} / ${snap.mp}` },
              { label: 'Nivel', value: snap.lv || 'Todos los niveles' },
            ].map(({ label, value }) => (
              <div key={label} style={{ display: 'flex', justifyContent: 'space-between', padding: '12px 0', borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
                <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', letterSpacing: '0.1em', fontWeight: 600 }}>{label}</span>
                <span style={{ fontSize: 14, fontWeight: 600 }}>{value}</span>
              </div>
            ))}

            {snap.st === 'created' && snap.p < snap.mp ? (
              currentUser ? (
                joinSent ? (
                  <div style={{ background: 'rgba(214,255,0,0.08)', border: '1px solid rgba(214,255,0,0.3)', padding: '20px 24px' }}>
                    <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--neon)', marginBottom: 4 }}>✓ Solicitud enviada</div>
                    <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.65)' }}>El organizador confirmará tu inscripción.</div>
                  </div>
                ) : (
                  <div style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.12)', padding: 24 }}>
                    <div style={{ fontSize: 14, fontWeight: 700, color: '#fff', marginBottom: 16 }}>Solicitar unirse</div>
                    <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
                      <input value={joinName} onChange={e => setJoinName(e.target.value)} placeholder={currentUser.name} style={{ flex: 1, minWidth: 160, padding: '10px 14px', background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.15)', color: '#fff', fontSize: 13, outline: 'none' }} />
                      <button
                        onClick={() => {
                          const name = (joinName.trim() || currentUser.name || '').trim();
                          if (!name) { setJoinError('Ingresá tu nombre'); return; }
                          if (!snap.id) { setJoinError('No se pudo identificar el torneo.'); return; }
                          submitJoinRequest(snap.id, 'tournament', currentUser.id, name, currentUser.email);
                          setJoinSent(true); setJoinError('');
                        }}
                        style={{ padding: '10px 24px', background: 'var(--neon)', color: '#000', border: 'none', fontSize: 12, fontWeight: 700, cursor: 'pointer', textTransform: 'uppercase', whiteSpace: 'nowrap' }}
                      >Solicitar</button>
                    </div>
                    {joinError && <div style={{ fontSize: 12, color: '#f87171', marginTop: 8 }}>{joinError}</div>}
                  </div>
                )
              ) : (
                <div style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.12)', padding: 24 }}>
                  <div style={{ fontSize: 14, fontWeight: 700, color: '#fff', marginBottom: 8 }}>¿Querés unirte?</div>
                  <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.6)', marginBottom: 16 }}>Iniciá sesión para solicitar unirte al torneo.</div>
                  <div style={{ display: 'flex', gap: 12 }}>
                    <Link href={`/login?redirect=${encodeURIComponent(typeof window !== 'undefined' ? window.location.href : '')}`} className="btn btn-on-dark">Iniciar sesión →</Link>
                    <Link href="/register" className="btn btn-outline-dark">Crear cuenta</Link>
                  </div>
                </div>
              )
            ) : (
              <div style={{ padding: '16px 20px', border: '1px solid rgba(255,255,255,0.1)', fontSize: 13, color: 'rgba(255,255,255,0.5)' }}>
                {snap.st === 'finished' ? 'Este torneo ya finalizó.' : snap.p >= snap.mp ? 'Cupos completos.' : 'No disponible.'}
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  // ── Not found ─────────────────────────────────────────────────────────────
  return (
    <div style={{ minHeight: '100vh', background: '#0a0f1e', color: '#fff', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', fontFamily: 'var(--font-body)' }}>
      <div style={{ fontFamily: 'var(--font-display)', fontSize: 48, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '-0.02em', marginBottom: 12 }}>404</div>
      <div style={{ fontSize: 16, color: 'rgba(255,255,255,0.6)', marginBottom: 24 }}>Torneo no encontrado o link inválido.</div>
      <Link href="/tournaments" style={{ padding: '12px 24px', background: 'var(--neon)', color: '#000', textDecoration: 'none', fontSize: 12, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em' }}>Ver torneos</Link>
    </div>
  );
}
