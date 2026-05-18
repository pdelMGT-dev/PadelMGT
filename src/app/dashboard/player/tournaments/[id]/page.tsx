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
import type { ActiveGame, GameStatus, ScoreConfig, KnockoutMatch } from '@/lib/game-engine';

// ── Join request helpers ───────────────────────────────────────────────────────

type JoinRequest = {
  id: string; gameId: string; playerId: string;
  playerName: string; status: 'pending' | 'approved' | 'rejected'; createdAt: string;
};
function loadJoinRequests(gameId: string): JoinRequest[] {
  try { return (JSON.parse(localStorage.getItem('padelmgt_join_requests') || '[]') as JoinRequest[]).filter(r => r.gameId === gameId); } catch { return []; }
}
function updateJoinRequest(id: string, status: 'approved' | 'rejected') {
  try {
    const all: JoinRequest[] = JSON.parse(localStorage.getItem('padelmgt_join_requests') || '[]');
    localStorage.setItem('padelmgt_join_requests', JSON.stringify(all.map(r => r.id === id ? { ...r, status } : r)));
  } catch {}
}

// ── Helpers ────────────────────────────────────────────────────────────────────

const STATUS_INFO: Record<GameStatus, { label: string; color: string; dot?: boolean }> = {
  created:       { label: 'Creado',      color: '#7c3aed' },
  starting_soon: { label: 'Por Empezar', color: '#f5a623' },
  live:          { label: 'En Vivo',     color: 'var(--turf-green)', dot: true },
  finished:      { label: 'Finalizado',  color: 'var(--grey-400)' },
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

function isRoundBased(fmt: string) {
  return ['americano', 'mexicano', 'round_robin', 'team_league'].includes(fmt);
}

// ── Styles ─────────────────────────────────────────────────────────────────────

const inp: React.CSSProperties = {
  padding: '8px 10px', fontSize: 13, border: '1px solid var(--grey-200)',
  background: '#fff', color: 'var(--black)', outline: 'none', fontFamily: 'var(--font-body)',
  boxSizing: 'border-box', textAlign: 'center' as const, width: 72,
};

const secTitle: React.CSSProperties = {
  fontSize: 9, letterSpacing: '0.18em', textTransform: 'uppercase', fontWeight: 700,
  color: 'var(--grey-400)', marginBottom: 16, paddingBottom: 10,
  borderBottom: '1px solid var(--grey-100)',
};

// ── Component ──────────────────────────────────────────────────────────────────

export default function TournamentAdminPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);

  const [game, setGame] = useState<ActiveGame | null>(() => {
    if (typeof window === 'undefined') return null;
    return getGame(id);
  });

  useEffect(() => {
    if (!game) setGame(getGame(id));
  }, [id, game]);

  const [scoreInputs, setScoreInputs] = useState<Record<string, { p1: string; p2: string }>>({});
  const [bracketInputs, setBracketInputs] = useState<Record<string, { p1: string; p2: string }>>({});
  const [toast, setToast] = useState<string | null>(null);
  const [shareUrl, setShareUrl] = useState('');
  const [copied, setCopied] = useState(false);
  const [showQR, setShowQR] = useState(false);

  // User detection
  const [currentUser, setCurrentUser] = useState<{ id: string; name: string } | null>(null);
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

  // Post-game editing
  const [editResultsOpen, setEditResultsOpen] = useState(false);
  const [editScores, setEditScores] = useState<Record<string, { p1: string; p2: string }>>({});

  useEffect(() => {
    if (game?.code) setShareUrl(`${window.location.origin}/tournament/${game.code}`);
  }, [game?.code]);

  // Init edit fields when game loads
  useEffect(() => {
    if (!game) return;
    setEditName(game.name); setEditDate(game.date); setEditTime(game.time);
    setEditClub(game.club); setEditCity(game.city);
  }, [game?.id]);

  // Poll join requests every 4s
  useEffect(() => {
    if (!game) return;
    const load = () => setJoinRequests(loadJoinRequests(game.id));
    load();
    const iv = setInterval(load, 4000);
    return () => clearInterval(iv);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [game?.id]);

  if (!game) {
    return (
      <div style={{ padding: 40, textAlign: 'center' }}>
        <p style={{ color: 'var(--grey-400)', marginBottom: 16 }}>Torneo no encontrado.</p>
        <Link href="/dashboard/player/tournaments" style={{ fontSize: 13, color: 'var(--black)', fontWeight: 600 }}>← Mis Torneos</Link>
      </div>
    );
  }

  // ── Derived ────────────────────────────────────────────────────────────────

  const si = STATUS_INFO[game.status];
  const isLive     = game.status === 'live';
  const isFinished = game.status === 'finished';
  const isPending  = game.status === 'created' || game.status === 'starting_soon';
  const emptySlots = Math.max(0, game.maxPlayers - game.players.length);
  const canStart   = isPending && game.players.length >= 4 && game.players.length === game.maxPlayers;
  const roundBased = isRoundBased(game.format);

  const activeRound = game.rounds.find(r => r.status === 'active') ?? null;
  const doneRounds  = game.rounds.filter(r => r.status === 'completed');
  const activeRoundComplete = activeRound ? isRoundComplete(activeRound) : false;
  const gameComplete = isGameFinished(game);

  const hasMoreRounds = !gameComplete && activeRoundComplete && (
    game.format === 'mexicano' ||
    game.rounds.some(r => r.num > (activeRound?.num ?? 0) && r.status === 'pending')
  );

  // ── Helpers ────────────────────────────────────────────────────────────────

  function showToast(msg: string) {
    setToast(msg);
    setTimeout(() => setToast(null), 3500);
  }

  function getName(pid: string) {
    if (!pid) return '–';
    if (pid.startsWith('bye-')) return 'BYE';
    return game!.players.find(p => p.id === pid)?.name ?? pid;
  }

  // ── Actions ────────────────────────────────────────────────────────────────

  function handleStart() {
    const started = engineStartGame(game!);
    saveGame(started);
    setGame(started);
    showToast('¡Torneo iniciado!');
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
      if (isGameFinished(updated)) showToast('¡Torneo finalizado!');
      else showToast('Ronda completada — iniciá la siguiente.');
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

  function handleBracketRegister(roundIdx: number, matchIdx: number) {
    if (!game?.bracket) return;
    const key = `${roundIdx}-${matchIdx}`;
    const raw = bracketInputs[key] ?? { p1: '', p2: '' };
    const p1Score = Math.max(0, parseInt(raw.p1 || '0', 10));
    const p2Score = Math.max(0, parseInt(raw.p2 || '0', 10));

    const rounds = game.bracket.rounds.map((round, ri) => {
      if (ri !== roundIdx) return round;
      const matches = round.matches.map((m, mi) => {
        if (mi !== matchIdx) return m;
        const winner = p1Score > p2Score ? m.pair1 : m.pair2;
        return { ...m, pair1Score: p1Score, pair2Score: p2Score, winner, status: 'completed' as const };
      });
      return { ...round, matches };
    });

    // Advance winners to next round
    const advancedRounds = rounds.map((round, ri) => {
      if (ri === 0) return round;
      const prevRound = rounds[ri - 1];
      const matches = round.matches.map((m, mi) => {
        const srcMatchIdx1 = mi * 2;
        const srcMatchIdx2 = mi * 2 + 1;
        const src1 = prevRound.matches[srcMatchIdx1];
        const src2 = prevRound.matches[srcMatchIdx2];
        return {
          ...m,
          pair1: src1?.status === 'completed' ? src1.winner : m.pair1,
          pair2: src2?.status === 'completed' ? src2.winner : m.pair2,
        };
      });
      return { ...round, matches };
    });

    const updated: ActiveGame = { ...game!, bracket: { rounds: advancedRounds } };
    saveGame(updated);
    setGame(updated);
    setBracketInputs(prev => { const n = { ...prev }; delete n[key]; return n; });

    const lastRound = advancedRounds[advancedRounds.length - 1];
    if (lastRound?.matches.every(m => m.status === 'completed')) {
      const finished: ActiveGame = { ...updated, status: 'finished' };
      saveGame(finished);
      setGame(finished);
      showToast('¡Torneo finalizado!');
    }
  }

  function handleCopy() {
    navigator.clipboard.writeText(shareUrl).then(() => { setCopied(true); setTimeout(() => setCopied(false), 2000); });
  }

  function handleSaveEdits() {
    if (!game) return;
    const updated: ActiveGame = { ...game, name: editName.trim() || game.name, date: editDate || game.date, time: editTime || game.time, club: editIsCustomLoc ? editClub.trim() : (editClub.trim() || game.club), city: editIsCustomLoc ? editCity.trim() : (editCity.trim() || game.city) };
    saveGame(updated); setGame(updated); setEditOpen(false); showToast('Torneo actualizado.');
  }

  function handleAddPlayer() {
    if (!addPlayerName.trim() || !game || game.players.length >= game.maxPlayers) return;
    const newP = { id: `manual-${Date.now()}`, name: addPlayerName.trim(), ranking: 0, isCreator: false };
    const updated = { ...game, players: [...game.players, newP] };
    saveGame(updated); setGame(updated); setAddPlayerName(''); showToast(`${newP.name} agregado.`);
  }

  function handleRemovePlayer(pid: string) {
    if (!game) return;
    const updated = { ...game, players: game.players.filter(p => p.id !== pid) };
    saveGame(updated); setGame(updated); showToast('Jugador eliminado.');
  }

  function handleTrimSlots() {
    if (!game) return;
    const updated = { ...game, maxPlayers: game.players.length };
    saveGame(updated); setGame(updated); showToast('Spots ajustados.');
  }

  function handleApproveRequest(req: JoinRequest) {
    if (!game || game.players.length >= game.maxPlayers) return;
    const newP = { id: req.playerId, name: req.playerName, ranking: 0, isCreator: false };
    const updated = { ...game, players: [...game.players, newP] };
    saveGame(updated); setGame(updated);
    updateJoinRequest(req.id, 'approved');
    setJoinRequests(prev => prev.map(r => r.id === req.id ? { ...r, status: 'approved' } : r));
    showToast(`${req.playerName} aprobado.`);
  }

  function handleRejectRequest(req: JoinRequest) {
    updateJoinRequest(req.id, 'rejected');
    setJoinRequests(prev => prev.map(r => r.id === req.id ? { ...r, status: 'rejected' } : r));
    showToast(`Solicitud de ${req.playerName} rechazada.`);
  }

  function handleEditScoreChange(roundNum: number, courtNum: number, team: 'p1' | 'p2', val: string) {
    const key = `${roundNum}-${courtNum}`;
    setEditScores(prev => {
      const cur = prev[key] ?? { p1: '', p2: '' };
      if (isPointsMode && ptTarget !== null) {
        const n = parseInt(val, 10);
        if (!isNaN(n) && n >= 0 && n <= ptTarget) return { ...prev, [key]: team === 'p1' ? { p1: val, p2: String(ptTarget - n) } : { p1: String(ptTarget - n), p2: val } };
      }
      return { ...prev, [key]: { ...cur, [team]: val } };
    });
  }

  function handleSaveEditedResults() {
    if (!game) return;
    let updated = { ...game, rounds: game.rounds.map(r => ({ ...r, courts: r.courts.map(c => ({ ...c })) })) };
    for (const [key, scores] of Object.entries(editScores)) {
      const [rStr, cStr] = key.split('-');
      const round = updated.rounds.find(r => r.num === parseInt(rStr, 10));
      const court = round?.courts.find(c => c.courtNum === parseInt(cStr, 10));
      if (!court) continue;
      const p1 = parseInt(scores.p1, 10); const p2 = parseInt(scores.p2, 10);
      if (isNaN(p1) || isNaN(p2)) continue;
      court.pair1Score = p1; court.pair2Score = p2; court.status = 'completed';
    }
    updated.standings = calculateStandings(updated);
    saveGame(updated); setGame(updated); setEditScores({}); setEditResultsOpen(false); showToast('Resultados actualizados.');
  }

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
            <span style={{ fontFamily: 'var(--font-display)', fontSize: 14, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Torneo finalizado</span>
          </div>
          {roundBased && (
            <button onClick={() => { setEditResultsOpen(v => !v); setEditScores({}); }} style={{ padding: '6px 14px', background: 'rgba(255,255,255,0.15)', border: '1px solid rgba(255,255,255,0.3)', color: '#fff', cursor: 'pointer', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em' }}>
              {editResultsOpen ? 'Cancelar edición' : 'Editar resultados'}
            </button>
          )}
        </div>
      )}

      {/* Post-game score editing (round-based only) */}
      {isFinished && editResultsOpen && game.rounds.length > 0 && (
        <div style={{ background: '#fff', border: '1px solid var(--grey-200)', marginBottom: 24 }}>
          <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--grey-100)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'var(--grey-500)' }}>Editar resultados</span>
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
                        <div style={{ background: 'var(--grey-50)', padding: '6px 14px', fontSize: 9, fontWeight: 700, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'var(--grey-400)' }}>Cancha {court.courtNum}</div>
                        {[{ pids: court.pair1, val: cur.p1, team: 'p1' as const }, { pids: court.pair2, val: cur.p2, team: 'p2' as const }].map((row, ti) => (
                          <div key={ti} style={{ display: 'grid', gridTemplateColumns: '1fr 80px', borderTop: ti === 0 ? 'none' : '1px solid var(--grey-100)' }}>
                            <div style={{ padding: '10px 14px', borderRight: '1px solid var(--grey-100)', fontSize: 12, fontWeight: 500 }}>{row.pids.map(pid => getName(pid)).join(' / ')}</div>
                            <input type="number" min={0} value={row.val} onChange={e => handleEditScoreChange(round.num, court.courtNum, row.team, e.target.value)} placeholder="–" style={{ width: '100%', textAlign: 'center', fontFamily: 'var(--font-display)', fontSize: 22, fontWeight: 700, border: 'none', outline: 'none', background: 'transparent', padding: '8px 0', color: 'var(--black)', boxSizing: 'border-box' }} />
                          </div>
                        ))}
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
            <button onClick={handleSaveEditedResults} style={{ width: '100%', padding: '12px', background: 'var(--black)', color: '#fff', border: 'none', cursor: 'pointer', fontSize: 12, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em' }}>
              Guardar y recalcular clasificación →
            </button>
          </div>
        </div>
      )}

      {/* Top bar */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 28, flexWrap: 'wrap', gap: 12 }}>
        <Link href="/dashboard/player/tournaments" style={{ fontSize: 12, color: 'var(--grey-500)', textDecoration: 'none', fontWeight: 600, letterSpacing: '0.04em' }}>
          ← Mis Torneos
        </Link>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{ fontSize: 11, fontWeight: 700, padding: '4px 10px', background: 'rgba(124,58,237,0.09)', color: '#7c3aed', letterSpacing: '0.08em' }}>
            {game.code}
          </span>
        </div>
      </div>

      {/* Header */}
      <div style={{ marginBottom: 10 }}>
        <div style={{ fontSize: 11, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'var(--grey-400)', fontWeight: 600, marginBottom: 6 }}>
          {formatLabel(game.format)} · Torneo
        </div>
        <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 36, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '-0.02em', margin: '0 0 10px' }}>
          {game.name}
        </h1>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          {si.dot && <span style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--turf-green)', display: 'inline-block', animation: 'pulse 2s infinite' }} />}
          <span style={{ fontSize: 12, fontWeight: 700, color: si.color, textTransform: 'uppercase', letterSpacing: '0.1em' }}>{si.label}</span>
        </div>
      </div>

      {/* Info row */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 28, fontSize: 12, color: 'var(--grey-500)' }}>
        {[
          game.date, game.time, game.club, game.city,
          formatLabel(game.format),
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
            <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'var(--grey-400)', flexShrink: 0 }}>Enlace público</div>
            <code style={{ fontSize: 12, color: 'var(--grey-600)', flex: 1, wordBreak: 'break-all' }}>{shareUrl}</code>
            <button onClick={handleCopy} style={{ padding: '7px 16px', background: copied ? 'var(--turf-green)' : 'var(--black)', color: '#fff', border: 'none', cursor: 'pointer', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', flexShrink: 0 }}>
              {copied ? '✓ Copiado' : 'Copiar'}
            </button>
            <button onClick={() => setShowQR(v => !v)} style={{ padding: '7px 16px', border: '1px solid var(--grey-300)', background: showQR ? 'var(--black)' : '#fff', color: showQR ? '#fff' : 'var(--grey-600)', cursor: 'pointer', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', flexShrink: 0 }}>
              QR
            </button>
            <Link href={`/tournament/${game.code}`} target="_blank" style={{ padding: '7px 16px', border: '1px solid var(--grey-300)', color: 'var(--grey-600)', textDecoration: 'none', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', flexShrink: 0 }}>
              Ver público →
            </Link>
          </div>
          {showQR && (
            <div style={{ borderTop: '1px solid var(--grey-200)', padding: '24px 20px', display: 'flex', alignItems: 'center', gap: 24, flexWrap: 'wrap' }}>
              <QRCodeSVG value={shareUrl} size={160} bgColor="#ffffff" fgColor="#000000" level="M" />
              <div>
                <div style={{ fontFamily: 'var(--font-display)', fontSize: 18, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '-0.01em', marginBottom: 6 }}>
                  Escaneá para seguir el torneo
                </div>
                <div style={{ fontSize: 13, color: 'var(--grey-400)', marginBottom: 12 }}>
                  Compartí el QR para que los jugadores y el público vean los resultados en tiempo real.
                </div>
                <div style={{ fontFamily: 'var(--font-display)', fontSize: 22, fontWeight: 700, letterSpacing: '0.06em', color: '#7c3aed' }}>
                  {game.code}
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Inline edit (pending only) */}
      {isPending && (
        <div style={{ background: '#fff', border: '1px solid var(--grey-200)', marginBottom: 28 }}>
          <button onClick={() => setEditOpen(v => !v)} style={{ width: '100%', padding: '12px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'none', border: 'none', cursor: 'pointer' }}>
            <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'var(--grey-500)' }}>Editar información del torneo</span>
            <span style={{ fontSize: 12, color: 'var(--grey-400)' }}>{editOpen ? '▲' : '▼'}</span>
          </button>
          {editOpen && (
            <div style={{ padding: '20px', borderTop: '1px solid var(--grey-100)' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12 }}>
                <div>
                  <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--grey-400)', marginBottom: 6 }}>Nombre</div>
                  <input value={editName} onChange={e => setEditName(e.target.value)} style={{ width: '100%', padding: '9px 12px', border: '1px solid var(--grey-200)', fontSize: 13, fontFamily: 'var(--font-body)', outline: 'none', boxSizing: 'border-box' }} />
                </div>
                <div>
                  <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--grey-400)', marginBottom: 6 }}>Fecha</div>
                  <input type="date" value={editDate} onChange={e => setEditDate(e.target.value)} style={{ width: '100%', padding: '9px 12px', border: '1px solid var(--grey-200)', fontSize: 13, fontFamily: 'var(--font-body)', outline: 'none', boxSizing: 'border-box' }} />
                </div>
                <div>
                  <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--grey-400)', marginBottom: 6 }}>Hora</div>
                  <input type="time" value={editTime} onChange={e => setEditTime(e.target.value)} style={{ width: '100%', padding: '9px 12px', border: '1px solid var(--grey-200)', fontSize: 13, fontFamily: 'var(--font-body)', outline: 'none', boxSizing: 'border-box' }} />
                </div>
                <div>
                  <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--grey-400)', marginBottom: 6 }}>Club / Sede</div>
                  <div style={{ display: 'flex', gap: 6, marginBottom: 6 }}>
                    {(['Club fijo', 'Otro / Pista privada'] as const).map((lbl, i) => (
                      <button key={i} onClick={() => setEditIsCustomLoc(i === 1)} style={{ flex: 1, padding: '6px', fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', border: '1px solid var(--grey-200)', cursor: 'pointer', background: editIsCustomLoc === (i === 1) ? 'var(--black)' : '#fff', color: editIsCustomLoc === (i === 1) ? '#fff' : 'var(--grey-500)' }}>{lbl}</button>
                    ))}
                  </div>
                  <input value={editClub} onChange={e => setEditClub(e.target.value)} placeholder={editIsCustomLoc ? 'Nombre del lugar' : 'Club'} style={{ width: '100%', padding: '9px 12px', border: '1px solid var(--grey-200)', fontSize: 13, fontFamily: 'var(--font-body)', outline: 'none', boxSizing: 'border-box', marginBottom: editIsCustomLoc ? 6 : 0 }} />
                  {editIsCustomLoc && <input value={editCity} onChange={e => setEditCity(e.target.value)} placeholder="Ciudad" style={{ width: '100%', padding: '9px 12px', border: '1px solid var(--grey-200)', fontSize: 13, fontFamily: 'var(--font-body)', outline: 'none', boxSizing: 'border-box' }} />}
                </div>
              </div>
              <button onClick={handleSaveEdits} style={{ padding: '10px 24px', background: 'var(--black)', color: '#fff', border: 'none', cursor: 'pointer', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em' }}>
                Guardar cambios →
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
              {canStart ? 'Listo para iniciar' : 'Esperando jugadores'}
            </div>
            <div style={{ fontSize: 13, color: 'var(--grey-400)', marginBottom: canStart ? 16 : 0 }}>
              {canStart
                ? `${game.players.length} jugadores · ${game.courts} canchas · Formato: ${formatLabel(game.format)}`
                : `${game.players.length} de ${game.maxPlayers} jugadores. Compartí el código `}
              {!canStart && <strong style={{ color: '#7c3aed' }}>{game.code}</strong>}
            </div>
            {!canStart && emptySlots > 0 && (
              <div style={{ marginTop: 10, padding: '8px 12px', background: 'rgba(245,166,35,0.08)', border: '1px solid rgba(245,166,35,0.25)', display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ fontSize: 13 }}>⚠</span>
                <span style={{ fontSize: 12, color: '#b45309', fontWeight: 600 }}>
                  Faltan {emptySlots} jugador{emptySlots !== 1 ? 'es' : ''} para completar el torneo
                </span>
              </div>
            )}
            {canStart && (
              <button onClick={handleStart} style={{ padding: '12px 28px', background: 'var(--turf-green)', color: '#fff', border: 'none', cursor: 'pointer', fontSize: 13, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                Iniciar Torneo →
              </button>
            )}
          </div>
        </div>
      )}

      {/* Join requests panel */}
      {isPending && joinRequests.filter(r => r.status === 'pending').length > 0 && (
        <div style={{ background: '#fff', border: '2px solid #7c3aed', marginBottom: 20 }}>
          <div style={{ padding: '12px 16px', borderBottom: '1px solid rgba(124,58,237,0.15)', display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#7c3aed', display: 'inline-block' }} />
            <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.14em', textTransform: 'uppercase', color: '#7c3aed' }}>
              Solicitudes pendientes ({joinRequests.filter(r => r.status === 'pending').length})
            </span>
          </div>
          <div style={{ padding: '12px 16px', display: 'flex', flexDirection: 'column', gap: 8 }}>
            {joinRequests.filter(r => r.status === 'pending').map(req => (
              <div key={req.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 12px', background: 'rgba(124,58,237,0.04)', border: '1px solid rgba(124,58,237,0.12)' }}>
                <span style={{ fontSize: 13, fontWeight: 600 }}>{req.playerName}</span>
                <div style={{ display: 'flex', gap: 6 }}>
                  <button onClick={() => handleApproveRequest(req)} disabled={game.players.length >= game.maxPlayers} style={{ padding: '6px 14px', background: 'var(--turf-green)', color: '#fff', border: 'none', cursor: game.players.length >= game.maxPlayers ? 'not-allowed' : 'pointer', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', opacity: game.players.length >= game.maxPlayers ? 0.5 : 1 }}>
                    Aprobar
                  </button>
                  <button onClick={() => handleRejectRequest(req)} style={{ padding: '6px 14px', background: 'transparent', color: '#e53e3e', border: '1px solid #e53e3e', cursor: 'pointer', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                    Rechazar
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Players list */}
      {(isPending || game.players.length > 0) && (
        <div style={{ marginBottom: 32 }}>
          <div style={secTitle}>Jugadores ({game.players.length}/{game.maxPlayers})</div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: isPending ? 12 : 0 }}>
            {game.players.map(p => (
              <div key={p.id} style={{ padding: '8px 14px', background: '#fff', border: '1px solid var(--grey-200)', fontSize: 13, fontWeight: p.isCreator ? 700 : 500, display: 'flex', alignItems: 'center', gap: 8 }}>
                {p.name}
                {p.isCreator && <span style={{ fontSize: 9, background: 'var(--neon)', color: 'var(--black)', padding: '2px 5px', fontWeight: 700 }}>ORG</span>}
                {isPending && !p.isCreator && (
                  <button onClick={() => handleRemovePlayer(p.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--grey-400)', fontSize: 16, lineHeight: 1, padding: '0 2px' }} title="Eliminar">×</button>
                )}
              </div>
            ))}
            {isPending && Array.from({ length: emptySlots }).map((_, i) => (
              <div key={`empty-${i}`} style={{ padding: '8px 14px', border: '1px dashed var(--grey-300)', fontSize: 12, color: 'var(--grey-300)', background: 'transparent' }}>
                Spot libre
              </div>
            ))}
          </div>
          {isPending && (
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 8 }}>
              <input value={addPlayerName} onChange={e => setAddPlayerName(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleAddPlayer()} placeholder="Nombre del jugador" style={{ flex: 1, minWidth: 180, padding: '9px 12px', border: '1px solid var(--grey-200)', fontSize: 13, fontFamily: 'var(--font-body)', outline: 'none' }} />
              <button onClick={handleAddPlayer} disabled={!addPlayerName.trim() || game.players.length >= game.maxPlayers} style={{ padding: '9px 20px', background: 'var(--black)', color: '#fff', border: 'none', cursor: !addPlayerName.trim() || game.players.length >= game.maxPlayers ? 'not-allowed' : 'pointer', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', opacity: !addPlayerName.trim() || game.players.length >= game.maxPlayers ? 0.5 : 1 }}>
                + Agregar
              </button>
              {emptySlots > 0 && game.players.length >= 4 && (
                <button onClick={handleTrimSlots} style={{ padding: '9px 20px', background: 'transparent', color: 'var(--grey-500)', border: '1px solid var(--grey-300)', cursor: 'pointer', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                  Reducir spots →
                </button>
              )}
            </div>
          )}
        </div>
      )}

      {/* ── ROUND-BASED: active round ─────────────────────────────────────── */}
      {isLive && roundBased && activeRound && !activeRoundComplete && (
        <div style={{ marginBottom: 36 }}>
          <div style={secTitle}>Ronda Actual — Ronda {activeRound.num}</div>
          {activeRound.resting.length > 0 && (
            <div style={{ marginBottom: 14, display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
              <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--grey-400)' }}>Descansan:</span>
              {activeRound.resting.map(pid => (
                <span key={pid} style={{ fontSize: 12, padding: '3px 10px', border: '1px solid var(--grey-200)', color: 'var(--grey-500)' }}>{getName(pid)}</span>
              ))}
            </div>
          )}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {activeRound.courts.map(court => {
              const key = `${activeRound.num}-${court.courtNum}`;
              const isDone = court.status === 'completed';
              const inputs = scoreInputs[key] ?? { p1: '', p2: '' };
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

      {/* Next round button */}
      {isLive && roundBased && activeRoundComplete && !gameComplete && (
        <div style={{ marginBottom: 32, padding: '24px', background: 'rgba(40,167,69,0.06)', border: '1px solid rgba(40,167,69,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap' }}>
          <div>
            <div style={{ fontFamily: 'var(--font-display)', fontSize: 15, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '-0.01em', marginBottom: 4 }}>
              Ronda {activeRound?.num} completada
            </div>
            <div style={{ fontSize: 13, color: 'var(--grey-400)' }}>Todos los scores registrados.</div>
          </div>
          {hasMoreRounds && (
            <button onClick={handleNextRound} style={{ padding: '12px 28px', background: 'var(--turf-green)', color: '#fff', border: 'none', cursor: 'pointer', fontSize: 13, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em' }}>
              Siguiente Ronda →
            </button>
          )}
        </div>
      )}

      {/* ── KNOCKOUT BRACKET ──────────────────────────────────────────────── */}
      {isLive && !roundBased && game.bracket && (
        <div style={{ marginBottom: 36 }}>
          <div style={secTitle}>Cuadro Eliminatorio</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 28 }}>
            {game.bracket.rounds.map((bracketRound, ri) => (
              <div key={ri}>
                <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'var(--grey-500)', marginBottom: 12 }}>
                  {bracketRound.name}
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {bracketRound.matches.map((match, mi) => {
                    const bKey = `${ri}-${mi}`;
                    const bInputs = bracketInputs[bKey] ?? { p1: '', p2: '' };
                    const isDone = match.status === 'completed';
                    const canEnterScore = !isDone && match.pair1 && match.pair2 && match.pair1.length > 0 && match.pair2.length > 0;
                    const p1Names = (match.pair1 ?? []).map(pid => getName(pid)).join(' / ') || '–';
                    const p2Names = (match.pair2 ?? []).map(pid => getName(pid)).join(' / ') || '–';
                    const isBye = !match.pair1 || !match.pair2 || p1Names === 'BYE' || p2Names === 'BYE';

                    if (isBye && isDone) return null; // skip auto-completed bye matches

                    return (
                      <div key={mi} style={{ background: '#fff', border: `2px solid ${isDone ? 'var(--grey-200)' : canEnterScore ? 'var(--turf-green)' : 'var(--grey-200)'}`, padding: '18px 22px' }}>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr auto 1fr', alignItems: 'center', gap: 14, marginBottom: canEnterScore ? 14 : 0 }}>
                          <div>
                            <div style={{ fontSize: 13, fontWeight: isDone && match.winner && match.winner[0] === (match.pair1 ?? [])[0] ? 700 : 500 }}>{p1Names}</div>
                          </div>
                          <div style={{ textAlign: 'center' }}>
                            {isDone ? (
                              <div style={{ fontFamily: 'var(--font-display)', fontSize: 26, fontWeight: 700 }}>
                                <span style={{ color: (match.pair1Score ?? 0) > (match.pair2Score ?? 0) ? 'var(--turf-green)' : 'var(--grey-400)' }}>{match.pair1Score}</span>
                                <span style={{ color: 'var(--grey-300)', margin: '0 5px' }}>–</span>
                                <span style={{ color: (match.pair2Score ?? 0) > (match.pair1Score ?? 0) ? 'var(--turf-green)' : 'var(--grey-400)' }}>{match.pair2Score}</span>
                              </div>
                            ) : (
                              <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--grey-300)' }}>VS</span>
                            )}
                          </div>
                          <div style={{ textAlign: 'right' }}>
                            <div style={{ fontSize: 13, fontWeight: isDone && match.winner && match.winner[0] === (match.pair2 ?? [])[0] ? 700 : 500 }}>{p2Names}</div>
                          </div>
                        </div>

                        {canEnterScore && (
                          <div style={{ borderTop: '1px solid var(--grey-100)', paddingTop: 12, display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                            <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--grey-400)', textTransform: 'uppercase', letterSpacing: '0.08em', flexShrink: 0 }}>Score:</span>
                            <input type="number" min={0} value={bInputs.p1} onChange={e => setBracketInputs(prev => ({ ...prev, [bKey]: { ...(prev[bKey] ?? { p1: '', p2: '' }), p1: e.target.value } }))} placeholder="0" style={inp} />
                            <span style={{ color: 'var(--grey-400)', fontWeight: 700 }}>–</span>
                            <input type="number" min={0} value={bInputs.p2} onChange={e => setBracketInputs(prev => ({ ...prev, [bKey]: { ...(prev[bKey] ?? { p1: '', p2: '' }), p2: e.target.value } }))} placeholder="0" style={inp} />
                            <button onClick={() => handleBracketRegister(ri, mi)} disabled={bInputs.p1 === bInputs.p2 && bInputs.p1 !== ''} style={{ padding: '9px 20px', background: 'var(--black)', color: '#fff', border: 'none', cursor: 'pointer', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                              Registrar
                            </button>
                          </div>
                        )}

                        {isDone && (
                          <div style={{ fontSize: 11, color: 'var(--grey-400)', marginTop: 8 }}>
                            Pasa: <strong>{(match.winner ?? []).map(pid => getName(pid)).join(' / ')}</strong>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Standings (round-based) */}
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
                const isCreator = game.players.find(p => p.id === s.playerId)?.isCreator ?? false;
                return (
                  <tr key={s.playerId} style={{ borderBottom: '1px solid var(--grey-100)', background: isCreator ? 'rgba(214,255,0,0.05)' : i % 2 === 0 ? '#fff' : 'var(--grey-50)' }}>
                    <td style={{ padding: '12px 14px', textAlign: 'center', fontFamily: 'var(--font-display)', fontSize: 18, fontWeight: 700, color: i === 0 ? 'var(--neon)' : 'var(--grey-300)' }}>{i + 1}</td>
                    <td style={{ padding: '12px 14px' }}>
                      <span style={{ fontSize: 13, fontWeight: isCreator ? 700 : 500 }}>{s.playerName}</span>
                      {isCreator && <span style={{ marginLeft: 8, fontSize: 9, background: 'var(--neon)', color: 'var(--black)', padding: '2px 6px', fontWeight: 700, verticalAlign: 'middle' }}>TÚ</span>}
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
                <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--grey-500)', marginBottom: 8 }}>Ronda {round.num}</div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  {round.courts.map(court => (
                    <div key={court.courtNum} style={{ background: '#fff', border: '1px solid var(--grey-200)', padding: '14px 20px', display: 'grid', gridTemplateColumns: '1fr auto 1fr', alignItems: 'center', gap: 12 }}>
                      <div>{court.pair1.map(pid => <div key={pid} style={{ fontSize: 12, fontWeight: 600 }}>{getName(pid)}</div>)}</div>
                      <div style={{ textAlign: 'center' }}>
                        <span style={{ fontFamily: 'var(--font-display)', fontSize: 22, fontWeight: 700 }}>
                          <span style={{ color: (court.pair1Score ?? 0) > (court.pair2Score ?? 0) ? 'var(--turf-green)' : 'var(--grey-400)' }}>{court.pair1Score}</span>
                          <span style={{ color: 'var(--grey-300)', margin: '0 4px' }}>–</span>
                          <span style={{ color: (court.pair2Score ?? 0) > (court.pair1Score ?? 0) ? 'var(--turf-green)' : 'var(--grey-400)' }}>{court.pair2Score}</span>
                        </span>
                        <div style={{ fontSize: 9, color: 'var(--grey-300)', marginTop: 2, letterSpacing: '0.08em' }}>CANCHA {court.courtNum}</div>
                      </div>
                      <div style={{ textAlign: 'right' }}>{court.pair2.map(pid => <div key={pid} style={{ fontSize: 12, fontWeight: 600 }}>{getName(pid)}</div>)}</div>
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
