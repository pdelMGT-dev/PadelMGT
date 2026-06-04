'use client';

import React from 'react';
import Link from 'next/link';
import { use, useEffect, useMemo, useState, useCallback } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import {
  getGame,
  saveGame,
  updateMatchScore as engineUpdateScore,
  startGame as engineStartGame,
  startNextRound as engineStartNextRound,
  isGameFinished,
  calculateStandings,
} from '@/lib/game-store';
import { isRoundComplete } from '@/lib/game-engine';
import type { ActiveGame, GamePlayer, InvitedPlayer, FixedPair, ScoreConfig } from '@/lib/game-engine';
import {
  getInvitationsForGame,
  createInvitation,
  deleteInvitationsForGame,
} from '@/lib/invitation-store';
import { searchPlayers, addFriendship, areFriends, getFriendsForPlayer } from '@/lib/player-store';
import type { RegisteredPlayer } from '@/lib/player-store';
import { applyGameRankingResults, getRankingHistoryForGame } from '@/lib/ranking-store';
import type { RankingEntry } from '@/lib/ranking-store';
import { loadJoinRequests, approveJoinRequest, rejectJoinRequest, type JoinRequest } from '@/lib/join-request-store';
import { useCurrentUser } from '@/hooks/useCurrentUser';

// ── Helpers ───────────────────────────────────────────────────────────────────

type CurrentUser = { id: string; name: string; email: string; shortId: string; role: string; sub: string };

function initials(name: string) {
  return name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();
}

const STATUS_INFO: Record<string, { label: string; color: string; bg: string }> = {
  created:       { label: 'Creado',       color: '#7c3aed', bg: '#f3e8ff' },
  starting_soon: { label: 'Por Empezar',  color: '#b45309', bg: '#fef3c7' },
  live:          { label: 'En Vivo',      color: 'var(--turf-green)', bg: '#dcfce7' },
  finished:      { label: 'Finalizado',   color: 'var(--grey-400)', bg: 'var(--grey-100)' },
  cancelled:     { label: 'Cancelado',    color: '#ee0005', bg: '#fee2e2' },
};

function scoreConfigLabel(cfg: ScoreConfig): string {
  if (cfg.type === 'points') return `Por Puntos · ${cfg.target} pts`;
  return `Tradicional · ${cfg.setsPerMatch ?? 3} sets`;
}

const secTitle: React.CSSProperties = {
  fontSize: 9, letterSpacing: '0.18em', textTransform: 'uppercase', fontWeight: 700,
  color: 'var(--grey-400)', marginBottom: 16, paddingBottom: 10,
  borderBottom: '1px solid var(--grey-100)',
};

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

function statusBadge(status: string) {
  const info = STATUS_INFO[status] ?? STATUS_INFO.created;
  return (
    <span style={{
      fontSize: 9, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase',
      padding: '3px 8px', background: info.bg, color: info.color,
    }}>
      {info.label}
    </span>
  );
}

function invStatusBadge(status: InvitedPlayer['status']) {
  const map: Record<string, { label: string; color: string; bg: string }> = {
    pending:   { label: 'Pendiente',   color: '#b45309', bg: '#fef3c7' },
    accepted:  { label: 'Aceptado',    color: '#166534', bg: '#dcfce7' },
    rejected:  { label: 'Rechazado',   color: '#ee0005', bg: '#fee2e2' },
    cancelled: { label: 'Cancelado',   color: 'var(--grey-400)', bg: 'var(--grey-100)' },
  };
  const m = map[status] ?? map.pending;
  return (
    <span style={{
      fontSize: 9, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase',
      padding: '3px 8px', background: m.bg, color: m.color,
    }}>
      {m.label}
    </span>
  );
}

// ── Pair standings helper ─────────────────────────────────────────────────────

function computePairStandings(game: ActiveGame, isPointsMode: boolean) {
  if (!game.fixedPairs || game.fixedPairs.length === 0) return [];
  return game.fixedPairs.map(pair => {
    // Both players in a pair always have identical stats; use either one
    const s = game.standings.find(st => st.playerId === pair.player1Id)
           ?? game.standings.find(st => st.playerId === pair.player2Id);
    if (!s) return { pair, pts: 0, wins: 0, losses: 0, draws: 0, played: 0, diff: 0, ptsW: 0, ptsL: 0 };
    if (isPointsMode) {
      const ptsW = s.pointsFor;
      const ptsL = -s.pointsAgainst;
      const diff = s.diff;
      return { pair, pts: diff, wins: s.wins, losses: s.losses, draws: s.draws, played: s.played, diff, ptsW, ptsL };
    } else {
      const setsWon = s.pointsFor;
      const setsLost = s.pointsAgainst;
      const ptsW = setsWon * 3;
      const ptsL = -setsLost;
      const diff = ptsW + ptsL;
      return { pair, pts: diff, wins: setsWon, losses: setsLost, draws: 0, played: setsWon + setsLost, diff, ptsW, ptsL };
    }
  }).sort((a, b) => b.pts - a.pts || b.diff - a.diff);
}

function getPositions(standings: { wins: number; losses: number; draws: number; played: number; diff: number; pointsFor: number; pointsAgainst: number }[], isPointsMode: boolean): number[] {
  const positions: number[] = [];
  let currentPos = 1;
  for (let i = 0; i < standings.length; i++) {
    if (i === 0) { positions.push(1); continue; }
    const curr = getDisplayStats(standings[i], isPointsMode);
    const prev = getDisplayStats(standings[i - 1], isPointsMode);
    const tied = curr.w === prev.w && curr.l === prev.l && curr.t === prev.t && curr.diff === prev.diff;
    if (!tied) currentPos = i + 1;
    positions.push(currentPos);
  }
  return positions;
}

function posMedal(pos: number): string {
  if (pos === 1) return '🥇';
  if (pos === 2) return '🥈';
  if (pos === 3) return '🥉';
  return String(pos);
}

function getDisplayStats(s: { wins: number; losses: number; draws: number; played: number; diff: number; pointsFor: number; pointsAgainst: number }, isPointsMode: boolean) {
  if (isPointsMode) {
    return {
      pj: s.played,
      w: s.wins,
      l: s.losses,
      t: s.draws,
      ptsW: s.pointsFor,
      ptsL: -s.pointsAgainst,
      diff: s.diff,
    };
  } else {
    const setsWon = s.pointsFor;
    const setsLost = s.pointsAgainst;
    const ptsW = setsWon * 3;
    const ptsL = -setsLost;
    return {
      pj: setsWon + setsLost,
      w: setsWon,
      l: setsLost,
      t: 0,
      ptsW,
      ptsL,
      diff: ptsW + ptsL,
    };
  }
}

// ── Component ─────────────────────────────────────────────────────────────────

