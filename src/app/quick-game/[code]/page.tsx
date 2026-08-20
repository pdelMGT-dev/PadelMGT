'use client';

import { use, useEffect, useState } from 'react';
import Link from 'next/link';
import { QRCodeSVG } from 'qrcode.react';
import { getGameByCode, saveGame } from '@/lib/game-store';
import { fetchGameByCode } from '@/lib/supabase';
import type { ActiveGame, ScoreConfig, FixedPair } from '@/lib/game-engine';
import { submitJoinRequest, getMyJoinRequest, syncMyJoinRequestFromSupabase, type JoinRequest } from '@/lib/join-request-store';
import { getRankingHistoryForGame, fetchRankingHistoryForGameFromSupabase, type RankingEntry } from '@/lib/ranking-store';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import MatchSetResult from '@/components/MatchSetResult';

// ── Helpers ────────────────────────────────────────────────────────────────────

const STATUS_INFO: Record<string, { label: string; color: string; bg: string; dot?: boolean }> = {
  created:       { label: 'Inscripciones abiertas', color: '#a78bfa', bg: 'rgba(124,58,237,0.2)' },
  starting_soon: { label: 'Por Empezar',             color: '#f5a623', bg: 'rgba(245,166,35,0.2)' },
  live:          { label: 'En Vivo',                  color: 'var(--neon)', bg: 'rgba(214,255,0,0.15)', dot: true },
  finished:      { label: 'Finalizado',               color: 'rgba(255,255,255,0.5)', bg: 'rgba(255,255,255,0.08)' },
};

const FORMAT_LABEL: Record<string, string> = {
  americano: 'Americano', mexicano: 'Mexicano', round_robin: 'Round Robin',
  team_league: 'Team League', knockout: 'Knockout', world_cup: 'World Cup',
};

function scoreTypeLabel(cfg: ScoreConfig): string {
  if (cfg.type === 'points') return `${cfg.target} pts`;
  return 'Tradicional';
}

function computePairStandings(game: ActiveGame) {
  if (!game.fixedPairs || game.fixedPairs.length === 0) return [];
  return game.fixedPairs.map((pair: FixedPair) => {
    const s1 = game.standings.find(s => s.playerId === pair.player1Id);
    const s2 = game.standings.find(s => s.playerId === pair.player2Id);
    return {
      pair,
      pts:    (s1?.pts    ?? 0) + (s2?.pts    ?? 0),
      wins:   (s1?.wins   ?? 0) + (s2?.wins   ?? 0),
      losses: (s1?.losses ?? 0) + (s2?.losses ?? 0),
      draws:  (s1?.draws  ?? 0) + (s2?.draws  ?? 0),
      played: Math.max(s1?.played ?? 0, s2?.played ?? 0),
      diff:   (s1?.diff   ?? 0) + (s2?.diff   ?? 0),
    };
  }).sort((a, b) => b.pts - a.pts || b.diff - a.diff);
}

interface CurrentUser { id: string; name: string; email?: string; }

function PosBadge({ i }: { i: number }) {
  const colors = ['#e8a000', '#9e9e9e', '#a0522d'];
  if (i < 3) return (
    <span style={{ display: 'inline-flex', width: 26, height: 26, borderRadius: '50%', background: colors[i], color: '#fff', fontSize: 11, fontWeight: 700, alignItems: 'center', justifyContent: 'center' }}>
      {i + 1}
    </span>
  );
  return <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--grey-400)' }}>{i + 1}</span>;
}

const RESULT_INFO: Record<string, { label: string; bg: string; textColor: string }> = {
  win:  { label: 'VICTORIA', bg: '#dcfce7', textColor: '#166534' },
  draw: { label: 'EMPATE',   bg: '#fef9c3', textColor: '#854d0e' },
  loss: { label: 'DERROTA',  bg: '#fee2e2', textColor: '#991b1b' },
};

interface GameSnap {
  id?: string;
  n: string; cl: string; ci: string; co: string;
  st: string; p: number; mp: number;
  fmt: string; pt: string; lv: string;
}

// ── Main page ──────────────────────────────────────────────────────────────────

