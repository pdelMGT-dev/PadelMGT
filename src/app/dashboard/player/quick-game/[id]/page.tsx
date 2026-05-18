'use client';

import Link from 'next/link';
import { use, useEffect, useState } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import {
  getGame,
  saveGame,
  updateMatchScore as engineUpdateScore,
  startGame as engineStartGame,
  startNextRound as engineStartNextRound,
  isGameFinished,
} from '@/lib/game-store';
import { isRoundComplete, calculateStandings } from '@/lib/game-engine';
import type { ActiveGame, GameStatus, ScoreConfig } from '@/lib/game-engine';

type JoinRequest = {
  id: string;
  gameId: string;
  playerId: string;
  playerName: string;
  status: 'pending' | 'approved' | 'rejected';
  createdAt: string;
};

function loadJoinRequests(gameId: string): JoinRequest[] {
  try {
    const all: JoinRequest[] = JSON.parse(localStorage.getItem('padelmgt_join_requests') || '[]');
    return all.filter(r => r.gameId === gameId);
  } catch { return []; }
}

function updateJoinRequest(id: string, status: 'approved' | 'rejected') {
  try {
    const all: JoinRequest[] = JSON.parse(localStorage.getItem('padelmgt_join_requests') || '[]');
    const updated = all.map(r => r.id === id ? { ...r, status } : r);
    localStorage.setItem('padelmgt_join_requests', JSON.stringify(updated));
  } catch {}
}

// ── Helpers ────────────────────────────────────────────────────────────────────

const STATUS_INFO: Record<GameStatus, { label: string; color: string }> = {
  created:       { label: 'Creado',      color: '#7c3aed'           },
  starting_soon: { label: 'Por Empezar', color: '#f5a623'           },
  live:          { label: 'En Vivo',     color: 'var(--turf-green)' },
  finished:      { label: 'Finalizado',  color: 'var(--grey-400)'   },
};

function scoreConfigLabel(cfg: ScoreConfig): string {
  if (cfg.type === 'points') return `Por Puntos · ${cfg.target} pts`;
  return `Tradicional · ${cfg.setsPerMatch ?? 3} sets · ${cfg.gamesPerSet ?? 6} games`;
}

function formatLabel(fmt: string): string {
  const map: Record<string, string> = {
    americano: 'Americano', mexicano: 'Mexicano',
    round_robin: 'Round Robin', team_league: 'Team League',
    knockout: 'Eliminatorio', world_cup: 'World Cup',
  };
  return map[fmt] ?? fmt;
}

// ── Styles ─────────────────────────────────────────────────────────────────────

const inp: React.CSSProperties = {
  width: '100%', padding: '10px 12px', fontSize: 13,
  border: '1px solid var(--grey-200)', background: '#fff',
  color: 'var(--black)', outline: 'none', fontFamily: 'var(--font-body)',
  boxSizing: 'border-box',
};

const lbl: React.CSSProperties = {
  display: 'block', fontSize: 10, fontWeight: 700, letterSpacing: '0.12em',
  textTransform: 'uppercase', color: 'var(--grey-400)', marginBottom: 6,
};

const secTitle: React.CSSProperties = {
  fontSize: 9, letterSpacing: '0.18em', textTransform: 'uppercase', fontWeight: 700,
  color: 'var(--grey-400)', marginBottom: 16, paddingBottom: 10,
  borderBottom: '1px solid var(--grey-100)',
};

// ── Component ──────────────────────────────────────────────────────────────────