export default function QuickGameDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);

  const [game, setGame] = useState<ActiveGame | null>(() => {
    if (typeof window === 'undefined') return null;
    return getGame(id);
  });

  const { user: currentUser } = useCurrentUser();
  const [toast, setToast] = useState<string | null>(null);
  const [shareUrl, setShareUrl] = useState('');
  const [showQR, setShowQR] = useState(false);
  const [rankingEntries, setRankingEntries] = useState<RankingEntry[]>([]);
  const [joinRequests, setJoinRequests] = useState<JoinRequest[]>([]);

  // Edit state
  const [editOpen, setEditOpen] = useState(false);
  const [editName, setEditName] = useState('');
  const [editDate, setEditDate] = useState('');
  const [editTime, setEditTime] = useState('');
  const [editClub, setEditClub] = useState('');
  const [editCity, setEditCity] = useState('');

  // Cancel confirm modal
  const [showCancelModal, setShowCancelModal] = useState(false);

  // Add/replace player modal
  const [showAddModal, setShowAddModal] = useState(false);
  const [replaceTargetId, setReplaceTargetId] = useState<string | null>(null);
  const [playerSearchQ, setPlayerSearchQ] = useState('');
  const [playerSearchResults, setPlayerSearchResults] = useState<RegisteredPlayer[]>([]);
  const [addTab, setAddTab] = useState<'friends' | 'search'>('friends');
  const [friendList, setFriendList] = useState<RegisteredPlayer[]>([]);

  const [roundHistOpen, setRoundHistOpen] = useState<Record<number, boolean>>({});

  // Score inputs (points mode): key = `${roundNum}-${courtNum}`
  const [scoreInputs, setScoreInputs] = useState<Record<string, { p1: string; p2: string }>>({});
  // Per-set score inputs for traditional mode: key = `${roundNum}-${courtNum}`
  const [setInputs, setSetInputs] = useState<Record<string, Array<{ p1: string; p2: string }>>>({});

  // Provisional player input
  const [provName, setProvName] = useState('');
  const [showProvInput, setShowProvInput] = useState(false);

  // Fixed pairs assignment (parejas mode)
  const [pairAssignments, setPairAssignments] = useState<FixedPair[]>([]);
  const [pairsLocked, setPairsLocked] = useState(false);

  // Drag & drop state for pair builder
  // slot key format: 'pool' | 'pair-{idx}-{1|2}'
  const [dragId, setDragId]       = useState<string | null>(null);
  const [dragSource, setDragSource] = useState<string | null>(null);
  const [dropOver, setDropOver]   = useState<string | null>(null);

  // ── User loaded via useCurrentUser hook ──────────────────────────────────

  // Load game
  useEffect(() => {
    const g = game ?? getGame(id);
    if (!game) setGame(g);
    if (g) setJoinRequests(loadJoinRequests().filter(r => r.entityId === g.id && r.status === 'pending'));
  }, [id, game]);

  // Poll for invitation responses every 5s (creator sees status updates)
  const refreshGame = useCallback(() => {
    const fresh = getGame(id);
    if (fresh) {
      setGame(fresh);
      setJoinRequests(loadJoinRequests().filter(r => r.entityId === fresh.id && r.status === 'pending'));
    }
  }, [id]);

  useEffect(() => {
    const interval = setInterval(refreshGame, 5000);
    return () => clearInterval(interval);
  }, [refreshGame]);

  // Sync shareUrl — embed compact snapshot so other devices can render the page
  useEffect(() => {
    if (!game?.code) return;
    try {
      const snap = {
        id:  game.id,
        n:   game.name,
        cl:  game.club  || '',
        ci:  game.city  || '',
        co:  game.country || '',
        st:  game.status,
        p:   game.players.length,
        mp:  game.maxPlayers,
        fmt: game.format   || 'americano',
        pt:  game.pairType || 'individual',
        lv:  game.levelLabel || '',
      };
      const encoded = btoa(unescape(encodeURIComponent(JSON.stringify(snap))));
      setShareUrl(`${window.location.origin}/quick-game/${game.code}?s=${encoded}`);
    } catch {
      setShareUrl(`${window.location.origin}/quick-game/${game.code}`);
    }
  }, [game?.code, game?.status, game?.players.length]);

  // Init edit fields
  useEffect(() => {
    if (!game) return;
    setEditName(game.name);
    setEditDate(game.date);
    setEditTime(game.time);
    setEditClub(game.club);
    setEditCity(game.city);
  }, [game?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  // Init pair assignments from game.fixedPairs
  useEffect(() => {
    if (!game) return;
    if (game.fixedPairs && game.fixedPairs.length > 0) {
      setPairAssignments(game.fixedPairs);
      setPairsLocked(true);
    } else {
      const numPairs = Math.floor(game.maxPlayers / 2);
      const confirmedPlayers = getConfirmedPlayers(game);
      const assignments: FixedPair[] = Array.from({ length: numPairs }, (_, i) => {
        const existing = game.fixedPairs?.[i];
        return existing ?? {
          pairIndex: i,
          player1Id: confirmedPlayers[i * 2]?.id ?? '',
          player2Id: confirmedPlayers[i * 2 + 1]?.id ?? '',
          player1Name: confirmedPlayers[i * 2]?.name ?? '',
          player2Name: confirmedPlayers[i * 2 + 1]?.name ?? '',
        };
      });
      setPairAssignments(assignments);
    }
  }, [game?.id, game?.players?.length]); // eslint-disable-line react-hooks/exhaustive-deps

  // Load ranking entries for finished game
  useEffect(() => {
    if (game?.status === 'finished') {
      setRankingEntries(getRankingHistoryForGame(game.id));
    }
  }, [game?.status, game?.id]);

  // Load friends when add modal opens
  useEffect(() => {
    if (showAddModal && currentUser) {
      const alreadyIn = game?.players.map(p => p.id) ?? [];
      const alreadyInvited = game?.invitedPlayers.filter(ip => ip.status === 'pending').map(ip => ip.id) ?? [];
      const exclude = new Set([...alreadyIn, ...alreadyInvited]);
      setFriendList(getFriendsForPlayer(currentUser.id).filter(f => !exclude.has(f.id)));
    }
  }, [showAddModal, currentUser, game?.players, game?.invitedPlayers]);

  // Search players for invitation modal
  useEffect(() => {
    if (!playerSearchQ.trim()) {
      setPlayerSearchResults([]);
      return;
    }
    const results = searchPlayers(playerSearchQ);
    const alreadyIn = game?.players.map(p => p.id) ?? [];
    const alreadyInvited = game?.invitedPlayers.filter(ip => ip.status !== 'cancelled').map(ip => ip.id) ?? [];
    setPlayerSearchResults(
      results.filter(r => !alreadyIn.includes(r.id) && !alreadyInvited.includes(r.id)).slice(0, 8)
    );
  }, [playerSearchQ, game?.players, game?.invitedPlayers]);

  function showToast(msg: string) {
    setToast(msg);
    setTimeout(() => setToast(null), 3500);
  }

  if (!game) {
    return (
      <div style={{ padding: '40px', textAlign: 'center' }}>
        <p style={{ color: 'var(--grey-400)', marginBottom: 16 }}>Juego no encontrado.</p>
        <Link href="/dashboard/player/quick-game" style={{ fontSize: 13, color: 'var(--black)', fontWeight: 600 }}>← Mis Juegos Rápidos</Link>
      </div>
    );
  }

  // ── Role detection ────────────────────────────────────────────────────────

  const isCreator = !!(currentUser && (
    currentUser.id === game.creatorId || game.isCreator
  ));
  const isCoCreator = !!(currentUser && game.coCreatorIds?.includes(currentUser.id));
  const canManage = isCreator || isCoCreator;

  // ── Derived state ─────────────────────────────────────────────────────────

  const si = STATUS_INFO[game.status] ?? STATUS_INFO.created;
  const isLive     = game.status === 'live';
  const isFinished = game.status === 'finished';
  const isCancelled = game.status === 'cancelled' as string;
  const isPending  = game.status === 'created' || game.status === 'starting_soon';

  const confirmedCount = game.players.length;
  const allConfirmed   = confirmedCount === game.maxPlayers;

  function getConfirmedPlayers(g: ActiveGame): GamePlayer[] {
    return g.players;
  }

  const pairsFullyAssigned = useMemo(() => {
    if (game.pairType !== 'parejas') return true;
    const usedIds = new Set<string>();
    for (const pa of pairAssignments) {
      if (!pa.player1Id || !pa.player2Id) return false;
      if (usedIds.has(pa.player1Id) || usedIds.has(pa.player2Id)) return false;
      usedIds.add(pa.player1Id);
      usedIds.add(pa.player2Id);
    }
    return usedIds.size === game.maxPlayers;
  }, [pairAssignments, game.pairType, game.maxPlayers]);

  const canStart = isPending && allConfirmed && (game.pairType !== 'parejas' || (pairsFullyAssigned && pairsLocked));

  const currentRound = game.rounds.find(r => r.num === game.currentRound) ?? null;
  const currentRoundComplete = currentRound ? isRoundComplete(currentRound) : false;
  const gameComplete = isGameFinished(game);

  const hasMoreRounds = !gameComplete && currentRoundComplete && (
    game.format === 'mexicano' ||
    game.rounds.some(r => r.num > game.currentRound && r.status === 'pending')
  );

  const isPointsMode = game.scoreConfig.type === 'points';
  const ptTarget = isPointsMode ? (game.scoreConfig.target ?? 24) : null;

  // ── Actions ───────────────────────────────────────────────────────────────

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

  function handleCancelGame() {
    if (!game) return;
    const updated: ActiveGame = {
      ...game,
      status: 'cancelled' as ActiveGame['status'],
      cancelledAt: new Date().toISOString(),
    };
    // Update all pending invitations to cancelled
    const invitations = getInvitationsForGame(game.id);
    for (const inv of invitations) {
      if (inv.status === 'pending') {
        // Mark cancelled in invitation store
        const { respondToInvitation } = require('@/lib/invitation-store');
        respondToInvitation(inv.id, 'rejected');
      }
    }
    // Mark all invited players as cancelled
    const updatedInvited = (game.invitedPlayers ?? []).map(ip =>
      ip.status === 'pending' ? { ...ip, status: 'cancelled' as const } : ip
    );
    saveGame({ ...updated, invitedPlayers: updatedInvited });
    setGame({ ...updated, invitedPlayers: updatedInvited });
    setShowCancelModal(false);
    showToast('Juego cancelado.');
  }

  function handleRemoveInvited(invitedId: string) {
    if (!game) return;
    const updatedInvited = (game.invitedPlayers ?? []).map(ip =>
      ip.id === invitedId ? { ...ip, status: 'cancelled' as const } : ip
    );
    const updatedPlayers = game.players.filter(p => p.id !== invitedId);
    const updatedGame = { ...game, invitedPlayers: updatedInvited, players: updatedPlayers };
    saveGame(updatedGame);
    setGame(updatedGame);
    showToast('Jugador quitado — slot liberado.');
  }

  function handleCreatorLeaveAsPlayer() {
    if (!game || !currentUser || currentUser.id !== game.creatorId) return;
    const updatedGame = { ...game, players: game.players.filter(p => p.id !== game.creatorId) };
    saveGame(updatedGame);
    setGame(updatedGame);
    showToast('Ahora solo organizás el juego.');
  }

  function handleCreatorJoinAsPlayer() {
    if (!game || !currentUser || currentUser.id !== game.creatorId) return;
    if (game.players.some(p => p.id === currentUser.id)) return;
    const creatorPlayer: import('@/lib/game-engine').GamePlayer = {
      id: currentUser.id,
      name: currentUser.name,
      email: currentUser.email,
      ranking: currentUser.rankingPoints ?? currentUser.ranking ?? 0,
      isCreator: true,
    };
    const updatedGame = { ...game, players: [creatorPlayer, ...game.players] };
    saveGame(updatedGame);
    setGame(updatedGame);
    showToast('Te uniste como jugador.');
  }

  function handleInvitePlayer(player: RegisteredPlayer) {
    if (!game || !currentUser) return;
    if (replaceTargetId) {
      // Replace mode: cancel old invitation, create new
      const updatedInvited = game.invitedPlayers.map(ip =>
        ip.id === replaceTargetId ? { ...ip, status: 'cancelled' as const } : ip
      );
      const newEntry: InvitedPlayer = {
        id: player.id,
        name: player.name,
        email: player.email,
        shortId: player.shortId,
        ranking: player.rankingPoints ?? 1000,
        status: 'pending',
        invitedAt: new Date().toISOString(),
        isFriend: areFriends(currentUser.id, player.id),
      };
      const updatedGame = { ...game, invitedPlayers: [...updatedInvited, newEntry] };
      saveGame(updatedGame);
      setGame(updatedGame);
      createInvitation({
        gameId: game.id,
        gameName: game.name,
        gameDate: game.date,
        gameTime: game.time,
        gameClub: game.club,
        gameCity: game.city,
        fromPlayerId: currentUser.id,
        fromPlayerName: currentUser.name,
        toPlayerId: player.id,
        toPlayerName: player.name,
        toPlayerEmail: player.email,
      });
      setReplaceTargetId(null);
      showToast(`Invitación enviada a ${player.name}`);
    } else {
      // Add new invitation
      const newEntry: InvitedPlayer = {
        id: player.id,
        name: player.name,
        email: player.email,
        shortId: player.shortId,
        ranking: player.rankingPoints ?? 1000,
        status: 'pending',
        invitedAt: new Date().toISOString(),
        isFriend: areFriends(currentUser.id, player.id),
      };
      const updatedGame = { ...game, invitedPlayers: [...(game.invitedPlayers ?? []), newEntry] };
      saveGame(updatedGame);
      setGame(updatedGame);
      createInvitation({
        gameId: game.id,
        gameName: game.name,
        gameDate: game.date,
        gameTime: game.time,
        gameClub: game.club,
        gameCity: game.city,
        fromPlayerId: currentUser.id,
        fromPlayerName: currentUser.name,
        toPlayerId: player.id,
        toPlayerName: player.name,
        toPlayerEmail: player.email,
      });
      showToast(`Invitación enviada a ${player.name}`);
    }
    setShowAddModal(false);
    setPlayerSearchQ('');
    setPlayerSearchResults([]);
  }

  function handleToggleCoCreator(playerId: string) {
    if (!game || !isCreator) return;
    const current = game.coCreatorIds ?? [];
    const updated = current.includes(playerId)
      ? current.filter(id => id !== playerId)
      : [...current, playerId];
    const updatedGame = { ...game, coCreatorIds: updated };
    saveGame(updatedGame);
    setGame(updatedGame);
    showToast(updated.includes(playerId) ? 'Co-Creador asignado.' : 'Co-Creador removido.');
  }

  function handleAddProvisional(name: string) {
    if (!game || !name.trim()) return;
    const provId = `prov-${Date.now()}`;
    const newPlayer: GamePlayer = { id: provId, name: name.trim(), ranking: 0, isCreator: false };
    const provEntry: InvitedPlayer = {
      id: provId,
      name: name.trim(),
      ranking: 0,
      status: 'accepted',
      invitedAt: new Date().toISOString(),
      isFriend: false,
      isProvisional: true,
    };
    const updatedGame = {
      ...game,
      players: [...game.players, newPlayer],
      invitedPlayers: [...(game.invitedPlayers ?? []), provEntry],
    };
    saveGame(updatedGame);
    setGame(updatedGame);
    showToast(`"${name.trim()}" agregado como jugador provisional.`);
  }

  function handleStartGame() {
    if (!game) return;
    let gameToStart = game;
    if (game.pairType === 'parejas' && pairsFullyAssigned) {
      // Build players list ordered by pairs for fixed pair rounds
      const orderedPlayers: GamePlayer[] = [];
      for (const pa of pairAssignments) {
        const p1 = game.players.find(p => p.id === pa.player1Id);
        const p2 = game.players.find(p => p.id === pa.player2Id);
        if (p1) orderedPlayers.push(p1);
        if (p2) orderedPlayers.push(p2);
      }
      const updatedFixedPairs = pairAssignments;
      gameToStart = { ...game, players: orderedPlayers, fixedPairs: updatedFixedPairs };
    }
    const started = engineStartGame(gameToStart);
    saveGame(started);
    setGame(started);
    showToast('¡Juego iniciado!');
  }

  function handleRegisterScore(roundNum: number, courtNum: number) {
    if (!game) return;
    const key = `${roundNum}-${courtNum}`;
    const raw = scoreInputs[key] ?? { p1: '', p2: '' };
    const p1 = Math.max(0, parseInt(raw.p1 || '0', 10));
    const p2 = Math.max(0, parseInt(raw.p2 || '0', 10));
    const sets = !isPointsMode
      ? (setInputs[key] ?? [])
          .map(s => ({ p1: parseInt(s.p1 || '0', 10), p2: parseInt(s.p2 || '0', 10) }))
          .filter(s => !isNaN(s.p1) && !isNaN(s.p2) && (s.p1 > 0 || s.p2 > 0))
      : undefined;
    const updated = engineUpdateScore(game, roundNum, courtNum, p1, p2, sets);
    saveGame(updated);
    setGame(updated);
    setScoreInputs(prev => { const n = { ...prev }; delete n[key]; return n; });
    setSetInputs(prev => { const n = { ...prev }; delete n[key]; return n; });
    const round = updated.rounds.find(r => r.num === roundNum);
    if (round && isRoundComplete(round)) {
      if (isGameFinished(updated)) showToast('¡Ronda completa! Podés finalizar el juego.');
      else showToast('Ronda completa — podés continuar la siguiente.');
    }
  }

  function handleNextRound() {
    if (!game) return;
    const next = engineStartNextRound(game);
    saveGame(next);
    setGame(next);
    setScoreInputs({});
    setSetInputs({});
    showToast(`Ronda ${next.currentRound} iniciada`);
  }

  function handleLeaveGame() {
    if (!game || !currentUser) return;
    const updatedPlayers = game.players.filter(p => p.id !== currentUser.id);
    const updatedGame: ActiveGame = { ...game, players: updatedPlayers };
    saveGame(updatedGame);
    setGame(updatedGame);
    showToast('Te saliste del juego como jugador. Seguís siendo el administrador.');
  }

  function handleJoinGame() {
    if (!game || !currentUser) return;
    if (game.players.length >= game.maxPlayers) {
      showToast('El juego ya está completo — no hay slots disponibles.');
      return;
    }
    if (game.players.some(p => p.id === currentUser.id)) return;
    const newPlayer: GamePlayer = {
      id: currentUser.id,
      name: currentUser.name,
      ranking: 1000,
      isCreator: true,
    };
    const updatedGame: ActiveGame = { ...game, players: [...game.players, newPlayer] };
    saveGame(updatedGame);
    setGame(updatedGame);
    showToast('Te uniste al juego como jugador.');
  }

  function handleFinishGame() {
    if (!game) return;
    const standings = calculateStandings(game);
    const finished: ActiveGame = { ...game, status: 'finished', standings };
    saveGame(finished);
    const entries = applyGameRankingResults(finished);
    setGame(finished);
    setRankingEntries(entries);
    showToast('¡Juego finalizado! Ranking actualizado.');
  }

  function handleApproveRequest(req: JoinRequest) {
    if (!game) return;
    const newPlayer: GamePlayer = {
      id: req.playerId,
      name: req.playerName,
      email: req.playerEmail,
      ranking: 999,
      isCreator: false,
    };
    const updated: ActiveGame = {
      ...game,
      players: [...game.players, newPlayer],
    };
    saveGame(updated);
    setGame(updated);
    approveJoinRequest(req.id);
    setJoinRequests(prev => prev.filter(r => r.id !== req.id));
  }

  function handleRejectRequest(req: JoinRequest) {
    rejectJoinRequest(req.id);
    setJoinRequests(prev => prev.filter(r => r.id !== req.id));
  }

  function handleP1Change(key: string, val: string) {
    setScoreInputs(prev => {
      const current = prev[key] ?? { p1: '', p2: '' };
      if (isPointsMode && ptTarget !== null) {
        const n = parseInt(val, 10);
        if (isNaN(n) || n < 0) return { ...prev, [key]: { ...current, p1: val } };
        const clamped = Math.min(n, ptTarget);
        return { ...prev, [key]: { p1: String(clamped), p2: String(ptTarget - clamped) } };
      }
      return { ...prev, [key]: { ...current, p1: val } };
    });
  }

  function handleP2Change(key: string, val: string) {
    setScoreInputs(prev => {
      const current = prev[key] ?? { p1: '', p2: '' };
      if (isPointsMode && ptTarget !== null) {
        const n = parseInt(val, 10);
        if (isNaN(n) || n < 0) return { ...prev, [key]: { ...current, p2: val } };
        const clamped = Math.min(n, ptTarget);
        return { ...prev, [key]: { p1: String(ptTarget - clamped), p2: String(clamped) } };
      }
      return { ...prev, [key]: { ...current, p2: val } };
    });
  }

  function handleSetChange(key: string, setIdx: number, side: 'p1' | 'p2', val: string, numSets: number) {
    setSetInputs(prev => {
      const current = prev[key] ?? Array.from({ length: numSets }, () => ({ p1: '', p2: '' }));
      const updated = current.map((s, i) => i === setIdx ? { ...s, [side]: val } : s);
      // compute sets won and sync to scoreInputs
      let w1 = 0, w2 = 0;
      for (const s of updated) {
        const a = parseInt(s.p1 || '0', 10), b = parseInt(s.p2 || '0', 10);
        if (!isNaN(a) && !isNaN(b) && (s.p1 !== '' || s.p2 !== '')) {
          if (a > b) w1++; else if (b > a) w2++;
        }
      }
      setScoreInputs(si => ({ ...si, [key]: { p1: String(w1), p2: String(w2) } }));
      return { ...prev, [key]: updated };
    });
  }

  function getName(pid: string) {
    return game?.players.find(p => p.id === pid)?.name ?? pid;
  }

  function getPairNames(pids: string[]) {
    return pids.map(pid => getName(pid).split(' ')[0]).join(' / ');
  }

  function updatePairAssignment(idx: number, field: 'player1Id' | 'player2Id', playerId: string) {
    const player = game?.players.find(p => p.id === playerId);
    setPairAssignments(prev => prev.map((pa, i) => {
      if (i !== idx) return pa;
      if (field === 'player1Id') {
        return { ...pa, player1Id: playerId, player1Name: player?.name ?? '' };
      }
      return { ...pa, player2Id: playerId, player2Name: player?.name ?? '' };
    }));
  }

  function handleSavePairs() {
    if (!game) return;
    const updated: ActiveGame = { ...game, fixedPairs: pairAssignments };
    saveGame(updated);
    setGame(updated);
    setPairsLocked(true);
    showToast('Parejas guardadas.');
  }

  // ── Drag & Drop for pair builder ──────────────────────────────────────────

  function handlePairDrop(targetKey: string) {
    if (!dragId || !dragSource || !game) return;
    const player = game.players.find(p => p.id === dragId);
    if (!player) return;

    function slotFields(key: string): { idx: number; field: 'player1Id' | 'player2Id'; nameField: 'player1Name' | 'player2Name' } | null {
      const m = key.match(/^pair-(\d+)-(1|2)$/);
      if (!m) return null;
      const slot = parseInt(m[2], 10) as 1 | 2;
      return { idx: parseInt(m[1], 10), field: slot === 1 ? 'player1Id' : 'player2Id', nameField: slot === 1 ? 'player1Name' : 'player2Name' };
    }

    setPairAssignments(prev => {
      let next = prev.map(pa => ({ ...pa }));

      // 1. Find what's currently in the target slot (to displace)
      const tgt = slotFields(targetKey);
      const displaced = tgt ? (next[tgt.idx]?.[tgt.field] ?? '') : '';

      // 2. Remove dragged player from source
      const src = slotFields(dragSource);
      if (src && next[src.idx]) {
        next[src.idx] = { ...next[src.idx], [src.field]: '', [src.nameField]: '' };
      }

      // 3. Place dragged player in target slot
      if (tgt && next[tgt.idx]) {
        next[tgt.idx] = { ...next[tgt.idx], [tgt.field]: player.id, [tgt.nameField]: player.name };
      }

      // 4. If target had someone and source was a slot → put displaced player in source slot
      if (displaced && src && next[src.idx]) {
        const displacedPlayer = game.players.find(p => p.id === displaced);
        if (displacedPlayer) {
          next[src.idx] = { ...next[src.idx], [src.field]: displacedPlayer.id, [src.nameField]: displacedPlayer.name };
        }
      }

      return next;
    });

    setDragId(null);
    setDragSource(null);
    setDropOver(null);
  }

  // Build auto-preview for individual mode (best + worst pairing)
  const autoPreviewPairs = useMemo(() => {
    if (game.pairType !== 'individual' || game.players.length < 4) return [];
    const sorted = [...game.players].sort((a, b) => b.ranking - a.ranking);
    const pairs: [GamePlayer, GamePlayer][] = [];
    let lo = sorted.length - 1;
    for (let hi = 0; hi < Math.floor(sorted.length / 2); hi++, lo--) {
      pairs.push([sorted[hi], sorted[lo]]);
    }
    return pairs;
  }, [game.players, game.pairType]);

  // ── Render helpers ────────────────────────────────────────────────────────

  const cardStyle: React.CSSProperties = {
    background: '#fff', border: '1px solid var(--grey-200)', marginBottom: 24, padding: '24px',
  };

  // ── NON-CREATOR / NON-COMANAGER VIEW ─────────────────────────────────────

  if (!canManage) {
    return (
      <div style={{ padding: '40px 40px 80px', maxWidth: 800, margin: '0 auto' }}>
        {toast && (
          <div style={{ position: 'fixed', bottom: 32, left: '50%', transform: 'translateX(-50%)', background: 'var(--black)', color: '#fff', padding: '12px 24px', fontSize: 13, fontWeight: 600, zIndex: 9999, pointerEvents: 'none' }}>
            {toast}
          </div>
        )}

        <div style={{ marginBottom: 24 }}>
          <Link href="/dashboard/player/quick-game" style={{ fontSize: 12, color: 'var(--grey-400)', textDecoration: 'none' }}>← Mis juegos</Link>
        </div>

        {/* Header */}
        <div style={{ ...cardStyle, borderTop: `3px solid ${si.color}` }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 16, marginBottom: 16 }}>
            <div>
              <div style={{ fontFamily: 'var(--font-display)', fontSize: 28, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '-0.01em', color: 'var(--black)', marginBottom: 8 }}>{game.name}</div>
              <div style={{ fontSize: 12, color: 'var(--grey-400)', marginBottom: 8 }}>Código: <strong>{game.code}</strong></div>
              <div style={{ fontSize: 13, color: 'var(--grey-500)' }}>{game.date} · {game.time} · {game.club}, {game.city}</div>
            </div>
            {statusBadge(game.status)}
          </div>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <span style={{ fontSize: 11, background: 'var(--grey-100)', color: 'var(--grey-500)', padding: '4px 10px', fontWeight: 600 }}>{game.players.length}/{game.maxPlayers} jugadores</span>
            <span style={{ fontSize: 11, background: 'var(--grey-100)', color: 'var(--grey-500)', padding: '4px 10px', fontWeight: 600 }}>{scoreConfigLabel(game.scoreConfig)}</span>
          </div>
        </div>

        {/* Standings / live info */}
        {(isLive || isFinished) && game.standings.length > 0 && (
          <div style={cardStyle}>
            <div style={secTitle}>Clasificación</div>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
              <thead>
                <tr style={{ fontSize: 10, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--grey-400)' }}>
                  <th style={{ textAlign: 'left', padding: '0 8px 8px 0', fontWeight: 700 }}>Pos</th>
                  <th style={{ textAlign: 'left', padding: '0 8px 8px 0', fontWeight: 700 }}>Jugador</th>
                  <th style={{ textAlign: 'center', padding: '0 8px 8px', fontWeight: 700 }}>PJ</th>
                  <th style={{ textAlign: 'center', padding: '0 8px 8px', fontWeight: 700 }}>G</th>
                  <th style={{ textAlign: 'center', padding: '0 8px 8px', fontWeight: 700 }}>Pts</th>
                  <th style={{ textAlign: 'center', padding: '0 8px 8px', fontWeight: 700 }}>Dif</th>
                </tr>
              </thead>
              <tbody>
                {game.standings.map((s, i) => (
                  <tr key={s.playerId} style={{ borderTop: '1px solid var(--grey-100)' }}>
                    <td style={{ padding: '10px 8px 10px 0', fontWeight: 700, color: i === 0 ? 'var(--turf-green)' : 'var(--grey-400)', fontSize: 12 }}>{i + 1}</td>
                    <td style={{ padding: '10px 8px 10px 0', fontWeight: 600 }}>{s.playerName}</td>
                    <td style={{ textAlign: 'center', padding: '10px 8px', color: 'var(--grey-500)' }}>{s.played}</td>
                    <td style={{ textAlign: 'center', padding: '10px 8px', color: 'var(--grey-500)' }}>{s.wins}</td>
                    <td style={{ textAlign: 'center', padding: '10px 8px', fontWeight: 700 }}>{s.pts}</td>
                    <td style={{ textAlign: 'center', padding: '10px 8px', color: s.diff >= 0 ? 'var(--turf-green)' : '#ee0005' }}>{s.diff > 0 ? '+' : ''}{s.diff}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Current round (read-only) */}
        {isLive && currentRound && (
          <div style={cardStyle}>
            <div style={secTitle}>Ronda {currentRound.num} — {currentRoundComplete ? 'Completada' : 'En curso'}</div>
            {currentRound.courts.map(court => (
              <div key={court.courtNum} style={{ padding: '16px 0', borderBottom: '1px solid var(--grey-100)' }}>
                <div style={{ fontSize: 10, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--grey-400)', marginBottom: 8 }}>Cancha {court.courtNum}</div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <span style={{ fontWeight: 600 }}>{getPairNames(court.pair1)}</span>
                  <span style={{ color: 'var(--grey-300)', fontSize: 12 }}>vs</span>
                  <span style={{ fontWeight: 600 }}>{getPairNames(court.pair2)}</span>
                  {court.status === 'completed' && (
                    <span style={{ marginLeft: 'auto', fontSize: 15, fontFamily: 'var(--font-display)', fontWeight: 700 }}>
                      {court.pair1Score} – {court.pair2Score}
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Players list */}
        <div style={cardStyle}>
          <div style={secTitle}>Jugadores ({game.players.length}/{game.maxPlayers})</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {game.players.map(p => (
              <div key={p.id} style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <div style={{ width: 32, height: 32, background: 'var(--grey-100)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 700, color: 'var(--grey-500)', flexShrink: 0 }}>
                  {initials(p.name)}
                </div>
                <span style={{ fontSize: 13, fontWeight: 500 }}>{p.name}</span>
                {p.isCreator && <span style={{ fontSize: 9, background: 'var(--black)', color: 'var(--neon)', padding: '2px 6px', fontWeight: 700 }}>CREADOR</span>}
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  // ── CREATOR VIEW ──────────────────────────────────────────────────────────

  return (
    <div style={{ padding: '40px 40px 80px', maxWidth: 900, margin: '0 auto' }}>
      {/* Toast */}
      {toast && (
        <div style={{ position: 'fixed', bottom: 32, left: '50%', transform: 'translateX(-50%)', background: 'var(--black)', color: '#fff', padding: '12px 24px', fontSize: 13, fontWeight: 600, zIndex: 9999, pointerEvents: 'none' }}>
          {toast}
        </div>
      )}

      {/* Cancel confirm modal */}
      {showCancelModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.55)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ background: '#fff', padding: '40px', width: 400, maxWidth: '90vw' }}>
            <div style={{ fontFamily: 'var(--font-display)', fontSize: 22, fontWeight: 700, textTransform: 'uppercase', marginBottom: 12 }}>Cancelar Juego</div>
            <p style={{ fontSize: 14, color: 'var(--grey-500)', marginBottom: 28, lineHeight: 1.6 }}>
              ¿Estás seguro? Se notificará a todos los jugadores invitados y el juego no se podrá recuperar.
            </p>
            <div style={{ display: 'flex', gap: 10 }}>
              <button onClick={handleCancelGame} style={{ flex: 1, padding: '12px', background: '#ee0005', color: '#fff', border: 'none', fontSize: 13, fontWeight: 700, cursor: 'pointer', letterSpacing: '0.06em' }}>
                Sí, Cancelar Juego
              </button>
              <button onClick={() => setShowCancelModal(false)} style={{ flex: 1, padding: '12px', background: 'var(--grey-100)', color: 'var(--black)', border: 'none', fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>
                Volver
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add/Replace player modal */}
      {showAddModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.55)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ background: '#fff', width: 500, maxWidth: '92vw', maxHeight: '85vh', display: 'flex', flexDirection: 'column' }}>
            {/* Modal header */}
            <div style={{ padding: '20px 24px 0', borderBottom: '1px solid var(--grey-200)' }}>
              <div style={{ fontFamily: 'var(--font-display)', fontSize: 18, fontWeight: 700, textTransform: 'uppercase', marginBottom: 16 }}>
                {replaceTargetId ? 'Reemplazar Jugador' : 'Agregar Jugador'}
              </div>
              {/* Tabs */}
              <div style={{ display: 'flex', gap: 0, marginBottom: -1 }}>
                {(['friends', 'search'] as const).map(tab => (
                  <button key={tab} onClick={() => { setAddTab(tab); setPlayerSearchQ(''); }}
                    style={{ padding: '9px 20px', border: '1px solid var(--grey-200)', borderBottom: addTab === tab ? '1px solid #fff' : '1px solid var(--grey-200)', background: addTab === tab ? '#fff' : 'var(--grey-50)', fontSize: 11, fontWeight: 700, cursor: 'pointer', letterSpacing: '0.08em', textTransform: 'uppercase', color: addTab === tab ? 'var(--black)' : 'var(--grey-400)', marginRight: -1 }}>
                    {tab === 'friends' ? `Amistades (${friendList.length})` : 'Buscar jugador'}
                  </button>
                ))}
              </div>
            </div>

            {/* Tab content */}
            <div style={{ flex: 1, overflowY: 'auto', padding: '16px 24px' }}>
              {addTab === 'friends' ? (
                friendList.length === 0 ? (
                  <div style={{ padding: '32px 0', textAlign: 'center', color: 'var(--grey-400)', fontSize: 13 }}>
                    No tenés amistades disponibles para agregar.<br />
                    <span style={{ fontSize: 12 }}>Usá la pestaña "Buscar jugador" para encontrar a alguien.</span>
                  </div>
                ) : (
                  <div style={{ border: '1px solid var(--grey-200)' }}>
                    {friendList.map((p, idx) => (
                      <div key={p.id}
                        onClick={() => handleInvitePlayer(p)}
                        style={{ padding: '12px 16px', cursor: 'pointer', borderTop: idx === 0 ? 'none' : '1px solid var(--grey-100)', display: 'flex', alignItems: 'center', gap: 12 }}
                        onMouseEnter={e => (e.currentTarget.style.background = 'var(--grey-50)')}
                        onMouseLeave={e => (e.currentTarget.style.background = '#fff')}
                      >
                        <div style={{ width: 36, height: 36, background: 'var(--black)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 700, color: '#fff', flexShrink: 0 }}>
                          {initials(p.name)}
                        </div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--black)' }}>{p.name}</div>
                          <div style={{ fontSize: 11, color: 'var(--grey-400)' }}>{p.email} · {p.shortId}</div>
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 4 }}>
                          <span style={{ fontSize: 9, background: '#f0fdf4', color: '#166534', padding: '2px 6px', fontWeight: 700, letterSpacing: '0.08em' }}>AMIGO</span>
                          <span style={{ fontSize: 11, color: 'var(--grey-400)' }}>#{p.rankingPoints ?? p.ranking}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )
              ) : (
                <div>
                  <input
                    style={{ ...inp, marginBottom: 12 }}
                    placeholder="Buscar por nombre, email o #ID..."
                    value={playerSearchQ}
                    onChange={e => setPlayerSearchQ(e.target.value)}
                    autoFocus
                  />
                  {playerSearchResults.length > 0 ? (
                    <div style={{ border: '1px solid var(--grey-200)' }}>
                      {playerSearchResults.map((p, idx) => (
                        <div key={p.id}
                          onClick={() => handleInvitePlayer(p)}
                          style={{ padding: '12px 16px', cursor: 'pointer', borderTop: idx === 0 ? 'none' : '1px solid var(--grey-100)', display: 'flex', alignItems: 'center', gap: 12 }}
                          onMouseEnter={e => (e.currentTarget.style.background = 'var(--grey-50)')}
                          onMouseLeave={e => (e.currentTarget.style.background = '#fff')}
                        >
                          <div style={{ width: 36, height: 36, background: 'var(--grey-100)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 700, color: 'var(--grey-500)', flexShrink: 0 }}>
                            {initials(p.name)}
                          </div>
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--black)' }}>{p.name}</div>
                            <div style={{ fontSize: 11, color: 'var(--grey-400)' }}>{p.email} · {p.shortId}</div>
                          </div>
                          <span style={{ fontSize: 11, color: 'var(--grey-400)', flexShrink: 0 }}>#{p.rankingPoints ?? p.ranking}</span>
                        </div>
                      ))}
                    </div>
                  ) : playerSearchQ ? (
                    <div style={{ padding: '24px 0', textAlign: 'center', color: 'var(--grey-400)', fontSize: 13 }}>No se encontraron jugadores</div>
                  ) : (
                    <div style={{ padding: '24px 0', textAlign: 'center', color: 'var(--grey-400)', fontSize: 13 }}>Escribí al menos 2 caracteres para buscar</div>
                  )}
                </div>
              )}
            </div>

            {/* Modal footer */}
            <div style={{ padding: '12px 24px', borderTop: '1px solid var(--grey-200)', display: 'flex', justifyContent: 'flex-end' }}>
              <button onClick={() => { setShowAddModal(false); setReplaceTargetId(null); setPlayerSearchQ(''); setAddTab('friends'); }}
                style={{ padding: '10px 20px', background: 'var(--grey-100)', border: 'none', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* QR Modal */}
      {showQR && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.55)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ background: '#fff', padding: '40px', textAlign: 'center' }}>
            <div style={{ fontFamily: 'var(--font-display)', fontSize: 20, fontWeight: 700, textTransform: 'uppercase', marginBottom: 20 }}>Compartir Juego</div>
            <QRCodeSVG value={shareUrl || 'https://padelmgt.com'} size={200} />
            <div style={{ fontSize: 12, color: 'var(--grey-400)', marginTop: 16, wordBreak: 'break-all' }}>{shareUrl}</div>
            <button onClick={() => setShowQR(false)} style={{ marginTop: 20, padding: '10px 28px', background: 'var(--black)', color: '#fff', border: 'none', fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>Cerrar</button>
          </div>
        </div>
      )}

      {/* Back nav */}
      <div style={{ marginBottom: 24 }}>
        <Link href="/dashboard/player/quick-game" style={{ fontSize: 12, color: 'var(--grey-400)', textDecoration: 'none' }}>← Mis juegos</Link>
      </div>

      {/* ── HEADER ─────────────────────────────────────────────────────────── */}
      <div style={{ ...cardStyle, borderTop: `3px solid ${si.color}` }}>
        {editOpen ? (
          <div>
            <div style={{ fontFamily: 'var(--font-display)', fontSize: 18, fontWeight: 700, textTransform: 'uppercase', marginBottom: 20 }}>Editar Juego</div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }}>
              <div>
                <label style={lbl}>Nombre</label>
                <input style={inp} value={editName} onChange={e => setEditName(e.target.value)} />
              </div>
              <div>
                <label style={lbl}>Fecha</label>
                <input style={inp} type="date" value={editDate} onChange={e => setEditDate(e.target.value)} />
              </div>
              <div>
                <label style={lbl}>Hora</label>
                <input style={inp} type="time" value={editTime} onChange={e => setEditTime(e.target.value)} />
              </div>
              <div>
                <label style={lbl}>Club</label>
                <input style={inp} value={editClub} onChange={e => setEditClub(e.target.value)} />
              </div>
              <div>
                <label style={lbl}>Ciudad</label>
                <input style={inp} value={editCity} onChange={e => setEditCity(e.target.value)} />
              </div>
            </div>
            <div style={{ display: 'flex', gap: 10 }}>
              <button onClick={handleSaveEdits} style={{ padding: '10px 24px', background: 'var(--black)', color: '#fff', border: 'none', fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>
                Guardar
              </button>
              <button onClick={() => setEditOpen(false)} style={{ padding: '10px 20px', background: 'var(--grey-100)', border: 'none', fontSize: 13, cursor: 'pointer' }}>
                Cancelar
              </button>
            </div>
          </div>
        ) : (
          <div>
            {/* QR + Share strip — above the game name */}
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: 24, marginBottom: 20, padding: '16px', background: 'var(--grey-50)', border: '1px solid var(--grey-100)' }}>
              <div style={{ flexShrink: 0 }}>
                <QRCodeSVG value={shareUrl || `https://padelmgt.com/quick-game/${game.code}`} size={80} />
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'var(--grey-400)', marginBottom: 4 }}>Compartir Juego</div>
                <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--black)', marginBottom: 6, wordBreak: 'break-all' }}>{shareUrl || `padelmgt.com/quick-game/${game.code}`}</div>
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                  <button
                    onClick={() => {
                      const url = shareUrl || `${window.location.origin}/quick-game/${game.code}`;
                      navigator.clipboard.writeText(url).catch(() => {});
                      showToast('¡Link copiado!');
                    }}
                    style={{ padding: '6px 14px', background: 'var(--black)', color: '#fff', border: 'none', fontSize: 11, fontWeight: 700, cursor: 'pointer', letterSpacing: '0.06em' }}
                  >
                    Copiar link
                  </button>
                  <div style={{ fontSize: 12, color: 'var(--grey-400)', display: 'flex', alignItems: 'center' }}>
                    Código: <strong style={{ color: 'var(--black)', marginLeft: 4 }}>{game.code}</strong>
                  </div>
                </div>
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 16, marginBottom: 16 }}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontFamily: 'var(--font-display)', fontSize: 28, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '-0.01em', color: 'var(--black)', marginBottom: 6 }}>{game.name}</div>
                <div style={{ fontSize: 13, color: 'var(--grey-500)', marginBottom: 4 }}>
                  {game.date} · {game.time} · {game.club}, {game.city}
                </div>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 10, flexShrink: 0 }}>
                {statusBadge(game.status)}
                {!isCancelled && !isFinished && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8, alignItems: 'flex-end' }}>
                    <div style={{ display: 'flex', gap: 8 }}>
                      {isPending && (
                        <Link
                          href={`/dashboard/player/quick-game/${game.id}/edit`}
                          style={{ padding: '7px 16px', background: 'var(--black)', border: 'none', fontSize: 12, fontWeight: 700, cursor: 'pointer', color: 'var(--neon)', textDecoration: 'none', display: 'inline-block', letterSpacing: '0.05em' }}
                        >
                          ✎ Editar parámetros
                        </Link>
                      )}
                      <button
                        onClick={() => setShowCancelModal(true)}
                        style={{ padding: '7px 16px', background: '#ee0005', border: 'none', fontSize: 12, fontWeight: 700, cursor: 'pointer', color: '#fff', letterSpacing: '0.05em' }}
                      >
                        Cancelar Juego
                      </button>
                    </div>
                    {isPending && isCreator && (
                      currentUser && game.players.some(p => p.id === currentUser.id) ? (
                        <button
                          onClick={() => {
                            const hasCoCreator = (game.coCreatorIds ?? []).length > 0;
                            if (!hasCoCreator) showToast('Asigná al menos un Co-Creador antes de salirte del juego.');
                            else handleLeaveGame();
                          }}
                          style={{ padding: '5px 14px', background: 'transparent', border: '1px solid var(--grey-300)', fontSize: 11, fontWeight: 600, cursor: 'pointer', color: 'var(--grey-500)', letterSpacing: '0.06em' }}
                        >
                          Salirme del juego
                        </button>
                      ) : (
                        <button
                          onClick={handleJoinGame}
                          disabled={game.players.length >= game.maxPlayers}
                          style={{ padding: '5px 14px', background: game.players.length < game.maxPlayers ? 'var(--turf-green)' : 'var(--grey-200)', border: 'none', fontSize: 11, fontWeight: 700, cursor: game.players.length < game.maxPlayers ? 'pointer' : 'not-allowed', color: game.players.length < game.maxPlayers ? '#fff' : 'var(--grey-400)', letterSpacing: '0.06em' }}
                        >
                          Unirme al juego
                        </button>
                      )
                    )}
                  </div>
                )}
              </div>
            </div>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              <span style={{ fontSize: 11, background: 'var(--grey-100)', color: 'var(--grey-500)', padding: '4px 10px', fontWeight: 600 }}>{game.pairType === 'parejas' ? 'Pareja Fija' : 'Intercambio'}</span>
              <span style={{ fontSize: 11, background: 'var(--grey-100)', color: 'var(--grey-500)', padding: '4px 10px', fontWeight: 600 }}>{scoreConfigLabel(game.scoreConfig)}</span>
              <span style={{ fontSize: 11, background: 'var(--grey-100)', color: 'var(--grey-500)', padding: '4px 10px', fontWeight: 600 }}>{game.courts} cancha{game.courts !== 1 ? 's' : ''}</span>
            </div>
          </div>
        )}
      </div>

      {/* ── SECTION A: Lista Provisional (status == created) ─────────────── */}
      {isPending && (
        <div style={cardStyle}>
          <div style={secTitle}>Lista Provisional de Jugadores</div>

          {/* Counter */}
          <div style={{ marginBottom: 16, fontSize: 13, color: 'var(--grey-500)' }}>
            <strong style={{ color: allConfirmed ? 'var(--turf-green)' : 'var(--black)' }}>{confirmedCount}</strong>
            {' / '}
            <strong>{game.maxPlayers}</strong>
            {' jugadores confirmados'}
            {allConfirmed && (
              <span style={{ marginLeft: 10, fontSize: 9, background: '#dcfce7', color: '#166534', padding: '2px 8px', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase' }}>
                Completo ✓
              </span>
            )}
          </div>

          {/* Creator not playing — organizer-only banner */}
          {isCreator && !game.players.some(p => p.id === currentUser?.id) && (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 14px', marginBottom: 12, background: 'rgba(124,58,237,0.05)', border: '1px dashed #7c3aed' }}>
              <div>
                <span style={{ fontSize: 11, fontWeight: 700, color: '#7c3aed', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Solo organizando</span>
                <span style={{ fontSize: 11, color: 'var(--grey-500)', marginLeft: 8 }}>No estás inscrito como jugador</span>
              </div>
              <button
                onClick={handleCreatorJoinAsPlayer}
                disabled={game.players.length >= game.maxPlayers}
                style={{ padding: '6px 14px', background: '#7c3aed', color: '#fff', border: 'none', cursor: game.players.length < game.maxPlayers ? 'pointer' : 'not-allowed', fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', opacity: game.players.length >= game.maxPlayers ? 0.5 : 1, whiteSpace: 'nowrap' }}>
                + Unirme como jugador
              </button>
            </div>
          )}

          {/* Confirmed players (from game.players) */}
          {game.players.map(p => {
            const isThisCreator = p.id === game.creatorId || p.isCreator;
            return (
              <div key={p.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 0', borderBottom: '1px solid var(--grey-100)' }}>
                <div style={{ width: 36, height: 36, background: isThisCreator ? 'var(--black)' : 'var(--grey-100)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 700, color: isThisCreator ? '#fff' : 'var(--grey-500)', flexShrink: 0 }}>
                  {initials(p.name)}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 13, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 6 }}>
                    {p.name}
                    {isThisCreator && <span style={{ fontSize: 9, background: 'var(--black)', color: 'var(--neon)', padding: '2px 6px', fontWeight: 700, letterSpacing: '0.08em' }}>CREADOR</span>}
                    {(game.coCreatorIds ?? []).includes(p.id) && <span style={{ fontSize: 9, background: 'var(--neon)', color: 'var(--black)', padding: '2px 6px', fontWeight: 700, letterSpacing: '0.08em' }}>CO-CREADOR</span>}
                  </div>
                  <div style={{ fontSize: 11, color: 'var(--grey-400)' }}>{p.email ?? ''}</div>
                </div>
                <span style={{ fontSize: 9, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', padding: '3px 8px', background: '#dcfce7', color: '#166534', flexShrink: 0 }}>
                  Confirmado
                </span>
                {isThisCreator && isCreator && (
                  <button
                    onClick={handleCreatorLeaveAsPlayer}
                    title="Solo organizar — salirse como jugador"
                    style={{ padding: '3px 9px', background: 'transparent', border: '1px solid var(--grey-300)', cursor: 'pointer', fontSize: 9, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--grey-500)', whiteSpace: 'nowrap', flexShrink: 0 }}>
                    Solo organizar
                  </button>
                )}
                {!isThisCreator && (
                  <button
                    onClick={() => handleRemoveInvited(p.id)}
                    title="Quitar jugador"
                    style={{ width: 28, height: 28, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'transparent', border: '1px solid var(--grey-200)', cursor: 'pointer', color: 'var(--grey-400)', fontSize: 14, fontWeight: 700, flexShrink: 0 }}
                  >
                    ✕
                  </button>
                )}
              </div>
            );
          })}

          {/* Join Requests from public page */}
          {joinRequests.length > 0 && (
            <>
              <div style={{ marginTop: 12, marginBottom: 4, fontSize: 10, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: '#f5a623', paddingTop: 8, display: 'flex', alignItems: 'center', gap: 6 }}>
                <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#f5a623', display: 'inline-block' }} />
                Solicitudes de Ingreso ({joinRequests.length})
              </div>
              {joinRequests.map(req => (
                <div key={req.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 0', borderBottom: '1px solid var(--grey-100)', background: 'rgba(245,166,35,0.04)' }}>
                  <div style={{ width: 36, height: 36, background: 'rgba(245,166,35,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 700, color: '#f5a623', flexShrink: 0 }}>
                    {req.playerName.split(' ').map((w: string) => w[0]).join('').slice(0, 2).toUpperCase()}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 13, fontWeight: 600 }}>{req.playerName}</div>
                    {req.playerEmail && <div style={{ fontSize: 11, color: 'var(--grey-400)' }}>{req.playerEmail}</div>}
                  </div>
                  <span style={{ fontSize: 9, fontWeight: 700, padding: '2px 8px', background: 'rgba(245,166,35,0.15)', color: '#b45309', letterSpacing: '0.08em', textTransform: 'uppercase', flexShrink: 0 }}>
                    SOLICITUD
                  </span>
                  {game.players.length < game.maxPlayers && (
                    <button
                      onClick={() => handleApproveRequest(req)}
                      style={{ padding: '5px 12px', background: 'var(--turf-green)', color: '#fff', border: 'none', fontSize: 10, fontWeight: 700, cursor: 'pointer', letterSpacing: '0.06em', flexShrink: 0 }}
                    >
                      ✓ Aceptar
                    </button>
                  )}
                  <button
                    onClick={() => handleRejectRequest(req)}
                    style={{ padding: '5px 12px', background: '#fff', color: '#dc2626', border: '1px solid #fecaca', fontSize: 10, fontWeight: 700, cursor: 'pointer', flexShrink: 0 }}
                  >
                    ✗ Rechazar
                  </button>
                </div>
              ))}
            </>
          )}

          {/* Pending invitations */}
          {(game.invitedPlayers ?? []).filter(ip => ip.status === 'pending').length > 0 && (
            <div style={{ marginTop: 4, marginBottom: 4, fontSize: 10, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--grey-400)', paddingTop: 12 }}>
              Invitaciones Pendientes
            </div>
          )}
          {(game.invitedPlayers ?? []).filter(ip => ip.status === 'pending').map(ip => (
            <div key={ip.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 0', borderBottom: '1px solid var(--grey-100)' }}>
              <div style={{ width: 36, height: 36, background: 'var(--grey-100)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 700, color: 'var(--grey-500)', flexShrink: 0 }}>
                {initials(ip.name)}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 13, fontWeight: 600 }}>{ip.name}</div>
                <div style={{ fontSize: 11, color: 'var(--grey-400)' }}>{ip.email ?? ip.shortId ?? ''}</div>
              </div>
              {invStatusBadge(ip.status)}
              <button
                onClick={() => handleRemoveInvited(ip.id)}
                title="Cancelar invitación"
                style={{ width: 28, height: 28, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'transparent', border: '1px solid var(--grey-200)', cursor: 'pointer', color: 'var(--grey-400)', fontSize: 14, fontWeight: 700, flexShrink: 0 }}
              >
                ✕
              </button>
            </div>
          ))}

          {/* Rejected invitations (with replace option) */}
          {(game.invitedPlayers ?? []).filter(ip => ip.status === 'rejected').map(ip => (
            <div key={ip.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 0', borderBottom: '1px solid var(--grey-100)', opacity: 0.7 }}>
              <div style={{ width: 36, height: 36, background: 'var(--grey-100)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 700, color: 'var(--grey-500)', flexShrink: 0 }}>
                {initials(ip.name)}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 13, fontWeight: 600 }}>{ip.name}</div>
                <div style={{ fontSize: 11, color: 'var(--grey-400)' }}>{ip.email ?? ip.shortId ?? ''}</div>
              </div>
              {invStatusBadge(ip.status)}
              <button
                onClick={() => { setReplaceTargetId(ip.id); setShowAddModal(true); }}
                style={{ padding: '5px 10px', background: 'var(--black)', color: '#fff', border: 'none', fontSize: 10, fontWeight: 700, cursor: 'pointer', letterSpacing: '0.06em', flexShrink: 0 }}
              >
                Reemplazar
              </button>
            </div>
          ))}

          {/* Add player button + provisional player */}
          {confirmedCount < game.maxPlayers && (
            <div style={{ marginTop: 16, display: 'flex', flexWrap: 'wrap', gap: 10 }}>
              <button
                onClick={() => { setReplaceTargetId(null); setShowAddModal(true); }}
                style={{ padding: '10px 20px', background: 'var(--black)', color: '#fff', border: 'none', fontSize: 12, fontWeight: 700, cursor: 'pointer', letterSpacing: '0.06em' }}
              >
                + Agregar Jugador
              </button>
              <button
                onClick={() => setShowProvInput(v => !v)}
                style={{ padding: '10px 20px', background: '#fff', color: 'var(--grey-500)', border: '1px solid var(--grey-200)', fontSize: 12, fontWeight: 700, cursor: 'pointer', letterSpacing: '0.06em' }}
              >
                + Nombre Provisional
              </button>
            </div>
          )}
          {showProvInput && confirmedCount < game.maxPlayers && (
            <div style={{ marginTop: 14, display: 'flex', gap: 8, alignItems: 'center' }}>
              <input
                value={provName}
                onChange={e => setProvName(e.target.value)}
                placeholder="Nombre del jugador provisional"
                style={{ flex: 1, padding: '9px 12px', border: '1px solid var(--grey-200)', fontSize: 13, outline: 'none', fontFamily: 'var(--font-body)' }}
              />
              <button
                onClick={() => { handleAddProvisional(provName); setProvName(''); setShowProvInput(false); }}
                disabled={!provName.trim()}
                style={{ padding: '9px 18px', background: provName.trim() ? 'var(--black)' : 'var(--grey-200)', color: provName.trim() ? '#fff' : 'var(--grey-400)', border: 'none', fontSize: 12, fontWeight: 700, cursor: provName.trim() ? 'pointer' : 'not-allowed' }}
              >
                Agregar
              </button>
            </div>
          )}
          {/* Co-creator assignment */}
          {isCreator && game.players.filter(p => !p.isCreator).length > 0 && (
            <div style={{ marginTop: 24, borderTop: '1px solid var(--grey-100)', paddingTop: 16 }}>
              <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--grey-400)', marginBottom: 12 }}>
                Co-Creadores (pueden ingresar scores)
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                {game.players.filter(p => !p.isCreator).map(p => {
                  const isCo = game.coCreatorIds?.includes(p.id);
                  return (
                    <button key={p.id} onClick={() => handleToggleCoCreator(p.id)}
                      style={{ padding: '7px 14px', border: '1px solid', fontSize: 11, fontWeight: 700, cursor: 'pointer', letterSpacing: '0.06em', textTransform: 'uppercase', background: isCo ? 'var(--neon)' : '#fff', color: isCo ? 'var(--black)' : 'var(--grey-400)', borderColor: isCo ? 'var(--neon)' : 'var(--grey-200)' }}>
                      {p.name} {isCo ? '★' : '+'}
                    </button>
                  );
                })}
              </div>
              <div style={{ fontSize: 11, color: 'var(--grey-400)', marginTop: 8 }}>
                Los Co-Creadores seleccionados (★) podrán ingresar scores y avanzar rondas.
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── SECTION B: Armar Equipos ──────────────────────────────────────── */}
      {isPending && allConfirmed && (
        <div style={cardStyle}>
          <div style={secTitle}>Armar Equipos</div>

          {game.pairType === 'individual' ? (
            <div>
              <p style={{ fontSize: 13, color: 'var(--grey-500)', marginBottom: 16, lineHeight: 1.6 }}>
                Las parejas se asignan automáticamente por ranking al iniciar (mejor + peor para equilibrar). Vista previa:
              </p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {autoPreviewPairs.map((pair, i) => (
                  <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 14px', background: 'var(--grey-50)', border: '1px solid var(--grey-100)' }}>
                    <span style={{ fontSize: 10, fontWeight: 700, color: 'var(--grey-400)', letterSpacing: '0.1em', textTransform: 'uppercase', width: 56, flexShrink: 0 }}>Pareja {i + 1}</span>
                    <span style={{ fontSize: 13, fontWeight: 600 }}>{pair[0].name}</span>
                    <span style={{ fontSize: 11, color: 'var(--grey-300)' }}>&amp;</span>
                    <span style={{ fontSize: 13, fontWeight: 600 }}>{pair[1].name}</span>
                  </div>
                ))}
              </div>
              <div style={{ marginTop: 14, fontSize: 12, color: 'var(--grey-400)' }}>
                Listo — las parejas se asignan automáticamente al iniciar el juego
              </div>
            </div>
          ) : pairsLocked ? (
            /* ── Pairs locked view ── */
            <div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 16 }}>
                {pairAssignments.map((pa, idx) => (
                  <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px', background: 'var(--grey-50)', border: '1px solid var(--grey-100)' }}>
                    <span style={{ fontSize: 10, fontWeight: 700, color: 'var(--grey-400)', letterSpacing: '0.1em', textTransform: 'uppercase', width: 56, flexShrink: 0 }}>Pareja {idx + 1}</span>
                    <span style={{ fontSize: 13, fontWeight: 600 }}>{pa.player1Name}</span>
                    <span style={{ fontSize: 11, color: 'var(--grey-300)' }}>&amp;</span>
                    <span style={{ fontSize: 13, fontWeight: 600 }}>{pa.player2Name}</span>
                  </div>
                ))}
              </div>
              <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                <span style={{ fontSize: 12, color: 'var(--turf-green)', fontWeight: 600 }}>✓ Parejas confirmadas</span>
                <button onClick={() => setPairsLocked(false)} style={{ padding: '6px 14px', background: 'var(--grey-100)', border: 'none', fontSize: 12, cursor: 'pointer', fontWeight: 600 }}>Reorganizar</button>
              </div>
            </div>
          ) : (
            /* ── Drag & drop pair builder ── */
            (() => {
              const assignedIds = new Set(pairAssignments.flatMap(pa => [pa.player1Id, pa.player2Id].filter(Boolean)));
              const unassigned = game.players.filter(p => !assignedIds.has(p.id));
              const isDragging = !!dragId;

              function slotKey(pairIdx: number, slot: 1 | 2) { return `pair-${pairIdx}-${slot}`; }

              function chipStyle(isDragSource: boolean): React.CSSProperties {
                return {
                  display: 'flex', alignItems: 'center', gap: 8,
                  padding: '7px 12px',
                  background: isDragSource ? 'var(--grey-200)' : 'var(--black)',
                  color: isDragSource ? 'var(--grey-400)' : '#fff',
                  cursor: 'grab', userSelect: 'none',
                  fontSize: 12, fontWeight: 700,
                  border: 'none', opacity: isDragSource ? 0.5 : 1,
                };
              }

              function dropZoneStyle(key: string, occupied: boolean): React.CSSProperties {
                const isOver = dropOver === key;
                return {
                  flex: 1, minWidth: 110,
                  height: 46,
                  display: 'flex', alignItems: 'center',
                  padding: '0 10px',
                  border: `2px ${isOver ? 'solid' : 'dashed'} ${isOver ? 'var(--turf-green)' : occupied ? 'var(--black)' : 'var(--grey-300)'}`,
                  background: isOver ? '#f0fdf4' : occupied ? 'var(--black)' : '#fff',
                  cursor: isDragging ? 'copy' : 'default',
                  transition: 'border-color 0.1s, background 0.1s',
                };
              }

              return (
                <div>
                  <p style={{ fontSize: 12, color: 'var(--grey-400)', marginBottom: 16 }}>
                    Arrastrá los jugadores del pool a cada pareja. Podés intercambiar jugadores arrastrando entre slots.
                  </p>

                  {/* Pool */}
                  <div
                    onDragOver={e => { e.preventDefault(); setDropOver('pool'); }}
                    onDragLeave={e => { if (!e.currentTarget.contains(e.relatedTarget as Node)) setDropOver(null); }}
                    onDrop={e => { e.preventDefault(); if (dragSource !== 'pool') handlePairDrop('pool'); setDropOver(null); }}
                    style={{
                      minHeight: 56, padding: '10px 12px', marginBottom: 20,
                      border: `2px dashed ${dropOver === 'pool' ? 'var(--turf-green)' : 'var(--grey-200)'}`,
                      background: dropOver === 'pool' ? '#f0fdf4' : 'var(--grey-50)',
                      display: 'flex', flexWrap: 'wrap', gap: 8, alignItems: 'center',
                    }}
                  >
                    <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--grey-400)', marginRight: 4, flexShrink: 0 }}>
                      {unassigned.length > 0 ? `Disponibles (${unassigned.length})` : '✓ Todos asignados'}
                    </span>
                    {unassigned.map(p => (
                      <div
                        key={p.id}
                        draggable
                        onDragStart={() => { setDragId(p.id); setDragSource('pool'); }}
                        onDragEnd={() => { setDragId(null); setDragSource(null); setDropOver(null); }}
                        style={chipStyle(dragId === p.id && dragSource === 'pool')}
                      >
                        <div style={{ width: 22, height: 22, borderRadius: '50%', background: 'rgba(255,255,255,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 9, fontWeight: 700 }}>
                          {initials(p.name)}
                        </div>
                        {p.name}
                      </div>
                    ))}
                  </div>

                  {/* Pair rows */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 20 }}>
                    {pairAssignments.map((pa, idx) => {
                      const s1key = slotKey(idx, 1);
                      const s2key = slotKey(idx, 2);
                      const p1 = pa.player1Id ? game.players.find(p => p.id === pa.player1Id) : null;
                      const p2 = pa.player2Id ? game.players.find(p => p.id === pa.player2Id) : null;
                      return (
                        <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                          <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--grey-400)', width: 60, flexShrink: 0 }}>
                            Pareja {idx + 1}
                          </span>

                          {/* Slot 1 */}
                          <div
                            onDragOver={e => { e.preventDefault(); setDropOver(s1key); }}
                            onDragLeave={e => { if (!e.currentTarget.contains(e.relatedTarget as Node)) setDropOver(null); }}
                            onDrop={e => { e.preventDefault(); handlePairDrop(s1key); }}
                            style={dropZoneStyle(s1key, !!p1)}
                          >
                            {p1 ? (
                              <div
                                draggable
                                onDragStart={() => { setDragId(p1.id); setDragSource(s1key); }}
                                onDragEnd={() => { setDragId(null); setDragSource(null); setDropOver(null); }}
                                style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'grab', flex: 1, color: '#fff', userSelect: 'none' }}
                              >
                                <div style={{ width: 22, height: 22, borderRadius: '50%', background: 'rgba(255,255,255,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 9, fontWeight: 700, flexShrink: 0 }}>
                                  {initials(p1.name)}
                                </div>
                                <span style={{ fontSize: 12, fontWeight: 700, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p1.name}</span>
                                <button
                                  onClick={() => handlePairDrop('pool')}
                                  onMouseDown={e => { setDragId(p1.id); setDragSource(s1key); e.stopPropagation(); }}
                                  style={{ marginLeft: 'auto', background: 'transparent', border: 'none', color: 'rgba(255,255,255,0.6)', cursor: 'pointer', fontSize: 13, lineHeight: 1, padding: '0 2px', flexShrink: 0 }}
                                  title="Quitar"
                                >✕</button>
                              </div>
                            ) : (
                              <span style={{ fontSize: 11, color: 'var(--grey-300)', fontStyle: 'italic' }}>Soltá aquí</span>
                            )}
                          </div>

                          <span style={{ fontSize: 13, color: 'var(--grey-300)', fontWeight: 700, flexShrink: 0 }}>&amp;</span>

                          {/* Slot 2 */}
                          <div
                            onDragOver={e => { e.preventDefault(); setDropOver(s2key); }}
                            onDragLeave={e => { if (!e.currentTarget.contains(e.relatedTarget as Node)) setDropOver(null); }}
                            onDrop={e => { e.preventDefault(); handlePairDrop(s2key); }}
                            style={dropZoneStyle(s2key, !!p2)}
                          >
                            {p2 ? (
                              <div
                                draggable
                                onDragStart={() => { setDragId(p2.id); setDragSource(s2key); }}
                                onDragEnd={() => { setDragId(null); setDragSource(null); setDropOver(null); }}
                                style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'grab', flex: 1, color: '#fff', userSelect: 'none' }}
                              >
                                <div style={{ width: 22, height: 22, borderRadius: '50%', background: 'rgba(255,255,255,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 9, fontWeight: 700, flexShrink: 0 }}>
                                  {initials(p2.name)}
                                </div>
                                <span style={{ fontSize: 12, fontWeight: 700, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p2.name}</span>
                                <button
                                  onClick={() => { setDragId(p2.id); setDragSource(s2key); handlePairDrop('pool'); }}
                                  onMouseDown={e => { setDragId(p2.id); setDragSource(s2key); e.stopPropagation(); }}
                                  style={{ marginLeft: 'auto', background: 'transparent', border: 'none', color: 'rgba(255,255,255,0.6)', cursor: 'pointer', fontSize: 13, lineHeight: 1, padding: '0 2px', flexShrink: 0 }}
                                  title="Quitar"
                                >✕</button>
                              </div>
                            ) : (
                              <span style={{ fontSize: 11, color: 'var(--grey-300)', fontStyle: 'italic' }}>Soltá aquí</span>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {/* Save button */}
                  <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                    <button
                      onClick={handleSavePairs}
                      disabled={!pairsFullyAssigned}
                      style={{ padding: '10px 24px', background: pairsFullyAssigned ? 'var(--turf-green)' : 'var(--grey-200)', color: pairsFullyAssigned ? '#fff' : 'var(--grey-400)', border: 'none', fontSize: 12, fontWeight: 700, cursor: pairsFullyAssigned ? 'pointer' : 'not-allowed', letterSpacing: '0.06em' }}
                    >
                      Confirmar Parejas →
                    </button>
                    {!pairsFullyAssigned && (
                      <span style={{ fontSize: 12, color: 'var(--grey-400)' }}>
                        {unassigned.length} jugador{unassigned.length !== 1 ? 'es' : ''} sin asignar
                      </span>
                    )}
                  </div>
                </div>
              );
            })()
          )}
        </div>
      )}

      {/* ── SECTION C: Iniciar Juego ──────────────────────────────────────── */}
      {isPending && (
        <div style={{ ...cardStyle, background: canStart ? 'var(--black)' : '#fff' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16 }}>
            <div>
              <div style={{ fontSize: 9, letterSpacing: '0.18em', textTransform: 'uppercase', fontWeight: 700, color: canStart ? 'var(--neon)' : 'var(--grey-400)', marginBottom: 8 }}>
                Iniciar Juego
              </div>
              {!allConfirmed && (
                <div style={{ fontSize: 13, color: 'var(--grey-400)' }}>
                  Faltan {game.maxPlayers - confirmedCount} jugadores para completar el juego
                </div>
              )}
              {allConfirmed && game.pairType === 'parejas' && !pairsLocked && (
                <div style={{ fontSize: 13, color: 'var(--grey-400)' }}>
                  Guarda las parejas fijas antes de iniciar
                </div>
              )}
              {canStart && (
                <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.7)' }}>
                  Todos los jugadores están listos
                </div>
              )}
            </div>
            <button
              onClick={handleStartGame}
              disabled={!canStart}
              style={{
                padding: '14px 32px', border: 'none', fontSize: 13, fontWeight: 800,
                letterSpacing: '0.08em', textTransform: 'uppercase', cursor: canStart ? 'pointer' : 'not-allowed',
                background: canStart ? 'var(--neon)' : 'var(--grey-200)',
                color: canStart ? 'var(--black)' : 'var(--grey-400)',
                flexShrink: 0,
              }}
            >
              Iniciar Juego →
            </button>
          </div>
        </div>
      )}

      {/* ── SECTION D: Juego En Vivo ──────────────────────────────────────── */}
      {isLive && (
        <div style={cardStyle}>
          {/* Round header */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16, marginBottom: 20 }}>
            <div>
              <div style={{ ...secTitle, marginBottom: 4 }}>
                Juego En Vivo — Ronda {game.currentRound} de {game.rounds.length}
              </div>
              {currentRoundComplete && !gameComplete && (
                <div style={{ fontSize: 12, color: 'var(--turf-green)', fontWeight: 600 }}>✓ Ronda {game.currentRound} completada</div>
              )}
              {gameComplete && (
                <div style={{ fontSize: 12, color: '#ee0005', fontWeight: 600 }}>Todas las rondas completadas — ¡Podés finalizar!</div>
              )}
            </div>
            {/* Compact round pills */}
            <div style={{ display: 'flex', gap: 6 }}>
              {game.rounds.map(r => (
                <div key={r.num} style={{
                  width: 28, height: 28, display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 11, fontWeight: 700,
                  background: r.status === 'completed' ? 'var(--turf-green)' : r.num === game.currentRound ? 'var(--black)' : 'var(--grey-100)',
                  color: r.status === 'completed' ? '#fff' : r.num === game.currentRound ? '#fff' : 'var(--grey-400)',
                }}>
                  {r.num}
                </div>
              ))}
            </div>
          </div>

          {/* Action buttons — shown prominently when round is complete */}
          {currentRoundComplete && (
            <div style={{ display: 'flex', gap: 12, marginBottom: 24, flexWrap: 'wrap', padding: '16px 20px', background: gameComplete ? '#fff5f5' : '#f0fdf4', border: `1px solid ${gameComplete ? '#fca5a5' : '#86efac'}` }}>
              {hasMoreRounds && (
                <button
                  onClick={handleNextRound}
                  style={{ padding: '13px 32px', background: 'var(--black)', color: 'var(--neon)', border: 'none', fontSize: 13, fontWeight: 800, cursor: 'pointer', letterSpacing: '0.08em', textTransform: 'uppercase' }}
                >
                  Continuar Siguiente Ronda →
                </button>
              )}
              <button
                onClick={handleFinishGame}
                style={{ padding: '13px 28px', background: gameComplete ? '#ee0005' : '#fff', color: gameComplete ? '#fff' : 'var(--grey-500)', border: `1px solid ${gameComplete ? '#ee0005' : 'var(--grey-200)'}`, fontSize: 13, fontWeight: 700, cursor: 'pointer', letterSpacing: '0.06em' }}
              >
                Finalizar Juego
              </button>
            </div>
          )}

          {currentRound && (
            <div>
              {/* Courts */}
              {currentRound.courts.map(court => {
                const key = `${currentRound.num}-${court.courtNum}`;
                const si = scoreInputs[key] ?? { p1: '', p2: '' };
                const alreadyDone = court.status === 'completed';
                const numSets = !isPointsMode ? (game.scoreConfig.setsPerMatch ?? 3) : 0;
                const courtSetInputs = setInputs[key] ?? Array.from({ length: numSets }, () => ({ p1: '', p2: '' }));
                const winner = alreadyDone
                  ? (court.pair1Score !== null && court.pair2Score !== null
                      ? (court.pair1Score > court.pair2Score ? 1 : court.pair2Score > court.pair1Score ? 2 : 0)
                      : 0)
                  : 0;
                return (
                  <div key={court.courtNum} style={{ marginBottom: 16, border: '1px solid var(--grey-200)', background: alreadyDone ? 'var(--grey-50)' : '#fff' }}>
                    {/* Header */}
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 20px', background: 'var(--grey-50)', borderBottom: '1px solid var(--grey-100)' }}>
                      <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'var(--grey-500)' }}>
                        Cancha {court.courtNum}
                        {alreadyDone && <span style={{ marginLeft: 8, color: 'var(--turf-green)' }}>✓ Completada</span>}
                      </div>
                      <div style={{ display: 'flex', gap: 8 }}>
                        {isPointsMode ? (
                          <div style={{ width: 56, textAlign: 'center', fontSize: 9, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--grey-400)' }}>PTS</div>
                        ) : (
                          Array.from({ length: numSets }, (_, i) => (
                            <div key={i} style={{ width: 48, textAlign: 'center', fontSize: 9, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--grey-400)' }}>SET {i + 1}</div>
                          ))
                        )}
                      </div>
                    </div>

                    {/* Pair A */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '14px 20px', borderBottom: '1px solid var(--grey-100)' }}>
                      <div style={{ width: 64, flexShrink: 0 }}>
                        {winner === 1 && <span style={{ background: 'var(--neon)', color: 'var(--black)', fontSize: 9, fontWeight: 800, letterSpacing: '0.08em', textTransform: 'uppercase', padding: '3px 6px', whiteSpace: 'nowrap' }}>Ganador</span>}
                      </div>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: 10, color: 'var(--grey-400)', marginBottom: 2 }}>Pareja A</div>
                        <div style={{ fontWeight: 700, fontSize: 14, lineHeight: 1.3 }}>{getPairNames(court.pair1)}</div>
                      </div>
                      <div style={{ display: 'flex', gap: 8, flexShrink: 0 }}>
                        {isPointsMode ? (
                          alreadyDone ? (
                            <div style={{ width: 56, height: 56, display: 'flex', alignItems: 'center', justifyContent: 'center', border: '2px solid var(--grey-200)', fontFamily: 'var(--font-display)', fontSize: 24, fontWeight: 700, color: winner === 1 ? 'var(--black)' : 'var(--grey-400)' }}>
                              {court.pair1Score ?? '—'}
                            </div>
                          ) : (
                            <input type="number" min="0" max={ptTarget ?? 100} value={si.p1} onChange={e => handleP1Change(key, e.target.value)} placeholder="0"
                              style={{ width: 56, height: 56, textAlign: 'center', fontFamily: 'var(--font-display)', fontSize: 24, fontWeight: 700, border: '2px solid var(--grey-300)', outline: 'none', background: '#fff', color: 'var(--black)' }} />
                          )
                        ) : alreadyDone ? (
                          <div style={{ width: 56, height: 56, display: 'flex', alignItems: 'center', justifyContent: 'center', border: '2px solid var(--grey-200)', fontFamily: 'var(--font-display)', fontSize: 24, fontWeight: 700, color: winner === 1 ? 'var(--black)' : 'var(--grey-400)' }}>
                            {court.pair1Score ?? '—'}
                          </div>
                        ) : (
                          Array.from({ length: numSets }, (_, i) => (
                            <input key={i} type="number" min="0" max="99" value={courtSetInputs[i]?.p1 ?? ''}
                              onChange={e => handleSetChange(key, i, 'p1', e.target.value, numSets)} placeholder="0"
                              style={{ width: 48, height: 56, textAlign: 'center', fontFamily: 'var(--font-display)', fontSize: 20, fontWeight: 700, border: '2px solid var(--grey-300)', outline: 'none', background: '#fff', color: 'var(--black)' }} />
                          ))
                        )}
                      </div>
                    </div>

                    {/* Pair B */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '14px 20px' }}>
                      <div style={{ width: 64, flexShrink: 0 }}>
                        {winner === 2 && <span style={{ background: 'var(--neon)', color: 'var(--black)', fontSize: 9, fontWeight: 800, letterSpacing: '0.08em', textTransform: 'uppercase', padding: '3px 6px', whiteSpace: 'nowrap' }}>Ganador</span>}
                      </div>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: 10, color: 'var(--grey-400)', marginBottom: 2 }}>Pareja B</div>
                        <div style={{ fontWeight: 700, fontSize: 14, lineHeight: 1.3 }}>{getPairNames(court.pair2)}</div>
                      </div>
                      <div style={{ display: 'flex', gap: 8, flexShrink: 0 }}>
                        {isPointsMode ? (
                          alreadyDone ? (
                            <div style={{ width: 56, height: 56, display: 'flex', alignItems: 'center', justifyContent: 'center', border: '2px solid var(--grey-200)', fontFamily: 'var(--font-display)', fontSize: 24, fontWeight: 700, color: winner === 2 ? 'var(--black)' : 'var(--grey-400)' }}>
                              {court.pair2Score ?? '—'}
                            </div>
                          ) : (
                            <input type="number" min="0" max={ptTarget ?? 100} value={si.p2} onChange={e => handleP2Change(key, e.target.value)} placeholder="0"
                              style={{ width: 56, height: 56, textAlign: 'center', fontFamily: 'var(--font-display)', fontSize: 24, fontWeight: 700, border: '2px solid var(--grey-300)', outline: 'none', background: '#fff', color: 'var(--black)' }} />
                          )
                        ) : alreadyDone ? (
                          <div style={{ width: 56, height: 56, display: 'flex', alignItems: 'center', justifyContent: 'center', border: '2px solid var(--grey-200)', fontFamily: 'var(--font-display)', fontSize: 24, fontWeight: 700, color: winner === 2 ? 'var(--black)' : 'var(--grey-400)' }}>
                            {court.pair2Score ?? '—'}
                          </div>
                        ) : (
                          Array.from({ length: numSets }, (_, i) => (
                            <input key={i} type="number" min="0" max="99" value={courtSetInputs[i]?.p2 ?? ''}
                              onChange={e => handleSetChange(key, i, 'p2', e.target.value, numSets)} placeholder="0"
                              style={{ width: 48, height: 56, textAlign: 'center', fontFamily: 'var(--font-display)', fontSize: 20, fontWeight: 700, border: '2px solid var(--grey-300)', outline: 'none', background: '#fff', color: 'var(--black)' }} />
                          ))
                        )}
                      </div>
                    </div>

                    {/* Register button */}
                    {!alreadyDone && (
                      <div style={{ padding: '4px 20px 16px', display: 'flex', justifyContent: 'center' }}>
                        <button onClick={() => handleRegisterScore(currentRound.num, court.courtNum)}
                          style={{ padding: '10px 28px', background: 'var(--black)', color: '#fff', border: 'none', fontSize: 12, fontWeight: 700, cursor: 'pointer', letterSpacing: '0.08em', textTransform: 'uppercase' }}>
                          Registrar Score
                        </button>
                      </div>
                    )}
                  </div>
                );
              })}

              {/* Resting players */}
              {currentRound.resting.length > 0 && (
                <div style={{ padding: '12px 16px', background: 'var(--grey-50)', border: '1px solid var(--grey-100)', marginBottom: 16 }}>
                  <span style={{ fontSize: 10, letterSpacing: '0.1em', textTransform: 'uppercase', fontWeight: 700, color: 'var(--grey-400)' }}>Descansan: </span>
                  <span style={{ fontSize: 13, color: 'var(--grey-500)' }}>{currentRound.resting.map(pid => getName(pid)).join(', ')}</span>
                </div>
              )}
            </div>
          )}

          {/* Round history — collapsible, shown as soon as rounds are completed */}
          {game.rounds.filter(r => r.status === 'completed').length > 0 && (
            <div style={{ marginTop: 8, borderTop: '1px solid var(--grey-100)', paddingTop: 16 }}>
              <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--grey-400)', marginBottom: 12 }}>Historial de Rondas</div>
              {game.rounds.filter(r => r.status === 'completed').map(r => {
                const open = roundHistOpen[r.num] !== false; // default open
                return (
                  <div key={r.num} style={{ marginBottom: 4, border: '1px solid var(--grey-100)' }}>
                    <div
                      onClick={() => setRoundHistOpen(prev => ({ ...prev, [r.num]: !open }))}
                      style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 14px', cursor: 'pointer', background: 'var(--grey-50)', userSelect: 'none' }}
                    >
                      <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--grey-500)' }}>Ronda {r.num}</span>
                      <span style={{ fontSize: 10, color: 'var(--grey-400)', transition: 'transform 0.15s', display: 'inline-block', transform: open ? 'rotate(0deg)' : 'rotate(-90deg)' }}>▼</span>
                    </div>
                    {open && (
                      <div style={{ padding: '8px 14px 12px' }}>
                        {r.courts.map(court => {
                          const p1Winner = (court.pair1Score ?? 0) > (court.pair2Score ?? 0);
                          const p2Winner = (court.pair2Score ?? 0) > (court.pair1Score ?? 0);
                          const scoreDisplay = court.sets && court.sets.length > 0
                            ? court.sets.map(s => `${s.p1}-${s.p2}`).join('  ')
                            : `${court.pair1Score} – ${court.pair2Score}`;
                          return (
                            <div key={court.courtNum} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '7px 0', borderBottom: '1px solid var(--grey-50)', fontSize: 12 }}>
                              <span style={{ fontSize: 9, color: 'var(--grey-400)', width: 52, flexShrink: 0, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase' }}>C{court.courtNum}</span>
                              <span style={{ fontWeight: p1Winner ? 700 : 400, flex: 1, color: p1Winner ? 'var(--black)' : 'var(--grey-500)' }}>{getPairNames(court.pair1)}</span>
                              <span style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 13, minWidth: 60, textAlign: 'center', letterSpacing: '0.02em' }}>{scoreDisplay}</span>
                              <span style={{ fontWeight: p2Winner ? 700 : 400, flex: 1, textAlign: 'right', color: p2Winner ? 'var(--black)' : 'var(--grey-500)' }}>{getPairNames(court.pair2)}</span>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Live standings */}
      {isLive && game.standings.length > 0 && (
        <div style={cardStyle}>
          <div style={secTitle}>Clasificación Actual</div>
          {/* Pairs standings (live) */}
          {game.pairType === 'parejas' && (() => {
            const pairStandings = computePairStandings(game, isPointsMode);
            if (pairStandings.length === 0) return null;
            return (
              <>
                <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'var(--grey-400)', marginBottom: 12 }}>Clasificación por Parejas</div>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13, marginBottom: 24 }}>
                  <thead>
                    <tr style={{ fontSize: 10, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--grey-400)' }}>
                      <th style={{ textAlign: 'left', padding: '0 8px 10px 0', fontWeight: 700 }}>Pos</th>
                      <th style={{ textAlign: 'left', padding: '0 8px 10px 0', fontWeight: 700 }}>Equipo</th>
                      <th style={{ textAlign: 'center', padding: '0 8px 10px', fontWeight: 700 }}>PJ</th>
                      <th style={{ textAlign: 'center', padding: '0 8px 10px', fontWeight: 700 }}>W</th>
                      <th style={{ textAlign: 'center', padding: '0 8px 10px', fontWeight: 700 }}>L</th>
                      <th style={{ textAlign: 'center', padding: '0 8px 10px', fontWeight: 700 }}>T</th>
                      <th style={{ textAlign: 'center', padding: '0 8px 10px', fontWeight: 700 }}>PTS W</th>
                      <th style={{ textAlign: 'center', padding: '0 8px 10px', fontWeight: 700 }}>PTS L</th>
                      <th style={{ textAlign: 'center', padding: '0 8px 10px', fontWeight: 700 }}>+/-</th>
                    </tr>
                  </thead>
                  <tbody>
                    {pairStandings.map(({ pair, wins, losses, draws, played, diff, ptsW, ptsL }, i) => (
                      <tr key={pair.pairIndex} style={{ borderTop: '1px solid var(--grey-100)' }}>
                        <td style={{ padding: '10px 8px 10px 0', fontWeight: 800, fontSize: i < 3 ? 14 : 12 }}>
                          {i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : i + 1}
                        </td>
                        <td style={{ padding: '10px 8px 10px 0' }}>
                          <strong style={{ fontWeight: 700, fontSize: 13 }}>{pair.player1Name} / {pair.player2Name}</strong>
                        </td>
                        <td style={{ textAlign: 'center', padding: '10px 8px', color: 'var(--grey-500)' }}>{played}</td>
                        <td style={{ textAlign: 'center', padding: '10px 8px', color: 'var(--turf-green)', fontWeight: 600 }}>{wins}</td>
                        <td style={{ textAlign: 'center', padding: '10px 8px', color: '#ee0005' }}>{losses}</td>
                        <td style={{ textAlign: 'center', padding: '10px 8px', color: 'var(--grey-500)' }}>{draws}</td>
                        <td style={{ textAlign: 'center', padding: '10px 8px', fontWeight: 700 }}>{ptsW}</td>
                        <td style={{ textAlign: 'center', padding: '10px 8px', color: '#ee0005' }}>{ptsL}</td>
                        <td style={{ textAlign: 'center', padding: '10px 8px', color: diff >= 0 ? 'var(--turf-green)' : '#ee0005', fontWeight: 600 }}>{diff > 0 ? '+' : ''}{diff}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'var(--grey-400)', marginBottom: 12, borderTop: '1px solid var(--grey-100)', paddingTop: 16 }}>Clasificación Individual</div>
              </>
            );
          })()}
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
            <thead>
              <tr style={{ fontSize: 10, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--grey-400)' }}>
                <th style={{ textAlign: 'left', padding: '0 8px 8px 0', fontWeight: 700 }}>Pos</th>
                <th style={{ textAlign: 'left', padding: '0 8px 8px 0', fontWeight: 700 }}>Jugador</th>
                <th style={{ textAlign: 'center', padding: '0 8px 8px', fontWeight: 700 }}>PJ</th>
                <th style={{ textAlign: 'center', padding: '0 8px 8px', fontWeight: 700 }}>W</th>
                <th style={{ textAlign: 'center', padding: '0 8px 8px', fontWeight: 700 }}>L</th>
                <th style={{ textAlign: 'center', padding: '0 8px 8px', fontWeight: 700 }}>T</th>
                <th style={{ textAlign: 'center', padding: '0 8px 8px', fontWeight: 700 }}>PTS W</th>
                <th style={{ textAlign: 'center', padding: '0 8px 8px', fontWeight: 700 }}>PTS L</th>
                <th style={{ textAlign: 'center', padding: '0 8px 8px', fontWeight: 700 }}>+/-</th>
              </tr>
            </thead>
            <tbody>
              {(() => {
                const positions = getPositions(game.standings, isPointsMode);
                return game.standings.map((s, i) => {
                  const ds = getDisplayStats(s, isPointsMode);
                  const pos = positions[i];
                  return (
                    <tr key={s.playerId} style={{ borderTop: '1px solid var(--grey-100)' }}>
                      <td style={{ padding: '10px 8px 10px 0', fontWeight: 700, fontSize: pos <= 3 ? 14 : 12 }}>{posMedal(pos)}</td>
                      <td style={{ padding: '10px 8px 10px 0', fontWeight: 600 }}>{s.playerName}</td>
                      <td style={{ textAlign: 'center', padding: '10px 8px', color: 'var(--grey-500)' }}>{ds.pj}</td>
                      <td style={{ textAlign: 'center', padding: '10px 8px', color: 'var(--turf-green)', fontWeight: 600 }}>{ds.w}</td>
                      <td style={{ textAlign: 'center', padding: '10px 8px', color: '#ee0005' }}>{ds.l}</td>
                      <td style={{ textAlign: 'center', padding: '10px 8px', color: 'var(--grey-500)' }}>{ds.t}</td>
                      <td style={{ textAlign: 'center', padding: '10px 8px', fontWeight: 700 }}>{ds.ptsW}</td>
                      <td style={{ textAlign: 'center', padding: '10px 8px', color: '#ee0005' }}>{ds.ptsL}</td>
                      <td style={{ textAlign: 'center', padding: '10px 8px', color: ds.diff >= 0 ? 'var(--turf-green)' : '#ee0005' }}>{ds.diff > 0 ? '+' : ''}{ds.diff}</td>
                    </tr>
                  );
                });
              })()}
            </tbody>
          </table>
        </div>
      )}

      {/* ── SECTION E: Juego Finalizado ───────────────────────────────────── */}
      {isFinished && (
        <>
          {/* Final standings */}
          <div style={cardStyle}>
            <div style={secTitle}>Clasificación Final</div>
            {/* Pairs standings */}
            {game.pairType === 'parejas' && (() => {
              const pairStandings = computePairStandings(game, isPointsMode);
              if (pairStandings.length === 0) return null;
              return (
                <>
                  <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'var(--grey-400)', marginBottom: 12 }}>Clasificación por Parejas</div>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13, marginBottom: 24 }}>
                    <thead>
                      <tr style={{ fontSize: 10, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--grey-400)' }}>
                        <th style={{ textAlign: 'left', padding: '0 8px 10px 0', fontWeight: 700 }}>Pos</th>
                        <th style={{ textAlign: 'left', padding: '0 8px 10px 0', fontWeight: 700 }}>Equipo</th>
                        <th style={{ textAlign: 'center', padding: '0 8px 10px', fontWeight: 700 }}>PJ</th>
                        <th style={{ textAlign: 'center', padding: '0 8px 10px', fontWeight: 700 }}>W</th>
                        <th style={{ textAlign: 'center', padding: '0 8px 10px', fontWeight: 700 }}>L</th>
                        <th style={{ textAlign: 'center', padding: '0 8px 10px', fontWeight: 700 }}>T</th>
                        <th style={{ textAlign: 'center', padding: '0 8px 10px', fontWeight: 700 }}>PTS W</th>
                        <th style={{ textAlign: 'center', padding: '0 8px 10px', fontWeight: 700 }}>PTS L</th>
                        <th style={{ textAlign: 'center', padding: '0 8px 10px', fontWeight: 700 }}>+/-</th>
                      </tr>
                    </thead>
                    <tbody>
                      {pairStandings.map(({ pair, wins, losses, draws, played, diff, ptsW, ptsL }, i) => (
                        <tr key={pair.pairIndex} style={{ borderTop: '1px solid var(--grey-100)' }}>
                          <td style={{ padding: '12px 8px 12px 0', fontWeight: 800, fontSize: i < 3 ? 15 : 12 }}>
                            {i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : i + 1}
                          </td>
                          <td style={{ padding: '12px 8px 12px 0' }}>
                            <strong style={{ fontWeight: 700, fontSize: 13 }}>{pair.player1Name} / {pair.player2Name}</strong>
                          </td>
                          <td style={{ textAlign: 'center', padding: '12px 8px', color: 'var(--grey-500)' }}>{played}</td>
                          <td style={{ textAlign: 'center', padding: '12px 8px', color: 'var(--turf-green)', fontWeight: 600 }}>{wins}</td>
                          <td style={{ textAlign: 'center', padding: '12px 8px', color: '#ee0005' }}>{losses}</td>
                          <td style={{ textAlign: 'center', padding: '12px 8px', color: 'var(--grey-500)' }}>{draws}</td>
                          <td style={{ textAlign: 'center', padding: '12px 8px', fontWeight: 800, fontSize: 15 }}>{ptsW}</td>
                          <td style={{ textAlign: 'center', padding: '12px 8px', color: '#ee0005' }}>{ptsL}</td>
                          <td style={{ textAlign: 'center', padding: '12px 8px', color: diff >= 0 ? 'var(--turf-green)' : '#ee0005', fontWeight: 600 }}>{diff > 0 ? '+' : ''}{diff}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'var(--grey-400)', marginBottom: 12, borderTop: '1px solid var(--grey-100)', paddingTop: 16 }}>Clasificación Individual</div>
                </>
              );
            })()}
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
              <thead>
                <tr style={{ fontSize: 10, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--grey-400)' }}>
                  <th style={{ textAlign: 'left', padding: '0 8px 12px 0', fontWeight: 700 }}>Pos</th>
                  <th style={{ textAlign: 'left', padding: '0 8px 12px 0', fontWeight: 700 }}>Jugador</th>
                  <th style={{ textAlign: 'center', padding: '0 8px 12px', fontWeight: 700 }}>PJ</th>
                  <th style={{ textAlign: 'center', padding: '0 8px 12px', fontWeight: 700 }}>W</th>
                  <th style={{ textAlign: 'center', padding: '0 8px 12px', fontWeight: 700 }}>L</th>
                  <th style={{ textAlign: 'center', padding: '0 8px 12px', fontWeight: 700 }}>T</th>
                  <th style={{ textAlign: 'center', padding: '0 8px 12px', fontWeight: 700 }}>PTS W</th>
                  <th style={{ textAlign: 'center', padding: '0 8px 12px', fontWeight: 700 }}>PTS L</th>
                  <th style={{ textAlign: 'center', padding: '0 8px 12px', fontWeight: 700 }}>+/-</th>
                </tr>
              </thead>
              <tbody>
                {(() => {
                  const positions = getPositions(game.standings, isPointsMode);
                  return game.standings.map((s, i) => {
                    const ds = getDisplayStats(s, isPointsMode);
                    const pos = positions[i];
                    return (
                      <tr key={s.playerId} style={{ borderTop: '1px solid var(--grey-100)' }}>
                        <td style={{ padding: '12px 8px 12px 0', fontWeight: 800, fontSize: pos <= 3 ? 15 : 12 }}>
                          {posMedal(pos)}
                        </td>
                        <td style={{ padding: '12px 8px 12px 0', fontWeight: 600 }}>{s.playerName}</td>
                        <td style={{ textAlign: 'center', padding: '12px 8px', color: 'var(--grey-500)' }}>{ds.pj}</td>
                        <td style={{ textAlign: 'center', padding: '12px 8px', color: 'var(--turf-green)', fontWeight: 600 }}>{ds.w}</td>
                        <td style={{ textAlign: 'center', padding: '12px 8px', color: '#ee0005' }}>{ds.l}</td>
                        <td style={{ textAlign: 'center', padding: '12px 8px', color: 'var(--grey-500)' }}>{ds.t}</td>
                        <td style={{ textAlign: 'center', padding: '12px 8px', fontWeight: 800, fontSize: 15 }}>{ds.ptsW}</td>
                        <td style={{ textAlign: 'center', padding: '12px 8px', color: '#ee0005' }}>{ds.ptsL}</td>
                        <td style={{ textAlign: 'center', padding: '12px 8px', color: ds.diff >= 0 ? 'var(--turf-green)' : '#ee0005', fontWeight: 600 }}>{ds.diff > 0 ? '+' : ''}{ds.diff}</td>
                      </tr>
                    );
                  });
                })()}
              </tbody>
            </table>
          </div>

          {/* Round history for finished game */}
          <div style={cardStyle}>
            <div style={secTitle}>Historial de Rondas</div>
            {game.rounds.filter(r => r.status === 'completed').map(r => {
              const open = roundHistOpen[r.num] !== false;
              return (
                <div key={r.num} style={{ marginBottom: 4, border: '1px solid var(--grey-100)' }}>
                  <div
                    onClick={() => setRoundHistOpen(prev => ({ ...prev, [r.num]: !open }))}
                    style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 14px', cursor: 'pointer', background: 'var(--grey-50)', userSelect: 'none' }}
                  >
                    <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--grey-500)' }}>Ronda {r.num}</span>
                    <span style={{ fontSize: 10, color: 'var(--grey-400)', transition: 'transform 0.15s', display: 'inline-block', transform: open ? 'rotate(0deg)' : 'rotate(-90deg)' }}>▼</span>
                  </div>
                  {open && (
                    <div style={{ padding: '8px 14px 12px' }}>
                      {r.courts.map(court => {
                        const p1Winner = (court.pair1Score ?? 0) > (court.pair2Score ?? 0);
                        const p2Winner = (court.pair2Score ?? 0) > (court.pair1Score ?? 0);
                        const scoreDisplay = court.sets && court.sets.length > 0
                          ? court.sets.map(s => `${s.p1}-${s.p2}`).join('  ')
                          : `${court.pair1Score} – ${court.pair2Score}`;
                        return (
                          <div key={court.courtNum} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '7px 0', borderBottom: '1px solid var(--grey-50)', fontSize: 12 }}>
                            <span style={{ fontSize: 9, color: 'var(--grey-400)', width: 52, flexShrink: 0, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase' }}>C{court.courtNum}</span>
                            <span style={{ fontWeight: p1Winner ? 700 : 400, flex: 1, color: p1Winner ? 'var(--black)' : 'var(--grey-500)' }}>{getPairNames(court.pair1)}</span>
                            <span style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 13, minWidth: 60, textAlign: 'center', letterSpacing: '0.02em' }}>{scoreDisplay}</span>
                            <span style={{ fontWeight: p2Winner ? 700 : 400, flex: 1, textAlign: 'right', color: p2Winner ? 'var(--black)' : 'var(--grey-500)' }}>{getPairNames(court.pair2)}</span>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Ranking adjustments */}
          {game.standings.length > 0 && (
            <div style={cardStyle}>
              <div style={secTitle}>Ajustes de Ranking</div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: 12 }}>
                {game.standings.map(s => {
                  const delta = !isPointsMode
                    ? s.pointsFor * 3 - s.pointsAgainst          // tradicional: (setsW×3) + (setsL×-1)
                    : s.wins * 3 + s.draws - s.losses;            // puntos: (W×3) + (T×1) + (L×-1)
                  const result = delta > 0 ? 'win' : delta < 0 ? 'loss' : 'draw';
                  return (
                    <div key={s.playerId} style={{ padding: '16px', border: '1px solid var(--grey-200)', background: result === 'win' ? '#dcfce7' : result === 'loss' ? '#fee2e2' : '#fef3c7' }}>
                      <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 6 }}>{s.playerName}</div>
                      <div style={{ fontFamily: 'var(--font-display)', fontSize: 24, fontWeight: 800, color: delta > 0 ? 'var(--turf-green)' : delta < 0 ? '#ee0005' : '#b45309', letterSpacing: '-0.02em' }}>
                        {delta > 0 ? '+' : ''}{delta}
                      </div>
                      <div style={{ fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.1em', fontWeight: 700, color: result === 'win' ? '#166534' : result === 'loss' ? '#ee0005' : '#b45309', marginTop: 4 }}>
                        {result === 'win' ? 'Victoria' : result === 'loss' ? 'Derrota' : 'Empate'}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Share / history actions */}
          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
            <button
              onClick={() => setShowQR(true)}
              style={{ padding: '12px 24px', background: 'var(--black)', color: '#fff', border: 'none', fontSize: 12, fontWeight: 700, cursor: 'pointer', letterSpacing: '0.06em' }}
            >
              Compartir QR
            </button>
            <Link
              href="/dashboard/player/quick-game/history"
              style={{ padding: '12px 24px', background: 'var(--grey-100)', color: 'var(--black)', fontSize: 12, fontWeight: 700, textDecoration: 'none', display: 'inline-flex', alignItems: 'center' }}
            >
              Ver Historial →
            </Link>
          </div>
        </>
      )}
    </div>
  );
}