export default function PublicQuickGamePage({ params }: { params: Promise<{ code: string }> }) {
  const { code } = use(params);

  const { user: currentUser } = useCurrentUser();
  const [game, setGame] = useState<ActiveGame | null>(() =>
    typeof window !== 'undefined' ? getGameByCode(code) : null
  );
  const [snap, setSnap]               = useState<GameSnap | null>(null);
  const [joinName, setJoinName]       = useState('');
  const [showJoin, setShowJoin]       = useState(false);
  const [joined,   setJoined]         = useState(false);
  const [joinError, setJoinError]     = useState('');
  const [myRequest, setMyRequest]     = useState<JoinRequest | null>(null);
  const [roundOpen, setRoundOpen]     = useState<Record<number, boolean>>({});
  const [rankingEntries, setRankingEntries] = useState<RankingEntry[]>([]);
  const [shareUrl, setShareUrl]       = useState('');
  const [snapJoinName, setSnapJoinName] = useState('');
  const [snapJoinSent, setSnapJoinSent] = useState(false);
  const [snapJoinError, setSnapJoinError] = useState('');
  // Start in loading state when there's no local copy, so the first paint shows
  // a spinner (not the "not found" screen) while the Supabase fetch runs.
  const [sbLoading, setSbLoading] = useState(() =>
    typeof window !== 'undefined' ? getGameByCode(code) === null : false
  );

  useEffect(() => {
    // Keep full URL (with snap param) intact for QR re-sharing
    setShareUrl(window.location.href);

    // Decode snapshot from URL if present
    const sp = new URLSearchParams(window.location.search).get('s');
    if (sp) {
      try {
        const decoded = JSON.parse(decodeURIComponent(escape(atob(sp)))) as GameSnap;
        setSnap(decoded);
      } catch {}
    }
  }, [code]);

  // Fetch from Supabase when not in localStorage (cross-device share)
  useEffect(() => {
    const local = getGameByCode(code);
    if (local) return; // already have it
    setSbLoading(true);
    fetchGameByCode(code)
      .then(raw => {
        if (!raw) return;
        const g = raw as unknown as ActiveGame;
        saveGame(g); // cache locally for future loads
        setGame(g);
      })
      .finally(() => setSbLoading(false));
  }, [code]);

  useEffect(() => {
    const applyGame = (g: ActiveGame | null) => {
      setGame(g);
      if (g?.status === 'finished') {
        setRankingEntries(getRankingHistoryForGame(g.id));
        fetchRankingHistoryForGameFromSupabase(g.id).then(remote => {
          if (remote !== null) setRankingEntries(remote);
        }).catch(() => {});
      }
      if (currentUser && g) {
        // Check Supabase for status updates (creator may have approved/rejected from another device)
        syncMyJoinRequestFromSupabase(g.id, currentUser.id)
          .then(req => setMyRequest(req))
          .catch(() => setMyRequest(getMyJoinRequest(g.id, currentUser.id)));
      }
    };
    const load = () => {
      const g = getGameByCode(code);
      if (g) {
        applyGame(g);
      } else {
        // Not local — fall back to Supabase so the link stays live cross-device
        fetchGameByCode(code).then(raw => {
          if (!raw) return;
          const fresh = raw as unknown as ActiveGame;
          saveGame(fresh);
          applyGame(fresh);
        });
      }
    };
    load();
    const interval = setInterval(load, 5000);
    return () => clearInterval(interval);
  }, [code, currentUser?.id]);

  // ── Snapshot view (cross-device: game not in local storage) ──────────────────
  if (!game && snap) {
    const statusLabel: Record<string, string> = {
      created: 'Inscripciones abiertas', starting_soon: 'Por Empezar',
      live: 'En Vivo', finished: 'Finalizado',
    };
    const statusColor: Record<string, string> = {
      created: '#a78bfa', starting_soon: '#f5a623', live: '#d6ff00', finished: 'rgba(255,255,255,0.5)',
    };
    const pct = snap.mp > 0 ? Math.round((snap.p / snap.mp) * 100) : 0;
    return (
      <div style={{ minHeight: '100vh', background: '#0a0f1e', color: '#fff', fontFamily: 'var(--font-body)' }}>
        {/* Hero */}
        <div style={{ position: 'relative', background: '#0a0f1e', padding: 'clamp(80px,10vw,140px) clamp(20px,5vw,48px) clamp(32px,4vw,48px)', borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
          <div style={{ position: 'absolute', inset: 0, backgroundImage: 'url(/assets/court-bg.svg)', backgroundSize: 'cover', backgroundPosition: 'center', opacity: 0.12 }} />
          <div style={{ position: 'relative', maxWidth: 1200, margin: '0 auto' }}>
            <Link href="/quick-games" style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 11, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.5)', textDecoration: 'none', marginBottom: 24, fontWeight: 600 }}>
              ← Juegos Rápidos
            </Link>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 20 }}>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '5px 14px', borderRadius: 30, border: `1px solid ${statusColor[snap.st] ?? '#fff'}`, color: statusColor[snap.st] ?? '#fff', fontSize: 11, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', background: 'rgba(255,255,255,0.05)' }}>
                {snap.st === 'live' && <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#d6ff00', display: 'inline-block', animation: 'pulse 1.4s infinite' }} />}
                {statusLabel[snap.st] ?? snap.st}
              </span>
              <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)', letterSpacing: '0.1em', textTransform: 'uppercase', fontWeight: 600 }}>{code}</span>
            </div>
            <h1 style={{ fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: 'clamp(36px, 6vw, 80px)', lineHeight: 0.92, textTransform: 'uppercase', letterSpacing: '-0.025em', margin: '0 0 16px', color: '#fff' }}>
              {snap.n}
            </h1>
            <p style={{ fontSize: 14, color: 'rgba(255,255,255,0.6)', margin: 0 }}>
              {[snap.cl, snap.ci, snap.co].filter(Boolean).join(' · ')}
            </p>
          </div>
        </div>

        {/* Info bar */}
        <div style={{ background: 'rgba(255,255,255,0.04)', borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
          <div style={{ maxWidth: 1200, margin: '0 auto', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))', padding: '0 clamp(20px,5vw,48px)' }}>
            {[
              { label: 'Modalidad', value: snap.pt === 'individual' ? 'Individual' : 'Pareja Fija' },
              { label: 'Formato',   value: FORMAT_LABEL[snap.fmt] ?? snap.fmt },
              { label: 'Nivel',     value: snap.lv || 'Todos los niveles' },
              { label: 'Jugadores', value: `${snap.p} / ${snap.mp}` },
            ].map(({ label, value }) => (
              <div key={label} style={{ padding: '20px 16px', borderRight: '1px solid rgba(255,255,255,0.06)' }}>
                <div style={{ fontSize: 9, letterSpacing: '0.18em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.4)', fontWeight: 600, marginBottom: 6 }}>{label}</div>
                <div style={{ fontFamily: 'var(--font-display)', fontSize: 18, fontWeight: 600, color: '#fff' }}>{value}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Body */}
        <div style={{ maxWidth: 1200, margin: '0 auto', padding: '40px clamp(20px,5vw,48px)' }}>
          {/* Player fill bar */}
          <div style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 4, padding: 24, marginBottom: 24 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
              <span style={{ fontSize: 13, color: 'rgba(255,255,255,0.7)' }}>Jugadores confirmados</span>
              <span style={{ fontFamily: 'var(--font-display)', fontSize: 22, fontWeight: 700, color: '#fff' }}>{snap.p}<span style={{ fontSize: 14, color: 'rgba(255,255,255,0.4)' }}>/{snap.mp}</span></span>
            </div>
            <div style={{ height: 6, background: 'rgba(255,255,255,0.1)', borderRadius: 3, overflow: 'hidden' }}>
              <div style={{ height: '100%', width: `${pct}%`, background: 'var(--neon)', borderRadius: 3, transition: 'width 0.3s' }} />
            </div>
          </div>

          {/* Join section */}
          {snap.st === 'created' && snap.p < snap.mp ? (
            currentUser ? (
              snapJoinSent ? (
                <div style={{ background: 'rgba(214,255,0,0.08)', border: '1px solid rgba(214,255,0,0.3)', borderRadius: 4, padding: '20px 24px' }}>
                  <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--neon)', marginBottom: 6 }}>✓ Solicitud enviada</div>
                  <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.65)' }}>El organizador del juego recibirá tu solicitud y te confirmará la inscripción.</div>
                </div>
              ) : (
                <div style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.12)', borderRadius: 4, padding: '24px' }}>
                  <div style={{ fontSize: 13, fontWeight: 700, color: '#fff', marginBottom: 4 }}>Unirte a este juego</div>
                  <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.55)', marginBottom: 16 }}>Enviá una solicitud al organizador para confirmar tu lugar.</div>
                  <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
                    <input
                      value={snapJoinName}
                      onChange={e => setSnapJoinName(e.target.value)}
                      placeholder={currentUser.name || 'Tu nombre'}
                      style={{ flex: 1, minWidth: 160, padding: '10px 14px', background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.15)', color: '#fff', fontSize: 13, outline: 'none' }}
                    />
                    <button
                      onClick={() => {
                        const name = (snapJoinName.trim() || currentUser.name || '').trim();
                        if (!name) { setSnapJoinError('Ingresá tu nombre'); return; }
                        if (!snap.id) { setSnapJoinError('No se pudo identificar el juego. Pedile el link al organizador.'); return; }
                        submitJoinRequest(snap.id, 'game', currentUser.id, name, currentUser.email);
                        setSnapJoinSent(true);
                        setSnapJoinError('');
                      }}
                      style={{ padding: '10px 24px', background: 'var(--neon)', color: '#000', border: 'none', fontSize: 12, fontWeight: 700, cursor: 'pointer', letterSpacing: '0.08em', textTransform: 'uppercase', whiteSpace: 'nowrap' }}
                    >
                      Solicitar unirme
                    </button>
                  </div>
                  {snapJoinError && <div style={{ fontSize: 12, color: '#f87171', marginTop: 8 }}>{snapJoinError}</div>}
                </div>
              )
            ) : (
              <div style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.12)', borderRadius: 4, padding: '24px' }}>
                <div style={{ fontSize: 14, fontWeight: 700, color: '#fff', marginBottom: 8 }}>¿Querés unirte?</div>
                <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.6)', marginBottom: 20 }}>Iniciá sesión o creá una cuenta para solicitar unirte a este juego.</div>
                <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
                  <Link href={`/login?redirect=${encodeURIComponent(typeof window !== 'undefined' ? window.location.href : '')}`} className="btn btn-on-dark">Iniciar sesión →</Link>
                  <Link href="/signup" className="btn btn-outline-dark">Crear cuenta</Link>
                </div>
              </div>
            )
          ) : (
            <div style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 4, padding: '16px 20px', fontSize: 13, color: 'rgba(255,255,255,0.5)' }}>
              {snap.st === 'finished' ? 'Este juego ya finalizó.' : snap.p >= snap.mp ? 'Este juego está completo.' : 'No disponible para inscripción.'}
            </div>
          )}
        </div>
      </div>
    );
  }

  // ── Loading from Supabase (no local copy, no snapshot yet) ────────────────────
  if (!game && sbLoading) {
    return (
      <div style={{ minHeight: '100vh', background: '#0a0f1e', color: '#fff', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', fontFamily: 'var(--font-body)', gap: 16 }}>
        <div style={{ width: 36, height: 36, border: '3px solid rgba(255,255,255,0.1)', borderTopColor: 'var(--neon)', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
        <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.5)', letterSpacing: '0.1em', textTransform: 'uppercase' }}>Cargando juego…</div>
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  // ── Not found (no snapshot either) ───────────────────────────────────────────
  if (!game) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 32, fontFamily: 'var(--font-body)', textAlign: 'center' }}>
        <div style={{ fontFamily: 'var(--font-display)', fontSize: 20, fontWeight: 700, textTransform: 'uppercase', marginBottom: 12 }}>Juego no encontrado</div>
        <div style={{ fontSize: 13, color: 'var(--grey-500)', marginBottom: 8, maxWidth: 380 }}>
          El código <strong style={{ color: 'var(--black)' }}>{code}</strong> no corresponde a ningún juego.
        </div>
        <div style={{ fontSize: 12, color: 'var(--grey-400)', marginBottom: 28, maxWidth: 380, lineHeight: 1.6 }}>
          Verificá que el código sea correcto, o pedile el link actualizado al organizador.
        </div>
        <Link href="/" style={{ fontSize: 12, fontWeight: 600, color: 'var(--black)', textDecoration: 'none' }}>← Volver al inicio</Link>
      </div>
    );
  }

  const si          = STATUS_INFO[game.status] ?? STATUS_INFO.created;
  const isLive      = game.status === 'live';
  const isFinished  = game.status === 'finished';
  const isPending   = game.status === 'created' || game.status === 'starting_soon';
  const isFull      = game.players.length >= game.maxPlayers;

  const alreadyInGame  = currentUser != null && game.players.some(p => p.id === currentUser.id);
  const hasRequest     = myRequest !== null;
  const canJoin        = isPending && !isFull && !joined && !alreadyInGame && !hasRequest;
  const playerIsInGame = joined || alreadyInGame;
  const playerEntry    = currentUser != null ? game.players.find(p => p.id === currentUser.id) : null;
  const isCreator      = playerEntry?.isCreator === true;
  const canLeave       = isPending && playerIsInGame && !isCreator;

  function handleJoin() {
    if (!game) return;
    const name = currentUser ? currentUser.name : joinName.trim();
    const pid  = currentUser ? currentUser.id   : `guest-${Date.now()}`;
    if (!name) { setJoinError('Ingresá tu nombre para unirte.'); return; }
    const req = submitJoinRequest(game.id, 'game', pid, name, currentUser?.email);
    setMyRequest(req);
    setJoined(true);
    setShowJoin(false);
    setJoinName('');
    setJoinError('');
  }

  function handleLeave() {
    if (!game || !currentUser) return;
    const updated = { ...game, players: game.players.filter(p => p.id !== currentUser.id) };
    saveGame(updated);
    setGame(updated);
    setJoined(false);
  }

  function getName(pid: string) {
    return game!.players.find(p => p.id === pid)?.name ?? pid;
  }

  const currentRound  = game.rounds.find(r => r.num === game.currentRound) ?? null;
  const isTraditional = game.scoreConfig.type !== 'points';
  const pairStandings = game.pairType === 'parejas' ? computePairStandings(game) : [];
  const hasPairs      = pairStandings.length > 0;

  function ptsW(wins: number, draws: number) { return wins * 3 + draws; }
  function ptsL(losses: number) { return -losses; }

  // Table cell helpers
  const th: React.CSSProperties = {
    padding: '10px 10px', fontSize: 9, fontWeight: 700, letterSpacing: '0.12em',
    textTransform: 'uppercase', color: 'var(--grey-400)', textAlign: 'center', whiteSpace: 'nowrap',
  };
  const td: React.CSSProperties = { padding: '12px 10px', textAlign: 'center', fontSize: 13 };

  return (
    <div style={{ minHeight: '100vh', background: '#f5f5f5', fontFamily: 'var(--font-body)' }}>

      {/* ── Hero ── */}
      <div style={{ position: 'relative', background: '#0a0f1e', color: '#fff', padding: '72px 48px 48px', overflow: 'hidden' }}>
        <div style={{ position: 'absolute', inset: 0, backgroundImage: "url('/assets/court-bg.svg')", backgroundSize: 'cover', backgroundPosition: 'center', opacity: 0.5 }} />
        <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(180deg, rgba(0,0,0,0.45) 0%, rgba(0,0,0,0.75) 100%)' }} />
        <div style={{ position: 'relative', maxWidth: 1200, margin: '0 auto' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 10, letterSpacing: '0.16em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.5)', fontWeight: 600, marginBottom: 20 }}>
            <Link href="/quick-games" style={{ color: 'inherit', textDecoration: 'none' }}>JUEGOS RÁPIDOS</Link>
            <span style={{ color: 'rgba(255,255,255,0.3)' }}>/</span>
            <span style={{ color: 'rgba(255,255,255,0.8)' }}>{game.name.toUpperCase()}</span>
            <span style={{ marginLeft: 8, display: 'inline-flex', alignItems: 'center', gap: 5, padding: '3px 10px', background: si.bg, borderRadius: 2 }}>
              {si.dot && <span style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--neon)', display: 'inline-block', animation: 'pulse 2s infinite', flexShrink: 0 }} />}
              <span style={{ fontSize: 9, fontWeight: 700, color: si.color, letterSpacing: '0.12em' }}>{si.label.toUpperCase()}</span>
            </span>
          </div>
          <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 'clamp(36px, 5vw, 72px)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '-0.02em', margin: '0 0 12px', lineHeight: 1 }}>
            {game.name}
          </h1>
          <div style={{ fontSize: 14, color: 'rgba(255,255,255,0.6)' }}>
            {[game.club, game.city].filter(Boolean).join(' · ')}
          </div>
        </div>
      </div>

      {/* ── Info bar ── */}
      <div style={{ background: '#fff', borderBottom: '1px solid #e5e5e5' }}>
        <div style={{ maxWidth: 1200, margin: '0 auto', display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', borderLeft: '1px solid #e5e5e5' }}>
          {[
            { label: 'Modalidad', value: game.pairType === 'parejas' ? 'Pareja Fija' : 'Individual' },
            { label: 'Formato',   value: FORMAT_LABEL[game.format] ?? game.format },
            { label: 'Score',     value: scoreTypeLabel(game.scoreConfig) },
            { label: 'Jugadores', value: `${game.players.length}/${game.maxPlayers}` },
          ].map(item => (
            <div key={item.label} style={{ padding: '24px 28px', borderRight: '1px solid #e5e5e5' }}>
              <div style={{ fontFamily: 'var(--font-display)', fontSize: 22, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '-0.01em', marginBottom: 4 }}>{item.value}</div>
              <div style={{ fontSize: 9, letterSpacing: '0.18em', textTransform: 'uppercase', color: 'var(--grey-400)', fontWeight: 700 }}>{item.label}</div>
            </div>
          ))}
        </div>
      </div>

      {/* ── EN VIVO: courts currently being played ── */}
      {isLive && currentRound && (() => {
        const activeCourts = currentRound.courts.filter(c => c.status !== 'completed');
        if (activeCourts.length === 0) return null;
        return (
          <div style={{ background: '#16a34a', padding: '20px clamp(16px, 4vw, 48px)' }}>
            <div style={{ maxWidth: 1200, margin: '0 auto' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
                <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#fff', display: 'inline-block', animation: 'pulse 1.4s ease-in-out infinite' }} />
                <span style={{ fontSize: 11, fontWeight: 800, letterSpacing: '0.12em', textTransform: 'uppercase', color: '#fff' }}>En vivo ahora · Ronda {currentRound.num}</span>
                <span style={{ fontSize: 11, fontWeight: 700, color: 'rgba(255,255,255,0.75)', marginLeft: 4 }}>{activeCourts.length} {activeCourts.length === 1 ? 'cancha' : 'canchas'}</span>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(210px, 1fr))', gap: 10 }}>
                {activeCourts.map(court => (
                  <div key={court.courtNum} style={{ background: 'rgba(255,255,255,0.15)', borderRadius: 10, padding: '12px 14px', backdropFilter: 'blur(4px)' }}>
                    <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.75)', marginBottom: 8 }}>Cancha {court.courtNum}</div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                      <div style={{ fontSize: 13, fontWeight: 700, color: '#fff', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{court.pair1.map(pid => getName(pid)).join(' / ')}</div>
                      <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.5)', fontWeight: 600, textAlign: 'center' }}>vs</div>
                      <div style={{ fontSize: 13, fontWeight: 700, color: '#fff', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{court.pair2.map(pid => getName(pid)).join(' / ')}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        );
      })()}

      {/* ── Body: 2-column grid ── */}
      <div style={{ maxWidth: 1200, margin: '0 auto', padding: '40px 48px 80px', display: 'grid', gridTemplateColumns: '1fr 320px', gap: 24, alignItems: 'start' }}>

        {/* ── Left column ── */}
        <div>

          {/* Organizer bar */}
          {isCreator && (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 20px', background: 'var(--black)', color: '#fff', marginBottom: 24 }}>
              <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.6)' }}>Sos el organizador de este juego</span>
              <Link href={`/dashboard/player/quick-game/${game.id}`}
                style={{ padding: '8px 20px', background: 'var(--neon)', color: 'var(--black)', fontSize: 11, fontWeight: 800, textDecoration: 'none', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                Gestionar →
              </Link>
            </div>
          )}

          {/* Request feedback banners */}
          {myRequest?.status === 'approved' && (
            <div style={{ background: 'var(--turf-green)', color: '#fff', padding: '14px 20px', marginBottom: 16, display: 'flex', alignItems: 'center', gap: 10 }}>
              <span style={{ fontSize: 18 }}>✓</span>
              <span style={{ fontWeight: 600, fontSize: 13 }}>¡Solicitud aprobada! Estás en el juego.</span>
            </div>
          )}
          {myRequest?.status === 'rejected' && (
            <div style={{ background: '#fef2f2', border: '1px solid #fecaca', color: '#dc2626', padding: '14px 20px', marginBottom: 16 }}>
              <span style={{ fontWeight: 600, fontSize: 13 }}>Tu solicitud fue rechazada por el organizador.</span>
            </div>
          )}
          {(joined || myRequest?.status === 'pending') && myRequest?.status !== 'approved' && myRequest?.status !== 'rejected' && (
            <div style={{ background: '#fffbeb', border: '1px solid #fcd34d', color: '#92400e', padding: '14px 20px', marginBottom: 16 }}>
              <span style={{ fontWeight: 600, fontSize: 13 }}>⏳ Solicitud enviada — esperando aprobación del organizador.</span>
            </div>
          )}

          {/* Pending: player list */}
          {isPending && (
            <div style={{ marginBottom: 32 }}>
              <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 28, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '-0.01em', margin: '0 0 16px' }}>
                JUGADORES <span style={{ fontSize: 16, color: 'var(--grey-400)', fontWeight: 400 }}>{game.players.length}/{game.maxPlayers}</span>
              </h2>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: 2 }}>
                {game.players.map(p => (
                  <div key={p.id} style={{ padding: '12px 16px', background: '#fff', border: '1px solid #e8e8e8', display: 'flex', alignItems: 'center', gap: 10 }}>
                    <div style={{ width: 28, height: 28, borderRadius: '50%', background: p.isCreator ? 'var(--black)' : 'var(--grey-100)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, fontWeight: 700, color: p.isCreator ? '#fff' : 'var(--grey-500)', flexShrink: 0 }}>
                      {p.name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2)}
                    </div>
                    <div>
                      <div style={{ fontSize: 13, fontWeight: p.isCreator ? 700 : 400 }}>{p.name}</div>
                      {p.isCreator && <div style={{ fontSize: 9, color: 'var(--grey-400)', letterSpacing: '0.06em', textTransform: 'uppercase' }}>ORGANIZADOR</div>}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ── PARTIDOS ── */}
          {(isLive || isFinished) && (
            <div style={{ marginBottom: 32 }}>
              <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 28, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '-0.01em', margin: '0 0 16px' }}>PARTIDOS</h2>

              {/* Live: current round */}
              {isLive && currentRound && currentRound.courts.map(court => {
                const isDone = court.status === 'completed';
                return (
                  <div key={court.courtNum} style={{ display: 'grid', gridTemplateColumns: '90px 1fr auto 90px', alignItems: 'center', marginBottom: 2, background: isDone ? '#fff' : 'var(--black)', border: isDone ? '1px solid #e8e8e8' : 'none' }}>
                    <div style={{ padding: '14px 16px', fontSize: 10, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: isDone ? 'var(--grey-400)' : 'rgba(255,255,255,0.4)' }}>
                      COURT {court.courtNum}
                    </div>
                    <div style={{ padding: '14px 0', display: 'flex', gap: 16, alignItems: 'center' }}>
                      <div>{court.pair1.map(pid => <div key={pid} style={{ fontSize: 13, fontWeight: 600, color: isDone ? 'var(--black)' : '#fff', lineHeight: 1.4 }}>{getName(pid)}</div>)}</div>
                      {isDone && (
                        <div style={{ fontFamily: 'var(--font-display)', fontSize: 22, fontWeight: 700 }}>
                          <span>{court.pair1Score}</span>
                          <span style={{ color: 'var(--grey-300)', margin: '0 6px', fontSize: 16 }}>-</span>
                          <span>{court.pair2Score}</span>
                        </div>
                      )}
                      <div>{court.pair2.map(pid => <div key={pid} style={{ fontSize: 13, fontWeight: 600, color: isDone ? 'var(--black)' : '#fff', lineHeight: 1.4 }}>{getName(pid)}</div>)}</div>
                    </div>
                    <div />
                    <div style={{ padding: '14px 16px', textAlign: 'right' }}>
                      {isDone
                        ? <span style={{ fontSize: 9, fontWeight: 700, color: 'var(--grey-400)', textTransform: 'uppercase' }}>Finalizado</span>
                        : <span style={{ fontSize: 9, fontWeight: 700, color: 'var(--neon)', background: 'rgba(214,255,0,0.15)', padding: '4px 8px' }}>● LIVE</span>
                      }
                    </div>
                  </div>
                );
              })}

              {/* Live: completed rounds (non-collapsible) */}
              {isLive && game.rounds.filter(r => r.status === 'completed' && r.num !== game.currentRound).map(round => (
                <div key={round.num} style={{ marginBottom: 16, marginTop: 8 }}>
                  <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--grey-500)', marginBottom: 6, paddingLeft: 16 }}>RONDA {round.num}</div>
                  {round.courts.map(court => (
                    <div key={court.courtNum} style={{ display: 'grid', gridTemplateColumns: '90px 1fr 90px', alignItems: 'center', background: '#fff', border: '1px solid #e8e8e8', marginBottom: 2 }}>
                      <div style={{ padding: '12px 16px', fontSize: 10, fontWeight: 700, color: 'var(--grey-400)', letterSpacing: '0.08em' }}>COURT {court.courtNum}</div>
                      <div style={{ padding: '12px 0', display: 'flex', gap: 16, alignItems: 'center' }}>
                        <div>{court.pair1.map(pid => <div key={pid} style={{ fontSize: 12, fontWeight: 600 }}>{getName(pid)}</div>)}</div>
                        {court.pair1Score !== null && (
                          <span style={{ fontFamily: 'var(--font-display)', fontSize: 20, fontWeight: 700 }}>{court.pair1Score} – {court.pair2Score}</span>
                        )}
                        <div>{court.pair2.map(pid => <div key={pid} style={{ fontSize: 12, fontWeight: 600 }}>{getName(pid)}</div>)}</div>
                      </div>
                      <div style={{ padding: '12px 16px', textAlign: 'right', fontSize: 9, fontWeight: 700, color: 'var(--grey-400)', textTransform: 'uppercase' }}>Finalizado</div>
                    </div>
                  ))}
                </div>
              ))}

              {/* Finished: collapsible rounds */}
              {isFinished && game.rounds.map(round => {
                const isOpen = !!roundOpen[round.num];
                return (
                  <div key={round.num} style={{ marginBottom: 2 }}>
                    <button
                      onClick={() => setRoundOpen(prev => ({ ...prev, [round.num]: !prev[round.num] }))}
                      style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 16px', background: '#fff', border: '1px solid #e8e8e8', cursor: 'pointer', textAlign: 'left' }}>
                      <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--grey-500)' }}>
                        RONDA {round.num}
                        <span style={{ fontWeight: 400, color: 'var(--grey-400)', marginLeft: 8 }}>
                          ({round.courts.length} {round.courts.length === 1 ? 'partido' : 'partidos'})
                        </span>
                      </span>
                      <span style={{ fontSize: 11, color: 'var(--grey-400)' }}>{isOpen ? '▲' : '▼'}</span>
                    </button>
                    {isOpen && round.courts.map(court => (
                      <MatchSetResult
                        key={court.courtNum}
                        header={`Cancha ${court.courtNum}`}
                        pair1Label={court.pair1.map(pid => getName(pid)).join(' / ')}
                        pair2Label={court.pair2.map(pid => getName(pid)).join(' / ')}
                        sets={court.sets}
                        pair1Score={court.pair1Score}
                        pair2Score={court.pair2Score}
                        style={{ marginBottom: 2 }}
                      />
                    ))}
                  </div>
                );
              })}
            </div>
          )}

          {/* ── CLASIFICACIÓN ── */}
          {(isLive || isFinished) && game.standings.length > 0 && (
            <div style={{ marginBottom: 32 }}>
              <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 28, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '-0.01em', margin: '0 0 16px' }}>
                {isFinished ? 'CLASIFICACIÓN FINAL' : 'CLASIFICACIÓN'}
              </h2>
              <div style={{ background: '#fff', border: '1px solid #e8e8e8', overflow: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 560 }}>
                  <thead>
                    <tr style={{ borderBottom: '2px solid #e8e8e8', background: '#fafafa' }}>
                      <th style={{ ...th, width: 44, textAlign: 'center' }}>POS</th>
                      <th style={{ ...th, textAlign: 'left', paddingLeft: 16 }}>{hasPairs ? 'EQUIPO' : 'JUGADOR'}</th>
                      <th style={th}>PJ</th>
                      <th style={th}>W</th>
                      <th style={th}>L</th>
                      <th style={th}>T</th>
                      <th style={{ ...th, color: '#166534' }}>PTS W</th>
                      <th style={{ ...th, color: '#991b1b' }}>PTS L</th>
                      <th style={th}>+/-</th>
                    </tr>
                  </thead>
                  <tbody>
                    {hasPairs
                      ? pairStandings.map(({ pair, wins, losses, draws, played }, i) => {
                          const pw = ptsW(wins, draws);
                          const pl = ptsL(losses);
                          const net = pw + pl;
                          return (
                            <tr key={pair.pairIndex} style={{ borderBottom: '1px solid #f0f0f0' }}>
                              <td style={{ ...td }}><PosBadge i={i} /></td>
                              <td style={{ ...td, textAlign: 'left', padding: '12px 16px' }}>
                                <div style={{ fontSize: 13, fontWeight: 600 }}>{pair.player1Name}</div>
                                <div style={{ fontSize: 11, color: 'var(--grey-400)' }}>{pair.player2Name}</div>
                              </td>
                              <td style={{ ...td, color: 'var(--grey-500)' }}>{played}</td>
                              <td style={{ ...td, fontWeight: 700, color: 'var(--turf-green)' }}>{wins}</td>
                              <td style={{ ...td, fontWeight: 700, color: '#ee0005' }}>{losses}</td>
                              <td style={{ ...td, color: 'var(--grey-500)' }}>{draws}</td>
                              <td style={{ ...td, fontFamily: 'var(--font-display)', fontWeight: 700, color: '#166534' }}>{pw > 0 ? `+${pw}` : pw}</td>
                              <td style={{ ...td, fontFamily: 'var(--font-display)', fontWeight: 700, color: '#991b1b' }}>{pl}</td>
                              <td style={{ ...td, fontFamily: 'var(--font-display)', fontWeight: 700, color: net >= 0 ? 'var(--turf-green)' : '#ee0005' }}>
                                {net > 0 ? `+${net}` : net}
                              </td>
                            </tr>
                          );
                        })
                      : game.standings.map((s, i) => {
                          const isMe = currentUser != null && s.playerId === currentUser.id;
                          const pw   = ptsW(s.wins, s.draws);
                          const pl   = ptsL(s.losses);
                          const net  = pw + pl;
                          return (
                            <tr key={s.playerId} style={{ borderBottom: '1px solid #f0f0f0', background: isMe ? 'rgba(214,255,0,0.06)' : '#fff' }}>
                              <td style={{ ...td }}><PosBadge i={i} /></td>
                              <td style={{ ...td, textAlign: 'left', padding: '12px 16px' }}>
                                <span style={{ fontSize: 13, fontWeight: isMe ? 700 : 500 }}>{s.playerName}</span>
                                {isMe && <span style={{ marginLeft: 8, fontSize: 9, background: 'var(--neon)', color: 'var(--black)', padding: '2px 6px', fontWeight: 700 }}>TÚ</span>}
                              </td>
                              <td style={{ ...td, color: 'var(--grey-500)' }}>{s.played}</td>
                              <td style={{ ...td, fontWeight: 700, color: 'var(--turf-green)' }}>{s.wins}</td>
                              <td style={{ ...td, fontWeight: 700, color: '#ee0005' }}>{s.losses}</td>
                              <td style={{ ...td, color: 'var(--grey-500)' }}>{s.draws}</td>
                              <td style={{ ...td, fontFamily: 'var(--font-display)', fontWeight: 700, color: '#166534' }}>{pw > 0 ? `+${pw}` : pw}</td>
                              <td style={{ ...td, fontFamily: 'var(--font-display)', fontWeight: 700, color: '#991b1b' }}>{pl}</td>
                              <td style={{ ...td, fontFamily: 'var(--font-display)', fontWeight: 700, color: net >= 0 ? 'var(--turf-green)' : '#ee0005' }}>
                                {net > 0 ? `+${net}` : net}
                              </td>
                            </tr>
                          );
                        })
                    }
                  </tbody>
                </table>
              </div>
              {!isTraditional && (
                <div style={{ fontSize: 11, color: 'var(--grey-400)', marginTop: 8, fontStyle: 'italic' }}>
                  * PTS W y PTS L calculados en base al score por puntos del juego.
                </div>
              )}
            </div>
          )}

          {/* ── AJUSTES DE RANKING ── */}
          {isFinished && rankingEntries.length > 0 && (
            <div style={{ marginBottom: 32 }}>
              <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 20, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '-0.01em', margin: '0 0 16px' }}>
                AJUSTES DE RANKING
              </h2>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: 2 }}>
                {rankingEntries.map(entry => {
                  const ri = RESULT_INFO[entry.result] ?? RESULT_INFO.loss;
                  return (
                    <div key={entry.id} style={{ background: ri.bg, padding: '18px 16px', border: '1px solid rgba(0,0,0,0.05)' }}>
                      <div style={{ fontSize: 12, fontWeight: 600, color: ri.textColor, marginBottom: 6, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {entry.playerName}
                      </div>
                      <div style={{ fontFamily: 'var(--font-display)', fontSize: 36, fontWeight: 700, color: ri.textColor, lineHeight: 1 }}>
                        {entry.delta > 0 ? '+' : ''}{entry.delta}
                      </div>
                      <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: '0.12em', color: ri.textColor, opacity: 0.75, textTransform: 'uppercase', marginTop: 6 }}>
                        {ri.label}
                      </div>
                      <div style={{ fontSize: 11, color: ri.textColor, opacity: 0.55, marginTop: 4 }}>
                        Total: {entry.newTotal} pts
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

        </div>

        {/* ── Right sidebar ── */}
        <div style={{ position: 'sticky', top: 24 }}>

          {/* QR block */}
          <div style={{ background: 'var(--black)', padding: '28px', textAlign: 'center', marginBottom: 2 }}>
            <QRCodeSVG
              value={shareUrl || `https://padelmgt.com/quick-game/${code}`}
              size={120}
              fgColor="#ffffff"
              bgColor="transparent"
            />
            <div style={{ fontFamily: 'var(--font-display)', fontSize: 14, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em', color: '#fff', marginTop: 16, marginBottom: 6 }}>
              ÚNETE CON QR
            </div>
            <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.5)', lineHeight: 1.5 }}>
              Escanea para unirte a este juego desde tu móvil
            </div>
          </div>

          {/* Join / status block */}
          {isPending && (
            <div style={{ background: '#fff', border: '1px solid #e8e8e8', padding: '20px', marginBottom: 2 }}>
              {isFull ? (
                <>
                  <div style={{ fontFamily: 'var(--font-display)', fontSize: 15, fontWeight: 700, textTransform: 'uppercase', color: '#ee0005', marginBottom: 6 }}>JUEGO COMPLETO</div>
                  <div style={{ fontSize: 12, color: 'var(--grey-400)', marginBottom: 12 }}>No hay lugares disponibles.</div>
                  <button disabled style={{ width: '100%', padding: '12px', background: 'var(--grey-100)', color: 'var(--grey-400)', border: 'none', fontSize: 12, fontWeight: 700, cursor: 'not-allowed', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                    Lista de Espera
                  </button>
                </>
              ) : playerIsInGame || alreadyInGame ? (
                <>
                  <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--turf-green)', marginBottom: 10 }}>✓ Ya estás en este juego</div>
                  {canLeave && (
                    <button onClick={handleLeave} style={{ width: '100%', padding: '10px', background: '#fff8f8', border: '1px solid #fecaca', color: '#c53030', cursor: 'pointer', fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                      Salirse del juego
                    </button>
                  )}
                </>
              ) : myRequest?.status === 'pending' ? (
                <div style={{ fontSize: 12, fontWeight: 600, color: '#92400e', padding: '8px 0' }}>
                  ⏳ Solicitud pendiente de aprobación
                </div>
              ) : currentUser ? (
                <button onClick={handleJoin} style={{ width: '100%', padding: '14px', background: 'var(--turf-green)', color: '#fff', border: 'none', cursor: 'pointer', fontSize: 13, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                  Unirme — {currentUser.name.split(' ')[0]} →
                </button>
              ) : showJoin ? (
                <div>
                  <input
                    type="text" value={joinName} autoFocus
                    onChange={e => { setJoinName(e.target.value); setJoinError(''); }}
                    onKeyDown={e => e.key === 'Enter' && handleJoin()}
                    placeholder="Tu nombre completo"
                    style={{ display: 'block', width: '100%', padding: '10px 12px', border: '1px solid var(--grey-200)', fontSize: 13, outline: 'none', marginBottom: 8, boxSizing: 'border-box' }}
                  />
                  {joinError && <div style={{ fontSize: 11, color: '#e53e3e', marginBottom: 8 }}>{joinError}</div>}
                  <div style={{ display: 'flex', gap: 6 }}>
                    <button onClick={handleJoin} style={{ flex: 1, padding: '10px', background: 'var(--black)', color: '#fff', border: 'none', cursor: 'pointer', fontSize: 12, fontWeight: 700 }}>Confirmar</button>
                    <button onClick={() => { setShowJoin(false); setJoinError(''); }} style={{ padding: '10px 12px', background: 'var(--grey-100)', border: 'none', cursor: 'pointer', fontSize: 12 }}>✕</button>
                  </div>
                </div>
              ) : (
                <button onClick={() => setShowJoin(true)} style={{ width: '100%', padding: '14px', background: 'var(--turf-green)', color: '#fff', border: 'none', cursor: 'pointer', fontSize: 13, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                  Unirme a este juego →
                </button>
              )}
            </div>
          )}

          {/* DETALLES */}
          <div style={{ background: '#fff', border: '1px solid #e8e8e8', padding: '20px' }}>
            <div style={{ fontSize: 9, letterSpacing: '0.18em', textTransform: 'uppercase', color: 'var(--grey-400)', fontWeight: 700, marginBottom: 16 }}>DETALLES</div>
            {[
              { label: 'Fecha',   value: game.date },
              { label: 'Hora',    value: game.time },
              { label: 'Club',    value: game.club },
              { label: 'Ciudad',  value: game.city },
              { label: 'Código',  value: game.code },
              { label: 'Canchas', value: `${game.courts} cancha${game.courts !== 1 ? 's' : ''}` },
            ].filter(r => r.value).map(row => (
              <div key={row.label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', padding: '8px 0', borderBottom: '1px solid #f5f5f5', fontSize: 12 }}>
                <span style={{ color: 'var(--grey-400)', fontWeight: 600, flexShrink: 0 }}>{row.label}</span>
                <span style={{ color: 'var(--black)', fontWeight: 500, textAlign: 'right', maxWidth: '60%', wordBreak: 'break-word', marginLeft: 8 }}>{row.value}</span>
              </div>
            ))}
          </div>

        </div>
      </div>
    </div>
  );
}