export default function QuickGameDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);

  const [game, setGame] = useState<ActiveGame | null>(() => {
    if (typeof window === 'undefined') return null;
    return getGame(id);
  });

  useEffect(() => {
    if (!game) setGame(getGame(id));
  }, [id, game]);

  const [scoreInputs, setScoreInputs] = useState<Record<string, { p1: string; p2: string }>>({});
  const [toast, setToast] = useState<string | null>(null);
  const [shareUrl, setShareUrl] = useState('');
  const [copied, setCopied] = useState(false);
  const [showQR, setShowQR] = useState(false);

  // User detection
  const [currentUser, setCurrentUser] = useState<{ id: string; name: string; role: string } | null>(null);
  useEffect(() => {
    try { const u = localStorage.getItem('padelmgt_user'); if (u) setCurrentUser(JSON.parse(u)); } catch {}
  }, []);

  // Inline edit state
  const [editOpen, setEditOpen] = useState(false);
  const [editName, setEditName] = useState('');
  const [editDate, setEditDate] = useState('');
  const [editTime, setEditTime] = useState('');
  const [editClub, setEditClub] = useState('');
  const [editCity, setEditCity] = useState('');
  const [editIsCustomLoc, setEditIsCustomLoc] = useState(false);

  // Add player state
  const [addPlayerName, setAddPlayerName] = useState('');

  // Join requests
  const [joinRequests, setJoinRequests] = useState<JoinRequest[]>([]);

  function refreshRequests() {
    if (game) setJoinRequests(loadJoinRequests(game.id));
  }

  useEffect(() => {
    refreshRequests();
    const interval = setInterval(refreshRequests, 4000);
    return () => clearInterval(interval);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [game?.id]);

  useEffect(() => {
    if (game?.code) setShareUrl(`${window.location.origin}/quick-game/${game.code}`);
  }, [game?.code]);

  // Initialize edit fields when game loads
  useEffect(() => {
    if (!game) return;
    setEditName(game.name);
    setEditDate(game.date);
    setEditTime(game.time);
    setEditClub(game.club);
    setEditCity(game.city);
  }, [game?.id]);

  if (!game) {
    return (
      <div style={{ padding: '40px', textAlign: 'center' }}>
        <p style={{ color: 'var(--grey-400)', marginBottom: 16 }}>Juego no encontrado.</p>
        <Link href="/dashboard/player/quick-game" style={{ fontSize: 13, color: 'var(--black)', fontWeight: 600 }}>← Mis Juegos Rápidos</Link>
      </div>
    );
  }

  // ── Derived state ──────────────────────────────────────────────────────────

  const si = STATUS_INFO[game.status];
  const isLive     = game.status === 'live';
  const isFinished = game.status === 'finished';
  const isPending  = game.status === 'created' || game.status === 'starting_soon';
  const canStart   = isPending && game.players.length >= 4 && game.players.length === game.maxPlayers;
  const emptySlots = Math.max(0, game.maxPlayers - game.players.length);

  const activeRound = game.rounds.find(r => r.status === 'active') ?? null;
  const doneRounds  = game.rounds.filter(r => r.status === 'completed');

  const activeRoundComplete = activeRound ? isRoundComplete(activeRound) : false;
  const gameComplete        = isGameFinished(game);

  const hasMoreRounds = !gameComplete && activeRoundComplete && (
    game.format === 'mexicano' ||                          // mexicano generates on demand
    game.rounds.some(r => r.num > (activeRound?.num ?? 0) && r.status === 'pending')
  );

  // ── Actions ────────────────────────────────────────────────────────────────

  function showToast(msg: string) {
    setToast(msg);
    setTimeout(() => setToast(null), 3500);
  }

  function getName(pid: string) {
    return game!.players.find(p => p.id === pid)?.name ?? pid;
  }

  function handleStartGame() {
    const started = engineStartGame(game!);
    saveGame(started);
    setGame(started);
    showToast('¡Juego iniciado!');
  }

  function handleSaveEdits() {
    if (!game) return;
    const updated: ActiveGame = {
      ...game,
      name: editName.trim() || game.name,
      date: editDate || game.date,
      time: editTime || game.time,
      club: editClub.trim() || game.club,
      city: editCity.trim() || game.city,
    };
    saveGame(updated);
    setGame(updated);
    setEditOpen(false);
    showToast('Juego actualizado.');
  }

  function handleAddPlayer() {
    if (!addPlayerName.trim() || !game || game.players.length >= game.maxPlayers) return;
    const newP = { id: `manual-${Date.now()}`, name: addPlayerName.trim(), ranking: 0, isCreator: false };
    const updated = { ...game, players: [...game.players, newP] };
    saveGame(updated);
    setGame(updated);
    setAddPlayerName('');
    showToast(`${newP.name} agregado.`);
  }

  function handleRemovePlayer(pid: string) {
    if (!game) return;
    const updated = { ...game, players: game.players.filter(p => p.id !== pid) };
    saveGame(updated);
    setGame(updated);
    showToast('Jugador eliminado.');
  }

  function handleTrimSlots() {
    if (!game) return;
    const updated = { ...game, maxPlayers: game.players.length };
    saveGame(updated);
    setGame(updated);
    showToast('Spots ajustados.');
  }

  function handleApproveRequest(req: JoinRequest) {
    if (!game || game.players.length >= game.maxPlayers) return;
    const newPlayer = { id: req.playerId, name: req.playerName, ranking: 0, isCreator: false };
    const updated = { ...game, players: [...game.players, newPlayer] };
    saveGame(updated);
    setGame(updated);
    updateJoinRequest(req.id, 'approved');
    setJoinRequests(prev => prev.map(r => r.id === req.id ? { ...r, status: 'approved' } : r));
    showToast(`${req.playerName} aprobado.`);
  }

  function handleRejectRequest(req: JoinRequest) {
    updateJoinRequest(req.id, 'rejected');
    setJoinRequests(prev => prev.map(r => r.id === req.id ? { ...r, status: 'rejected' } : r));
    showToast(`Solicitud de ${req.playerName} rechazada.`);
  }

  function handleRegister(roundNum: number, courtNum: number) {
    const key = `${roundNum}-${courtNum}`;
    const raw = scoreInputs[key] ?? { p1: '', p2: '' };
    const p1 = Math.max(0, parseInt(raw.p1 || '0', 10));
    const p2 = Math.max(0, parseInt(raw.p2 || '0', 10));

    const updated = engineUpdateScore(game!, roundNum, courtNum, p1, p2);
    saveGame(updated);
    setGame(updated);
    setScoreInputs(prev => { const n = { ...prev }; delete n[key]; return n; });

    const round = updated.rounds.find(r => r.num === roundNum);
    if (round && isRoundComplete(round)) {
      if (isGameFinished(updated)) showToast('¡Juego finalizado! Ver clasificación final.');
      else showToast('Ronda completa — podés iniciar la siguiente.');
    }
  }

  function handleNextRound() {
    const next = engineStartNextRound(game!);
    saveGame(next);
    setGame(next);
    setScoreInputs({});
    showToast(`Ronda ${next.currentRound} iniciada`);
  }

  const isPointsMode = game.scoreConfig.type === 'points';
  const ptTarget = isPointsMode ? (game.scoreConfig as { type: 'points'; target: number }).target : null;

  function handleP1Change(key: string, val: string) {
    setScoreInputs(prev => {
      const current = prev[key] ?? { p1: '', p2: '' };
      if (isPointsMode && ptTarget !== null) {
        const n = parseInt(val, 10);
        if (!isNaN(n) && n >= 0 && n <= ptTarget) {
          return { ...prev, [key]: { p1: val, p2: String(ptTarget - n) } };
        }
      }
      return { ...prev, [key]: { ...current, p1: val } };
    });
  }

  function handleP2Change(key: string, val: string) {
    setScoreInputs(prev => {
      const current = prev[key] ?? { p1: '', p2: '' };
      if (isPointsMode && ptTarget !== null) {
        const n = parseInt(val, 10);
        if (!isNaN(n) && n >= 0 && n <= ptTarget) {
          return { ...prev, [key]: { p1: String(ptTarget - n), p2: val } };
        }
      }
      return { ...prev, [key]: { ...current, p2: val } };
    });
  }

  function handleCopy() {
    if (!shareUrl) return;
    navigator.clipboard.writeText(shareUrl).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  // Post-game editing state
  const [editResultsOpen, setEditResultsOpen] = useState(false);
  const [editScores, setEditScores] = useState<Record<string, { p1: string; p2: string }>>({});

  function handleEditScoreChange(roundNum: number, courtNum: number, team: 'p1' | 'p2', val: string) {
    const key = `${roundNum}-${courtNum}`;
    setEditScores(prev => {
      const cur = prev[key] ?? { p1: '', p2: '' };
      if (isPointsMode && ptTarget !== null) {
        const n = parseInt(val, 10);
        if (!isNaN(n) && n >= 0 && n <= ptTarget) {
          return { ...prev, [key]: team === 'p1' ? { p1: val, p2: String(ptTarget - n) } : { p1: String(ptTarget - n), p2: val } };
        }
      }
      return { ...prev, [key]: { ...cur, [team]: val } };
    });
  }

  function handleSaveEditedResults() {
    if (!game) return;
    let updated = { ...game, rounds: game.rounds.map(r => ({ ...r, courts: r.courts.map(c => ({ ...c })) })) };
    for (const [key, scores] of Object.entries(editScores)) {
      const [rStr, cStr] = key.split('-');
      const rNum = parseInt(rStr, 10);
      const cNum = parseInt(cStr, 10);
      const p1 = parseInt(scores.p1, 10);
      const p2 = parseInt(scores.p2, 10);
      if (isNaN(p1) || isNaN(p2)) continue;
      const round = updated.rounds.find(r => r.num === rNum);
      if (!round) continue;
      const court = round.courts.find(c => c.courtNum === cNum);
      if (!court) continue;
      court.pair1Score = p1;
      court.pair2Score = p2;
      court.status = 'completed';
    }
    updated.standings = calculateStandings(updated);
    saveGame(updated);
    setGame(updated);
    setEditScores({});
    setEditResultsOpen(false);
    showToast('Resultados actualizados.');
  }

  // suppress unused warning — currentUser may be used for future gating
  void currentUser;

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <div style={{ padding: '40px 40px 80px', maxWidth: 960 }}>

      {/* Toast */}
      {toast && (
        <div style={{ position: 'fixed', top: 24, right: 24, zIndex: 9999, background: 'var(--black)', color: '#fff', padding: '14px 22px', fontSize: 13, fontWeight: 600, boxShadow: '0 4px 20px rgba(0,0,0,0.25)', maxWidth: 360 }}>
          {toast}
        </div>
      )}

      {/* Finished banner */}
      {isFinished && (
        <div style={{ background: 'var(--turf-green)', color: '#fff', padding: '14px 24px', marginBottom: 16, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{ fontSize: 18 }}>✓</span>
            <span style={{ fontFamily: 'var(--font-display)', fontSize: 14, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Juego finalizado</span>
          </div>
          <button
            onClick={() => { setEditResultsOpen(v => !v); setEditScores({}); }}
            style={{ padding: '6px 14px', background: 'rgba(255,255,255,0.15)', border: '1px solid rgba(255,255,255,0.3)', color: '#fff', cursor: 'pointer', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em' }}
          >
            {editResultsOpen ? 'Cancelar edición' : 'Editar resultados'}
          </button>
        </div>
      )}

      {/* Post-game score editing (creator only, when finished) */}
      {isFinished && editResultsOpen && game.rounds.length > 0 && (
        <div style={{ background: '#fff', border: '1px solid var(--grey-200)', marginBottom: 24 }}>
          <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--grey-100)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'var(--grey-500)' }}>Editar resultados del juego</span>
            <span style={{ fontSize: 11, color: 'var(--grey-400)' }}>Modificá los scores y guardá para recalcular la clasificación</span>
          </div>
          <div style={{ padding: '20px' }}>
            {game.rounds.filter(r => r.status === 'completed').map(round => (
              <div key={round.num} style={{ marginBottom: 20 }}>
                <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--grey-400)', marginBottom: 10 }}>Ronda {round.num}</div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {round.courts.map(court => {
                    const key = `${round.num}-${court.courtNum}`;
                    const cur = editScores[key] ?? { p1: String(court.pair1Score ?? ''), p2: String(court.pair2Score ?? '') };
                    return (
                      <div key={court.courtNum} style={{ border: '1px solid var(--grey-200)', overflow: 'hidden' }}>
                        <div style={{ background: 'var(--grey-50)', padding: '6px 14px', fontSize: 9, fontWeight: 700, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'var(--grey-400)' }}>
                          Cancha {court.courtNum}
                        </div>
                        {[
                          { pids: court.pair1, val: cur.p1, team: 'p1' as const },
                          { pids: court.pair2, val: cur.p2, team: 'p2' as const },
                        ].map((row, ti) => (
                          <div key={ti} style={{ display: 'grid', gridTemplateColumns: '1fr 80px', borderTop: ti === 0 ? 'none' : '1px solid var(--grey-100)' }}>
                            <div style={{ padding: '10px 14px', borderRight: '1px solid var(--grey-100)', fontSize: 12, fontWeight: 500, color: 'var(--black)' }}>
                              {row.pids.map(pid => getName(pid)).join(' / ')}
                            </div>
                            <input
                              type="number" min={0}
                              value={row.val}
                              onChange={e => handleEditScoreChange(round.num, court.courtNum, row.team, e.target.value)}
                              placeholder="–"
                              style={{ width: '100%', textAlign: 'center', fontFamily: 'var(--font-display)', fontSize: 22, fontWeight: 700, border: 'none', outline: 'none', background: 'transparent', padding: '8px 0', color: 'var(--black)', boxSizing: 'border-box' }}
                            />
                          </div>
                        ))}
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
            <button
              onClick={handleSaveEditedResults}
              style={{ width: '100%', padding: '12px', background: 'var(--black)', color: '#fff', border: 'none', cursor: 'pointer', fontSize: 12, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em' }}
            >
              Guardar y recalcular clasificación →
            </button>
          </div>
        </div>
      )}

      {/* Top bar */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 28, flexWrap: 'wrap', gap: 12 }}>
        <Link href="/dashboard/player/quick-game" style={{ fontSize: 12, color: 'var(--grey-500)', textDecoration: 'none', fontWeight: 600, letterSpacing: '0.04em' }}>
          ← Mis Juegos Rápidos
        </Link>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{ fontSize: 11, fontWeight: 700, padding: '4px 10px', background: 'rgba(124,58,237,0.09)', color: '#7c3aed', letterSpacing: '0.08em' }}>
            {game.code}
          </span>
        </div>
      </div>

      {/* Header */}
      <div style={{ marginBottom: 10 }}>
        <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 36, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '-0.02em', margin: '0 0 10px' }}>
          {game.name}
        </h1>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          {isLive && (
            <span style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--turf-green)', display: 'inline-block', animation: 'pulse 2s infinite', flexShrink: 0 }} />
          )}
          <span style={{ fontSize: 12, fontWeight: 700, color: si.color, textTransform: 'uppercase', letterSpacing: '0.1em' }}>{si.label}</span>
        </div>
      </div>

      {/* Info row */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 32, fontSize: 12, color: 'var(--grey-500)' }}>
        {[
          game.date, game.time, game.club, game.city,
          formatLabel(game.format),
          game.levelLabel ?? null,
          game.pairType === 'parejas' ? 'Parejas Fijas' : 'Individual',
          game.mixto ? 'Mixto' : null,
          scoreConfigLabel(game.scoreConfig),
        ].filter(Boolean).map((item, i) => (
          <span key={i} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            {i > 0 && <span style={{ color: 'var(--grey-300)' }}>·</span>}
            {item}
          </span>
        ))}
      </div>

      {/* Share link + QR */}
      {shareUrl && (
        <div style={{ background: 'var(--grey-50)', border: '1px solid var(--grey-200)', marginBottom: 28 }}>
          <div style={{ padding: '14px 20px', display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap' }}>
            <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'var(--grey-400)', flexShrink: 0 }}>
              Enlace público
            </div>
            <code style={{ fontSize: 12, color: 'var(--grey-600)', flex: 1, wordBreak: 'break-all' }}>{shareUrl}</code>
            <button onClick={handleCopy} style={{ padding: '7px 16px', background: copied ? 'var(--turf-green)' : 'var(--black)', color: '#fff', border: 'none', cursor: 'pointer', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', flexShrink: 0 }}>
              {copied ? '✓ Copiado' : 'Copiar'}
            </button>
            <button onClick={() => setShowQR(v => !v)} style={{ padding: '7px 16px', border: '1px solid var(--grey-300)', background: showQR ? 'var(--black)' : '#fff', color: showQR ? '#fff' : 'var(--grey-600)', cursor: 'pointer', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', flexShrink: 0 }}>
              QR
            </button>
            <Link href={`/quick-game/${game.code}`} target="_blank" style={{ padding: '7px 16px', border: '1px solid var(--grey-300)', color: 'var(--grey-600)', textDecoration: 'none', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', flexShrink: 0 }}>
              Ver público →
            </Link>
          </div>
          {showQR && (
            <div style={{ borderTop: '1px solid var(--grey-200)', padding: '24px 20px', display: 'flex', alignItems: 'center', gap: 24, flexWrap: 'wrap' }}>
              <QRCodeSVG value={shareUrl} size={160} bgColor="#ffffff" fgColor="#000000" level="M" />
              <div>
                <div style={{ fontFamily: 'var(--font-display)', fontSize: 18, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '-0.01em', marginBottom: 6 }}>
                  Escaneá para ver en vivo
                </div>
                <div style={{ fontSize: 13, color: 'var(--grey-400)', marginBottom: 12 }}>
                  Compartí el código QR con los jugadores para que vean los resultados en tiempo real.
                </div>
                <div style={{ fontFamily: 'var(--font-display)', fontSize: 22, fontWeight: 700, letterSpacing: '0.06em', color: '#7c3aed' }}>
                  {game.code}
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Inline edit section (only when pending) */}
      {isPending && (
        <div style={{ border: '1px solid var(--grey-200)', background: '#fff', marginBottom: 24 }}>
          {/* Toggle header */}
          <button onClick={() => setEditOpen(v => !v)} style={{ width: '100%', padding: '16px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'none', border: 'none', cursor: 'pointer', textAlign: 'left' }}>
            <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'var(--grey-500)' }}>Editar detalles del juego</span>
            <span style={{ fontSize: 16, color: 'var(--grey-400)' }}>{editOpen ? '−' : '+'}</span>
          </button>

          {editOpen && (
            <div style={{ padding: '0 20px 20px', borderTop: '1px solid var(--grey-100)' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginTop: 16 }}>
                <div>
                  <label style={lbl}>Nombre del juego</label>
                  <input value={editName} onChange={e => setEditName(e.target.value)} style={inp} />
                </div>
                <div>
                  <label style={lbl}>Fecha</label>
                  <input type="date" value={editDate} onChange={e => setEditDate(e.target.value)} style={inp} />
                </div>
                <div>
                  <label style={lbl}>Hora</label>
                  <input type="time" value={editTime} onChange={e => setEditTime(e.target.value)} style={inp} />
                </div>
              </div>

              {/* Location */}
              <div style={{ marginTop: 12 }}>
                <label style={lbl}>Ubicación</label>
                <div style={{ display: 'flex', gap: 8, marginBottom: 8, flexWrap: 'wrap' }}>
                  <button onClick={() => setEditIsCustomLoc(false)} style={{ padding: '7px 14px', border: `2px solid ${!editIsCustomLoc ? 'var(--black)' : 'var(--grey-200)'}`, background: !editIsCustomLoc ? 'var(--black)' : '#fff', color: !editIsCustomLoc ? '#fff' : 'var(--grey-600)', cursor: 'pointer', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Club registrado</button>
                  <button onClick={() => setEditIsCustomLoc(true)} style={{ padding: '7px 14px', border: `2px solid ${editIsCustomLoc ? 'var(--black)' : 'var(--grey-200)'}`, background: editIsCustomLoc ? 'var(--black)' : '#fff', color: editIsCustomLoc ? '#fff' : 'var(--grey-600)', cursor: 'pointer', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Otro / Pista privada</button>
                </div>
                {editIsCustomLoc ? (
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                    <input value={editClub} onChange={e => setEditClub(e.target.value)} placeholder="Nombre del lugar" style={inp} />
                    <input value={editCity} onChange={e => setEditCity(e.target.value)} placeholder="Ciudad" style={inp} />
                  </div>
                ) : (
                  <input value={editClub} onChange={e => setEditClub(e.target.value)} placeholder="Nombre del club" style={inp} />
                )}
              </div>

              <button onClick={handleSaveEdits} style={{ marginTop: 16, padding: '10px 24px', background: 'var(--black)', color: '#fff', border: 'none', cursor: 'pointer', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                Guardar cambios ✓
              </button>
            </div>
          )}
        </div>
      )}

      {/* Pending / Start panel */}
      {isPending && (
        <div style={{ background: 'var(--grey-50)', border: '1px solid var(--grey-200)', padding: '24px', marginBottom: 32, display: 'flex', alignItems: 'flex-start', gap: 20, flexWrap: 'wrap' }}>
          <div style={{ width: 48, height: 48, background: 'rgba(245,166,35,0.12)', border: '1px solid rgba(245,166,35,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22, flexShrink: 0 }}>
            {canStart ? '▶' : '⏳'}
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontFamily: 'var(--font-display)', fontSize: 16, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '-0.01em', marginBottom: 4 }}>
              {canStart ? 'Listo para empezar' : 'Esperando jugadores'}
            </div>
            <div style={{ fontSize: 13, color: 'var(--grey-400)', marginBottom: canStart ? 16 : 0 }}>
              {canStart
                ? `${game.players.length} jugadores confirmados · ${game.courts} ${game.courts === 1 ? 'cancha' : 'canchas'}`
                : `${game.players.length} de ${game.maxPlayers} jugadores. Compartí el código `}
              {!canStart && (
                <strong style={{ color: '#7c3aed' }}>{game.code}</strong>
              )}
            </div>
            {isPending && emptySlots > 0 && (
              <div style={{ background: '#fffbeb', border: '1px solid #fcd34d', padding: '12px 16px', marginBottom: 20, fontSize: 13, color: '#92400e' }}>
                <strong>{emptySlots} slot{emptySlots > 1 ? 's' : ''} vacío{emptySlots > 1 ? 's' : ''}</strong> — Agregá jugadores o reducí los spots antes de iniciar.
              </div>
            )}
            {canStart && (
              <button
                onClick={handleStartGame}
                style={{ padding: '12px 28px', background: 'var(--turf-green)', color: '#fff', border: 'none', cursor: 'pointer', fontSize: 13, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em' }}
              >
                Iniciar Juego →
              </button>
            )}
          </div>
        </div>
      )}

      {/* Join requests panel (pending game only) */}
      {isPending && joinRequests.filter(r => r.status === 'pending').length > 0 && (
        <div style={{ background: '#fff', border: '2px solid #7c3aed', marginBottom: 24 }}>
          <div style={{ background: 'rgba(124,58,237,0.06)', padding: '14px 20px', borderBottom: '1px solid rgba(124,58,237,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#7c3aed', display: 'inline-block', animation: 'pulse 2s infinite' }} />
              <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.14em', textTransform: 'uppercase', color: '#7c3aed' }}>
                Solicitudes de unión ({joinRequests.filter(r => r.status === 'pending').length})
              </span>
            </div>
            <span style={{ fontSize: 11, color: 'var(--grey-400)' }}>El jugador está esperando tu respuesta</span>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
            {joinRequests.filter(r => r.status === 'pending').map(req => (
              <div key={req.id} style={{ padding: '14px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16, borderBottom: '1px solid var(--grey-100)' }}>
                <div>
                  <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--black)', marginBottom: 2 }}>{req.playerName}</div>
                  <div style={{ fontSize: 11, color: 'var(--grey-400)' }}>
                    {new Date(req.createdAt).toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' })} · {game.players.length}/{game.maxPlayers} slots usados
                  </div>
                </div>
                <div style={{ display: 'flex', gap: 8, flexShrink: 0 }}>
                  <button
                    onClick={() => handleApproveRequest(req)}
                    disabled={game.players.length >= game.maxPlayers}
                    style={{ padding: '8px 18px', background: game.players.length < game.maxPlayers ? 'var(--turf-green)' : 'var(--grey-200)', color: game.players.length < game.maxPlayers ? '#fff' : 'var(--grey-400)', border: 'none', cursor: game.players.length < game.maxPlayers ? 'pointer' : 'not-allowed', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em' }}
                  >
                    {game.players.length >= game.maxPlayers ? 'Sin slots' : 'Aprobar'}
                  </button>
                  <button
                    onClick={() => handleRejectRequest(req)}
                    style={{ padding: '8px 14px', background: '#fff', border: '1px solid #fca5a5', color: '#dc2626', cursor: 'pointer', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em' }}
                  >
                    Rechazar
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Player management section (when pending) */}
      {isPending && (
        <div style={{ marginBottom: 32 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
            <div style={secTitle}>Jugadores ({game.players.length}/{game.maxPlayers})</div>
            {emptySlots > 0 && (
              <button onClick={handleTrimSlots} style={{ padding: '5px 12px', background: '#fff', border: '1px solid var(--grey-200)', cursor: 'pointer', fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--grey-500)' }}>
                Reducir spots a {game.players.length}
              </button>
            )}
          </div>

          {/* Player chips */}
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 12 }}>
            {game.players.map(p => (
              <div key={p.id} style={{ padding: '8px 12px', background: '#fff', border: '1px solid var(--grey-200)', fontSize: 13, display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ fontWeight: p.isCreator ? 700 : 500 }}>{p.name}</span>
                {p.isCreator && <span style={{ fontSize: 9, background: 'var(--neon)', color: 'var(--black)', padding: '2px 5px', fontWeight: 700 }}>ORG</span>}
                {!p.isCreator && (
                  <button onClick={() => handleRemovePlayer(p.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--grey-400)', fontSize: 14, lineHeight: 1, padding: '0 2px' }}>×</button>
                )}
              </div>
            ))}
            {/* Empty slots */}
            {Array.from({ length: emptySlots }, (_, i) => (
              <div key={`empty-${i}`} style={{ padding: '8px 12px', background: 'var(--grey-50)', border: '1px dashed var(--grey-300)', fontSize: 12, color: 'var(--grey-400)' }}>
                Slot vacío
              </div>
            ))}
          </div>

          {/* Add player input */}
          <div style={{ display: 'flex', gap: 8 }}>
            <input
              value={addPlayerName}
              onChange={e => setAddPlayerName(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleAddPlayer()}
              placeholder="Nombre del jugador..."
              style={{ ...inp, maxWidth: 280 }}
            />
            <button
              onClick={handleAddPlayer}
              disabled={!addPlayerName.trim() || game.players.length >= game.maxPlayers}
              style={{ padding: '10px 20px', background: addPlayerName.trim() && game.players.length < game.maxPlayers ? 'var(--black)' : 'var(--grey-200)', color: addPlayerName.trim() && game.players.length < game.maxPlayers ? '#fff' : 'var(--grey-400)', border: 'none', cursor: addPlayerName.trim() && game.players.length < game.maxPlayers ? 'pointer' : 'default', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em' }}
            >
              + Agregar
            </button>
          </div>
        </div>
      )}

      {/* Active round — score entry */}
      {isLive && activeRound && !activeRoundComplete && (
        <div style={{ marginBottom: 36 }}>
          <div style={secTitle}>Ronda Actual — Ronda {activeRound.num}</div>

          {/* Resting players */}
          {activeRound.resting.length > 0 && (
            <div style={{ marginBottom: 14, display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
              <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--grey-400)' }}>Descansan:</span>
              {activeRound.resting.map(pid => (
                <span key={pid} style={{ fontSize: 12, padding: '3px 10px', border: '1px solid var(--grey-200)', color: 'var(--grey-500)' }}>
                  {getName(pid)}
                </span>
              ))}
            </div>
          )}

          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {activeRound.courts.map(court => {
              const key = `${activeRound.num}-${court.courtNum}`;
              const isDone   = court.status === 'completed';
              const inputs   = scoreInputs[key] ?? { p1: '', p2: '' };

              return (
                <div key={court.courtNum} style={{ background: '#fff', border: '1px solid var(--grey-200)', marginBottom: 12, overflow: 'hidden' }}>

                  {/* Header bar */}
                  <div style={{ background: isDone ? 'var(--grey-800, #1a1a1a)' : 'var(--black)', color: '#fff', padding: '8px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.16em', textTransform: 'uppercase' }}>Cancha {court.courtNum}</span>
                    {isDone
                      ? <span style={{ fontSize: 9, fontWeight: 700, color: 'var(--neon)', letterSpacing: '0.12em' }}>✓ COMPLETADO</span>
                      : <span style={{ fontSize: 9, fontWeight: 700, color: 'var(--turf-green)', letterSpacing: '0.12em' }}>● EN JUEGO</span>
                    }
                  </div>

                  {/* Team rows */}
                  {[
                    { pids: court.pair1, score: court.pair1Score, inputKey: 'p1', isWinner: isDone && (court.pair1Score ?? 0) > (court.pair2Score ?? 0) },
                    { pids: court.pair2, score: court.pair2Score, inputKey: 'p2', isWinner: isDone && (court.pair2Score ?? 0) > (court.pair1Score ?? 0) },
                  ].map((team, ti) => (
                    <div key={ti} style={{
                      display: 'grid', gridTemplateColumns: '1fr 88px',
                      borderBottom: ti === 0 ? '2px solid var(--grey-100)' : 'none',
                      background: isDone && team.isWinner ? 'rgba(40,167,69,0.04)' : '#fff',
                    }}>
                      {/* Player names */}
                      <div style={{ padding: '14px 16px', borderRight: '1px solid var(--grey-100)' }}>
                        {team.pids.map(pid => (
                          <div key={pid} style={{ fontSize: 13, fontWeight: 600, lineHeight: 1.5, color: isDone && !team.isWinner ? 'var(--grey-400)' : 'var(--black)' }}>
                            {getName(pid)}
                          </div>
                        ))}
                      </div>
                      {/* Score column */}
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '12px 8px' }}>
                        {isDone ? (
                          <span style={{ fontFamily: 'var(--font-display)', fontSize: 36, fontWeight: 700, color: team.isWinner ? 'var(--turf-green)' : 'var(--grey-300)', lineHeight: 1 }}>
                            {team.score ?? 0}
                          </span>
                        ) : (
                          <input
                            type="number" min={0} max={999}
                            value={inputs[team.inputKey as 'p1' | 'p2']}
                            onChange={e => team.inputKey === 'p1'
                              ? handleP1Change(key, e.target.value)
                              : handleP2Change(key, e.target.value)
                            }
                            placeholder="–"
                            style={{ width: '100%', textAlign: 'center', fontFamily: 'var(--font-display)', fontSize: 28, fontWeight: 700, border: 'none', borderBottom: '2px solid var(--grey-200)', outline: 'none', padding: '4px 0', background: 'transparent', color: 'var(--black)' }}
                          />
                        )}
                      </div>
                    </div>
                  ))}

                  {/* Register button (only when not done) */}
                  {!isDone && (
                    <div style={{ padding: '12px 16px', borderTop: '1px solid var(--grey-100)' }}>
                      <button
                        onClick={() => handleRegister(activeRound.num, court.courtNum)}
                        style={{ width: '100%', padding: '10px', background: 'var(--black)', color: '#fff', border: 'none', cursor: 'pointer', fontSize: 12, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em' }}
                      >
                        Registrar resultado →
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Round complete — next round button */}
      {isLive && activeRoundComplete && !gameComplete && (
        <div style={{ marginBottom: 32, padding: '24px', background: 'rgba(40,167,69,0.06)', border: '1px solid rgba(40,167,69,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap' }}>
          <div>
            <div style={{ fontFamily: 'var(--font-display)', fontSize: 15, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '-0.01em', marginBottom: 4 }}>
              Ronda {activeRound?.num} completada
            </div>
            <div style={{ fontSize: 13, color: 'var(--grey-400)' }}>Todos los scores registrados. Podés iniciar la siguiente ronda.</div>
          </div>
          {hasMoreRounds && (
            <button
              onClick={handleNextRound}
              style={{ padding: '12px 28px', background: 'var(--turf-green)', color: '#fff', border: 'none', cursor: 'pointer', fontSize: 13, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', flexShrink: 0 }}
            >
              Siguiente Ronda →
            </button>
          )}
        </div>
      )}

      {/* Standings */}
      {game.standings.length > 0 && (
        <div style={{ marginBottom: 36 }}>
          <div style={secTitle}>Clasificación</div>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: 'var(--grey-50)', borderBottom: '2px solid var(--grey-200)' }}>
                {['Pos', 'Jugador', 'Victorias', 'Pts', 'PJ', '+/-'].map(h => (
                  <th key={h} style={{ padding: '10px 14px', textAlign: h === 'Pos' ? 'center' : 'left', fontSize: 9, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--grey-400)' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {game.standings.map((s, i) => {
                const isMe = game.players.find(p => p.id === s.playerId)?.isCreator ?? false;
                return (
                  <tr
                    key={s.playerId}
                    style={{ borderBottom: '1px solid var(--grey-100)', background: isMe ? 'rgba(214,255,0,0.05)' : i % 2 === 0 ? '#fff' : 'var(--grey-50)' }}
                  >
                    <td style={{ padding: '12px 14px', textAlign: 'center', fontFamily: 'var(--font-display)', fontSize: 18, fontWeight: 700, color: i === 0 ? 'var(--neon)' : 'var(--grey-300)' }}>
                      {i + 1}
                    </td>
                    <td style={{ padding: '12px 14px' }}>
                      <span style={{ fontSize: 13, fontWeight: isMe ? 700 : 500, color: 'var(--black)' }}>{s.playerName}</span>
                      {isMe && <span style={{ marginLeft: 8, fontSize: 9, background: 'var(--neon)', color: 'var(--black)', padding: '2px 6px', fontWeight: 700, verticalAlign: 'middle' }}>TÚ</span>}
                    </td>
                    <td style={{ padding: '12px 14px', fontFamily: 'var(--font-display)', fontSize: 16, fontWeight: 600 }}>{s.wins}</td>
                    <td style={{ padding: '12px 14px', fontFamily: 'var(--font-display)', fontSize: 16, fontWeight: 700 }}>{s.pts}</td>
                    <td style={{ padding: '12px 14px', fontSize: 13, color: 'var(--grey-400)' }}>{s.played}</td>
                    <td style={{ padding: '12px 14px', fontSize: 13, color: s.diff >= 0 ? 'var(--turf-green)' : '#e53e3e', fontWeight: 600 }}>
                      {s.diff >= 0 ? '+' : ''}{s.diff}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Round history */}
      {doneRounds.length > 0 && (
        <div style={{ marginBottom: 32 }}>
          <div style={secTitle}>Historial de Rondas</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            {doneRounds.map(round => (
              <div key={round.num}>
                <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--grey-500)', marginBottom: 8 }}>
                  Ronda {round.num}
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  {round.courts.map(court => (
                    <div
                      key={court.courtNum}
                      style={{ background: '#fff', border: '1px solid var(--grey-200)', padding: '14px 20px', display: 'grid', gridTemplateColumns: '1fr auto 1fr', alignItems: 'center', gap: 12 }}
                    >
                      <div>
                        {court.pair1.map(pid => (
                          <div key={pid} style={{ fontSize: 12, fontWeight: 600 }}>{getName(pid)}</div>
                        ))}
                      </div>
                      <div style={{ textAlign: 'center' }}>
                        {court.pair1Score !== null ? (
                          <span style={{ fontFamily: 'var(--font-display)', fontSize: 22, fontWeight: 700 }}>
                            <span style={{ color: (court.pair1Score ?? 0) > (court.pair2Score ?? 0) ? 'var(--turf-green)' : 'var(--grey-400)' }}>{court.pair1Score}</span>
                            <span style={{ color: 'var(--grey-300)', margin: '0 4px' }}>–</span>
                            <span style={{ color: (court.pair2Score ?? 0) > (court.pair1Score ?? 0) ? 'var(--turf-green)' : 'var(--grey-400)' }}>{court.pair2Score}</span>
                          </span>
                        ) : (
                          <span style={{ fontSize: 11, color: 'var(--grey-300)' }}>–</span>
                        )}
                        <div style={{ fontSize: 9, color: 'var(--grey-300)', marginTop: 2, letterSpacing: '0.08em' }}>CANCHA {court.courtNum}</div>
                      </div>
                      <div style={{ textAlign: 'right' }}>
                        {court.pair2.map(pid => (
                          <div key={pid} style={{ fontSize: 12, fontWeight: 600 }}>{getName(pid)}</div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

    </div>
  );
}
