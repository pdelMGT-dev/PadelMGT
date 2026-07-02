'use client';
import React, { use, useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { QRCodeSVG } from 'qrcode.react';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import { SkeletonCard } from '@/components/Skeleton';
import { useToast } from '@/components/ToastProvider';
import { getTournament, saveTournament } from '@/lib/tournament-store';
import type { Tournament } from '@/lib/tournament-store';
import { applyTournamentRankingResults } from '@/lib/ranking-store';
import {
  updateMatchScore,
  startNextRound,
  isRoundComplete,
  isGameFinished,
  calculateStandings,
} from '@/lib/game-engine';
import type { GameRound, GamePlayer, Standing, FixedPair, CourtMatch } from '@/lib/game-engine';
import {
  updateKnockoutGroupMatch,
  advanceGroupsToKnockout,
  updateKnockoutBracketMatch,
} from '@/lib/tournament-engine';
import KnockoutBracketView from '@/components/KnockoutBracketView';
import WorldCupBracketView from '@/components/WorldCupBracketView';
import MatchSetResult from '@/components/MatchSetResult';
import {
  classicAdvanceNotifications,
  classicBracketNotifications,
  createNotifications,
} from '@/lib/tournament-notifications';

// ── Types ─────────────────────────────────────────────────────────────────────

type CurrentUser = { id: string; name: string; email: string; shortId?: string; ranking?: number };

// ── Constants ─────────────────────────────────────────────────────────────────

const FORMAT_LABEL: Record<string, string> = {
  americano: 'Americano',
  mexicano: 'Mexicano',
  round_robin: 'Round Robin',
  team_league: 'Team League',
  knockout: 'Knockout',
  world_cup: 'World Cup',
};

// ── Helpers ───────────────────────────────────────────────────────────────────

function getPlayerName(tournament: Tournament, playerId: string): string {
  return tournament.players.find(p => p.id === playerId)?.name ?? playerId;
}

function getPairLabel(tournament: Tournament, ids: string[]): string {
  return ids.map(id => getPlayerName(tournament, id)).join(' / ');
}

function getRestingPlayers(tournament: Tournament, round: GameRound): GamePlayer[] {
  const playingIds = new Set<string>();
  for (const match of round.courts) {
    [...match.pair1, ...match.pair2].forEach(id => playingIds.add(id));
  }
  return tournament.players.filter(p => !playingIds.has(p.id));
}

// ── Shared styles ─────────────────────────────────────────────────────────────

const secTitle: React.CSSProperties = {
  fontSize: 9,
  letterSpacing: '0.18em',
  textTransform: 'uppercase',
  fontWeight: 700,
  color: 'var(--grey-400)',
  marginBottom: 16,
  paddingBottom: 10,
  borderBottom: '1px solid var(--grey-100)',
};

const card: React.CSSProperties = {
  background: '#fff',
  border: '1px solid var(--grey-200)',
  padding: '20px 24px',
  marginBottom: 16,
};

// ── Podium Component ──────────────────────────────────────────────────────────

function PodiumSection({ standings, fixedPairs }: { standings: Standing[], fixedPairs?: FixedPair[] }) {
  const top3 = standings.slice(0, 3);
  if (top3.length < 1) return null;

  const medals = ['🥇', '🥈', '🥉'];
  const heights = [160, 120, 90];
  const order = [1, 0, 2]; // display order: 2nd, 1st, 3rd

  function displayName(s: Standing): string {
    if (fixedPairs?.length) {
      const pair = fixedPairs.find(p => p.player1Id === s.playerId);
      if (pair) return pair.name || `${pair.player1Name} / ${pair.player2Name}`;
    }
    return s.playerName;
  }

  function subName(s: Standing): string | null {
    if (fixedPairs?.length) {
      const pair = fixedPairs.find(p => p.player1Id === s.playerId);
      if (pair && pair.name) return `${pair.player1Name} / ${pair.player2Name}`;
    }
    return null;
  }

  return (
    <div className="bs-page" style={{ background: 'var(--black)', padding: '40px 24px 0', marginBottom: 0 }}>
      <div style={{
        fontSize: 10, letterSpacing: '0.2em', textTransform: 'uppercase',
        color: 'rgba(255,255,255,0.4)', fontWeight: 700, textAlign: 'center', marginBottom: 32
      }}>
        🏆 TORNEO FINALIZADO — RESULTADOS
      </div>

      {/* Podium: 3 fixed-width (140px) columns — wider than a phone screen, so it
          scrolls horizontally inside its own box rather than dragging the page. */}
      <div className="bs-scroll-x" style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'center', gap: 2 }}>
        {order.map(i => {
          const s = top3[i];
          if (!s) return <div key={i} style={{ width: 140 }} />;
          const isFirst = i === 0;
          const platH = heights[i];
          const platColor = i === 0 ? '#c9a227' : i === 1 ? '#9e9e9e' : '#a0522d';
          const sub = subName(s);

          return (
            <div key={i} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: 140 }}>
              <div style={{ fontSize: isFirst ? 52 : 40, marginBottom: 8 }}>{medals[i]}</div>
              <div style={{
                color: '#fff', fontSize: isFirst ? 14 : 12, fontWeight: 700,
                textAlign: 'center', marginBottom: sub ? 2 : 4, maxWidth: 132,
                wordBreak: 'break-word', lineHeight: 1.3,
              }}>{displayName(s)}</div>
              {sub && (
                <div style={{
                  color: 'rgba(255,255,255,0.45)', fontSize: 10, textAlign: 'center',
                  marginBottom: 4, maxWidth: 132, wordBreak: 'break-word',
                }}>{sub}</div>
              )}
              <div style={{
                fontFamily: 'var(--font-display)', fontSize: isFirst ? 22 : 18,
                fontWeight: 700, color: platColor, marginBottom: 12
              }}>{s.pts} pts</div>
              <div style={{
                width: '100%', height: platH, background: platColor,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                boxShadow: isFirst ? `0 -4px 20px ${platColor}66` : 'none',
              }}>
                <span style={{
                  fontFamily: 'var(--font-display)', fontSize: isFirst ? 32 : 24,
                  fontWeight: 700, color: '#fff', letterSpacing: '-0.02em'
                }}>{i + 1}º</span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── Page Component ─────────────────────────────────────────────────────────────

export default function LiveTorneoPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const { showToast } = useToast();

  const { user: currentUser } = useCurrentUser();
  const [tournament, setTournament] = useState<Tournament | null | undefined>(undefined);
  const [finishConfirm, setFinishConfirm] = useState(false);
  const [copied, setCopied] = useState(false);
  const [infoOpen, setInfoOpen] = useState(true);
  const [reorgRequested, setReorgRequested] = useState(false);
  const [roundsHistOpen, setRoundsHistOpen] = useState(true);
  const [roundOpen, setRoundOpen] = useState<Record<number, boolean>>({});

  // Score inputs: key = `${roundNum}-${courtNum}`, value = { p1: string; p2: string }
  const [scoreInputs, setScoreInputs] = useState<Record<string, { p1: string; p2: string }>>({});
  const [setInputs, setSetInputs] = useState<Record<string, Array<{ p1: string; p2: string }>>>({});
  // Courts in temporary edit mode (key = `${roundNum}-${courtNum}`)
  const [editingCourts, setEditingCourts] = useState<Set<string>>(new Set());

  // Knockout group score inputs: key = `${groupId}-${courtNum}`, value = { p1: string; p2: string }
  const [koGroupInputs, setKOGroupInputs] = useState<Record<string, { p1: string; p2: string }>>({});
  const [koGroupSetInputs, setKoGroupSetInputs] = useState<Record<string, Array<{ p1: string; p2: string }>>>({});
  const [koGroupHistoryOpen, setKoGroupHistoryOpen] = useState<Record<string, boolean>>({});
  const [advanceConfirm, setAdvanceConfirm] = useState(false);
  const [standingsTab, setStandingsTab] = useState<'groups' | 'bracket'>('groups');
  const [koGroupPhaseOpen, setKoGroupPhaseOpen] = useState(true);
  const [koBracketPhaseOpen, setKoBracketPhaseOpen] = useState(true);

  // ── User loaded via useCurrentUser hook ──────────────────────────────────

  // ── Load tournament (with polling) ────────────────────────────────────────
  const loadTournament = useCallback(() => {
    const t = getTournament(id);
    setTournament(t ?? null);
  }, [id]);

  useEffect(() => {
    loadTournament();
  }, [loadTournament]);

  useEffect(() => {
    const interval = setInterval(loadTournament, 5000);
    return () => clearInterval(interval);
  }, [loadTournament]);

  // ── Auto-open active round ────────────────────────────────────────────────
  useEffect(() => {
    if (!tournament) return;
    if (tournament.status === 'finished') {
      // Open all rounds when finished
      const allOpen: Record<number, boolean> = {};
      tournament.rounds.forEach(r => { allOpen[r.num] = true; });
      setRoundOpen(allOpen);
    } else {
      const activeRound = tournament.rounds.find(r => r.status === 'active');
      if (activeRound) setRoundOpen({ [activeRound.num]: true });
    }
  }, [tournament?.currentRound, tournament?.status]);

  // ── Redirect if not live or finished ─────────────────────────────────────
  useEffect(() => {
    if (tournament && tournament.status !== 'live' && tournament.status !== 'finished') {
      router.replace(`/dashboard/player/tournaments/${id}`);
    }
  }, [tournament, id, router]);

  // ── Sync accordion states based on current knockout phase ─────────────────
  useEffect(() => {
    if (!tournament) return;
    if (tournament.format !== 'knockout' && tournament.format !== 'world_cup') return;
    const isInBracket = tournament.knockoutConfig?.currentPhase === 'bracket';
    setKoGroupPhaseOpen(!isInBracket); // groups closed when in bracket phase
    setKoBracketPhaseOpen(isInBracket);
  }, [tournament?.knockoutConfig?.currentPhase]);

  // ── Guard: loading ────────────────────────────────────────────────────────
  if (tournament === undefined) {
    return (
      <div style={{ maxWidth: 900, margin: '0 auto', padding: '32px 24px' }}>
        <div style={{ display: 'flex', gap: 16, marginBottom: 24 }}>
          <SkeletonCard style={{ flex: 1 }} rows={2} />
          <SkeletonCard style={{ flex: 1 }} rows={2} />
          <SkeletonCard style={{ flex: 1 }} rows={2} />
        </div>
        <SkeletonCard rows={4} style={{ marginBottom: 16 }} />
        <SkeletonCard rows={6} />
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
        <Link href="/dashboard/player/tournaments"
          style={{ padding: '11px 24px', background: 'var(--black)', color: '#fff', fontSize: 12, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', textDecoration: 'none' }}>
          ← Mis Torneos
        </Link>
      </div>
    );
  }

  const t = tournament;
  // Knockout and World Cup share the same group→bracket engine flow. World Cup
  // renders the bracket with the FIFA-style mirrored view.
  const isKO = t.format === 'knockout' || t.format === 'world_cup';
  const isWC = t.format === 'world_cup';

  // ── Access control ────────────────────────────────────────────────────────
  const canManage = currentUser != null && (
    t.creatorId === currentUser.id ||
    t.players.find(p => p.id === currentUser.id)?.isCreator === true
  );

  if (currentUser != null && !canManage) {
    router.replace(`/dashboard/player/tournaments/${id}/view`);
    return null;
  }

  // ── Derived data ──────────────────────────────────────────────────────────
  const isActualCreator = currentUser != null && t.creatorId === currentUser.id;
  const isFinished = t.status === 'finished';
  const currentRoundNum = t.currentRound;
  const totalRounds = t.rounds.length;
  const isMexicano = t.format === 'mexicano';
  const expectedTotalRounds = isMexicano
    ? (t.pairType === 'parejas' && t.fixedPairs ? t.fixedPairs.length : t.players.length)
    : totalRounds;

  const activeRound: GameRound | undefined = t.rounds.find(r => r.num === currentRoundNum);
  const roundComplete = activeRound ? isRoundComplete(activeRound) : false;
  const gameFinished = isGameFinished(t);

  const isPointsMode = t.scoreConfig?.type === 'points';
  const ptTarget = isPointsMode ? (t.scoreConfig?.target ?? 24) : null;
  const setsPerMatch = !isPointsMode ? (t.scoreConfig?.setsPerMatch ?? 3) : 0;

  const shareUrl = typeof window !== 'undefined'
    ? `${window.location.origin}/tournament/${t.code}`
    : `https://padelmgt.com/tournament/${t.code}`;

  // ── Tiebreak helper ───────────────────────────────────────────────────────

  function needsTiebreakSlot(inputs: Array<{p1: string; p2: string}>, setsPerMatchCount: number): boolean {
    if (setsPerMatchCount !== 2) return false;
    if (inputs.length < 2) return false;
    const s0p1 = parseInt(inputs[0]?.p1 || '0', 10); const s0p2 = parseInt(inputs[0]?.p2 || '0', 10);
    const s1p1 = parseInt(inputs[1]?.p1 || '0', 10); const s1p2 = parseInt(inputs[1]?.p2 || '0', 10);
    const set1done = inputs[0]?.p1 !== '' && inputs[0]?.p2 !== '';
    const set2done = inputs[1]?.p1 !== '' && inputs[1]?.p2 !== '';
    if (!set1done || !set2done) return false;
    const wins1 = (s0p1 > s0p2 ? 1 : 0) + (s1p1 > s1p2 ? 1 : 0);
    const wins2 = (s0p2 > s0p1 ? 1 : 0) + (s1p2 > s1p1 ? 1 : 0);
    return wins1 === 1 && wins2 === 1;
  }

  // ── Score handlers ────────────────────────────────────────────────────────

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

  function handleSaveScore(roundNum: number, courtNum: number) {
    const key = `${roundNum}-${courtNum}`;
    const raw = scoreInputs[key] ?? { p1: '', p2: '' };
    const p1 = Math.max(0, parseInt(raw.p1 || '0', 10));
    const p2 = Math.max(0, parseInt(raw.p2 || '0', 10));
    const sets = !isPointsMode
      ? (setInputs[key] ?? [])
          .map(s => ({ p1: parseInt(s.p1 || '0', 10), p2: parseInt(s.p2 || '0', 10) }))
          .filter(s => !isNaN(s.p1) && !isNaN(s.p2) && (s.p1 > 0 || s.p2 > 0))
      : undefined;
    const updated = updateMatchScore(t, roundNum, courtNum, p1, p2, sets);
    saveTournament(updated);
    setTournament(updated);
    // Exit edit mode for this court after saving
    setEditingCourts(prev => { const next = new Set(prev); next.delete(key); return next; });
    if (updated.status === 'finished') applyTournamentRankingResults(updated);
  }

  function handleEditCourt(roundNum: number, courtNum: number) {
    const key = `${roundNum}-${courtNum}`;
    const round = tournament?.rounds.find(r => r.num === roundNum);
    const court = round?.courts.find(c => c.courtNum === courtNum);
    if (court) {
      setScoreInputs(prev => ({
        ...prev,
        [key]: { p1: String(court.pair1Score ?? ''), p2: String(court.pair2Score ?? '') },
      }));
      // Pre-populate per-set inputs from saved set data
      if (court.sets && court.sets.length > 0) {
        setSetInputs(prev => ({
          ...prev,
          [key]: court.sets!.map(s => ({ p1: String(s.p1), p2: String(s.p2) })),
        }));
      }
    }
    setEditingCourts(prev => new Set(prev).add(key));
  }

  function handleTradSetChange(key: string, setIdx: number, side: 'p1' | 'p2', val: string, roundNum: number, courtNum: number) {
    setSetInputs(prev => {
      const current = prev[key] ?? Array.from({ length: setsPerMatch }, () => ({ p1: '', p2: '' }));
      // Ensure array is long enough for tiebreak slot
      const extended = [...current];
      while (extended.length <= setIdx) extended.push({ p1: '', p2: '' });
      const updated = extended.map((s, i) => i === setIdx ? { ...s, [side]: val } : s);
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

  function getInputVal(
    roundNum: number,
    courtNum: number,
    side: 'p1' | 'p2',
    court: { pair1Score: number | null; pair2Score: number | null }
  ): string {
    const key = `${roundNum}-${courtNum}`;
    if (scoreInputs[key]) return scoreInputs[key][side];
    const val = side === 'p1' ? court.pair1Score : court.pair2Score;
    return val !== null ? String(val) : '';
  }

  // ── Advance to next round ─────────────────────────────────────────────────

  function handleNextRound() {
    const next = startNextRound(t);
    const withStandings = { ...next, standings: calculateStandings(next) };
    saveTournament(withStandings);
    setTournament(withStandings);
    setScoreInputs({});
    setSetInputs({});
  }

  // ── Finish tournament ─────────────────────────────────────────────────────

  function handleFinishTournament() {
    const standings = calculateStandings(t);
    const updated: Tournament = { ...t, status: 'finished', standings };
    saveTournament(updated);
    setTournament(updated);
    applyTournamentRankingResults(updated);
    setFinishConfirm(false);
  }

  // ── Copy URL ──────────────────────────────────────────────────────────────

  function handleCopyUrl() {
    navigator.clipboard.writeText(shareUrl).catch(() => {});
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  // ── Sorted rounds ─────────────────────────────────────────────────────────
  const sortedRounds = [...t.rounds].sort((a, b) => a.num - b.num);

  // ── Score config label ────────────────────────────────────────────────────
  const scoreConfigLabel = isPointsMode
    ? `${ptTarget ?? 24} pts por partido`
    : `${t.scoreConfig?.setsPerMatch ?? 3} sets por partido`;

  // ── Creator player ────────────────────────────────────────────────────────
  const creatorPlayer = t.players.find(p => p.id === t.creatorId || p.isCreator);
  const isParejas = t.pairType === 'parejas' && (t.fixedPairs?.length ?? 0) > 0;

  function getFinishedPairLabel(pids: string[]): string {
    if (isParejas && t.fixedPairs) {
      const pair = t.fixedPairs.find(fp => pids.includes(fp.player1Id));
      if (pair) return pair.name || `${pair.player1Name} / ${pair.player2Name}`;
    }
    return pids.map(pid => t.players.find(p => p.id === pid)?.name ?? pid).join(' / ');
  }

  function getScoreDisplay(court: CourtMatch): string {
    if (court.sets && court.sets.length > 0) return court.sets.map((s: { p1: number; p2: number }) => `${s.p1}-${s.p2}`).join('  ');
    return `${court.pair1Score ?? '—'} – ${court.pair2Score ?? '—'}`;
  }

  // ── Standings panel content (shared between desktop sidebar and mobile drawer) ──
  const standingsPanelContent = (
    <div>
      {/* Panel header with tabs (shown when knockout phase has both groups and bracket) */}
      {isKO && t.groups && t.bracket && (
        <div style={{ display: 'flex', gap: 0, marginBottom: 16, borderBottom: '2px solid var(--grey-100)' }}>
          {(['groups', 'bracket'] as const).map(tab => (
            <button key={tab} onClick={() => setStandingsTab(tab)} style={{
              padding: '8px 16px', border: 'none', background: 'none', cursor: 'pointer',
              fontSize: 11, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase',
              color: standingsTab === tab ? 'var(--black)' : 'var(--grey-400)',
              borderBottom: standingsTab === tab ? '2px solid var(--black)' : '2px solid transparent',
              marginBottom: -2,
            }}>
              {tab === 'groups' ? '📊 Grupos' : '🏆 Bracket'}
            </button>
          ))}
        </div>
      )}

      {/* GROUP STANDINGS — shown when: no bracket yet, OR tab is 'groups' */}
      {t.groups && (standingsTab === 'groups' || !t.bracket) && (
        <div>
          <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: '0.16em', textTransform: 'uppercase', color: 'var(--grey-400)', marginBottom: 12 }}>
            Fase I — Grupos
          </div>
          {t.groups.groups.map(group => {
            const pairs = t.fixedPairs ?? [];
            return (
              <div key={group.id} style={{ marginBottom: 16, border: '1px solid var(--grey-200)', overflow: 'hidden' }}>
                <div style={{ padding: '7px 14px', background: 'var(--black)', color: '#fff', fontSize: 10, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase' }}>
                  {group.name}
                </div>
                <div style={{ padding: '10px 14px', overflowX: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 10 }}>
                    <thead>
                      <tr style={{ color: 'var(--grey-400)', borderBottom: '1px solid var(--grey-100)' }}>
                        <th style={{ textAlign: 'left', padding: '3px 0', fontWeight: 600, fontSize: 9, textTransform: 'uppercase', minWidth: 80 }}>Equipo</th>
                        <th style={{ textAlign: 'center', padding: '3px 3px', fontWeight: 600, fontSize: 9 }}>PJ</th>
                        <th style={{ textAlign: 'center', padding: '3px 3px', fontWeight: 600, fontSize: 9 }}>PG</th>
                        <th style={{ textAlign: 'center', padding: '3px 3px', fontWeight: 600, fontSize: 9 }}>PP</th>
                        <th style={{ textAlign: 'center', padding: '3px 3px', fontWeight: 600, fontSize: 9 }}>SF</th>
                        <th style={{ textAlign: 'center', padding: '3px 3px', fontWeight: 600, fontSize: 9 }}>SC</th>
                        <th style={{ textAlign: 'center', padding: '3px 3px', fontWeight: 600, fontSize: 9 }}>GF</th>
                        <th style={{ textAlign: 'center', padding: '3px 3px', fontWeight: 600, fontSize: 9 }}>GC</th>
                        <th style={{ textAlign: 'right', padding: '3px 0', fontWeight: 600, fontSize: 9 }}>PTS</th>
                      </tr>
                    </thead>
                    <tbody>
                      {group.standings.map((s, i) => {
                        const advancing = i < (t.knockoutConfig?.teamsAdvancing ?? 1);
                        const fp = pairs.find(p => p.player1Id === s.playerId);
                        const teamName = fp ? (fp.name?.trim() || `${fp.player1Name} / ${fp.player2Name}`) : s.playerName;
                        return (
                          <tr key={s.playerId} style={{ borderBottom: '1px solid var(--grey-50)' }}>
                            <td style={{ padding: '5px 0', fontWeight: advancing ? 700 : 400, fontSize: 10, color: advancing ? 'var(--turf-green)' : 'var(--black)', maxWidth: 100, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                              {advancing ? '↑ ' : ''}{teamName}
                            </td>
                            <td style={{ textAlign: 'center', padding: '5px 3px', color: 'var(--grey-500)' }}>{s.played}</td>
                            <td style={{ textAlign: 'center', padding: '5px 3px', color: 'var(--grey-500)' }}>{s.wins}</td>
                            <td style={{ textAlign: 'center', padding: '5px 3px', color: 'var(--grey-500)' }}>{s.losses}</td>
                            <td style={{ textAlign: 'center', padding: '5px 3px', color: 'var(--grey-500)' }}>{s.pointsFor}</td>
                            <td style={{ textAlign: 'center', padding: '5px 3px', color: 'var(--grey-500)' }}>{s.pointsAgainst}</td>
                            <td style={{ textAlign: 'center', padding: '5px 3px', color: 'var(--grey-500)' }}>{s.gamesFor ?? 0}</td>
                            <td style={{ textAlign: 'center', padding: '5px 3px', color: 'var(--grey-500)' }}>{s.gamesAgainst ?? 0}</td>
                            <td style={{ textAlign: 'right', padding: '5px 0', fontFamily: 'var(--font-display)', fontSize: 13, fontWeight: 700 }}>{s.pts}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* BRACKET — shown when tab is 'bracket' and bracket exists */}
      {t.bracket && (standingsTab === 'bracket' || !t.groups) && (
        <div>
          {t.groups && (
            <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: '0.16em', textTransform: 'uppercase', color: 'var(--grey-400)', marginBottom: 12 }}>
              Fase II — Bracket
            </div>
          )}
          {isWC ? (
            <WorldCupBracketView
              bracket={t.bracket}
              fixedPairs={t.fixedPairs}
              players={t.players}
              scoreConfig={t.scoreConfig}
              isEditable={false}
            />
          ) : (
            <KnockoutBracketView
              bracket={t.bracket}
              fixedPairs={t.fixedPairs}
              players={t.players}
              scoreConfig={t.scoreConfig}
              isEditable={false}
            />
          )}
        </div>
      )}

      {/* Americano/Mexicano/Round Robin standings */}
      {!isKO && t.standings && t.standings.length > 0 && (
        <div>
          <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: '0.16em', textTransform: 'uppercase', color: 'var(--grey-400)', marginBottom: 12 }}>
            Clasificación
          </div>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 11 }}>
            <thead>
              <tr style={{ color: 'var(--grey-400)', borderBottom: '1px solid var(--grey-100)' }}>
                <th style={{ textAlign: 'left', padding: '4px 0', fontWeight: 600, fontSize: 9, textTransform: 'uppercase' }}>#</th>
                <th style={{ textAlign: 'left', padding: '4px 8px', fontWeight: 600, fontSize: 9, textTransform: 'uppercase' }}>Jugador</th>
                <th style={{ textAlign: 'center', padding: '4px 4px', fontWeight: 600, fontSize: 9 }}>PJ</th>
                <th style={{ textAlign: 'center', padding: '4px 4px', fontWeight: 600, fontSize: 9 }}>PG</th>
                <th style={{ textAlign: 'right', padding: '4px 0', fontWeight: 600, fontSize: 9 }}>PTS</th>
              </tr>
            </thead>
            <tbody>
              {t.standings.map((s, i) => (
                <tr key={s.playerId} style={{ borderBottom: '1px solid var(--grey-50)' }}>
                  <td style={{ padding: '5px 0', fontSize: 11, color: 'var(--grey-400)', fontWeight: 700 }}>{i + 1}</td>
                  <td style={{ padding: '5px 8px', fontWeight: i < 3 ? 700 : 400, fontSize: 11, color: 'var(--black)' }}>{s.playerName}</td>
                  <td style={{ textAlign: 'center', padding: '5px 4px', color: 'var(--grey-500)' }}>{s.played}</td>
                  <td style={{ textAlign: 'center', padding: '5px 4px', color: 'var(--grey-500)' }}>{s.wins}</td>
                  <td style={{ textAlign: 'right', padding: '5px 0', fontFamily: 'var(--font-display)', fontSize: 13, fontWeight: 700 }}>{s.pts}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {!t.groups && !t.bracket && !isKO && t.standings.length === 0 && (
        <div style={{ color: 'var(--grey-400)', fontSize: 12, textAlign: 'center', padding: '24px 0' }}>
          Las clasificaciones aparecerán aquí al registrar los primeros resultados.
        </div>
      )}
    </div>
  );

  // ── Permanent finished view ───────────────────────────────────────────────
  if (isFinished) {
    const finalStandings = calculateStandings(t);

    const rankingDeltas = finalStandings.map(s => {
      const wins = s.wins;
      const draws = s.draws ?? 0;
      const losses = s.losses ?? (s.played - wins - draws);
      const delta = wins * 3 + draws * 1 + losses * (-1);
      return {
        playerId: s.playerId,
        playerName: s.playerName,
        delta,
        result: (delta > 0 ? 'win' : delta < 0 ? 'loss' : 'draw') as 'win' | 'loss' | 'draw',
      };
    }).sort((a, b) => b.delta - a.delta);

    const secLabel: React.CSSProperties = {
      fontSize: 9, fontWeight: 700, letterSpacing: '0.18em', textTransform: 'uppercase',
      color: 'var(--grey-400)', marginBottom: 0,
    };

    const thS = (left?: boolean): React.CSSProperties => ({
      padding: '6px 8px', textAlign: left ? 'left' : 'center',
      fontSize: 9, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--grey-400)',
    });
    const tdC: React.CSSProperties = { padding: '7px 8px', textAlign: 'center', fontSize: 12 };
    const tdL: React.CSSProperties = { padding: '7px 8px', textAlign: 'left', fontSize: 12 };

    return (
      <div className="bs-page" style={{ paddingBottom: 80, background: 'var(--grey-50)', minHeight: '100vh' }}>

        {/* ── Tournament name header ── */}
        <div style={{ background: 'var(--black)', padding: '14px 32px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Link href={`/dashboard/player/tournaments/${id}`} style={{ color: 'var(--grey-300)', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', textDecoration: 'none', whiteSpace: 'nowrap' }}>
            ← Gestionar
          </Link>
          <div style={{ flex: 1, textAlign: 'center', padding: '0 16px' }}>
            <div style={{ fontFamily: 'var(--font-display)', fontSize: 18, fontWeight: 700, textTransform: 'uppercase', color: '#fff', lineHeight: 1.2 }}>{t.name}</div>
            <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.4)', marginTop: 3 }}>{t.date} · {t.club}, {t.city}</div>
          </div>
          <span style={{ fontSize: 9, fontWeight: 700, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'var(--bs-light)', padding: '3px 10px', border: '1px solid var(--court-blue)', whiteSpace: 'nowrap' }}>
            FINALIZADO
          </span>
        </div>

        {/* ── Podium ── */}
        <PodiumSection standings={finalStandings} fixedPairs={t.fixedPairs} />

        {/* ── Content ── */}
        <div style={{ maxWidth: 900, margin: '0 auto', padding: '32px 32px' }}>

          {/* ── INFO DEL TORNEO (collapsible) ── */}
          <div style={{ background: '#fff', border: '1px solid var(--grey-200)', marginBottom: 16 }}>
            <button onClick={() => setInfoOpen(o => !o)}
              style={{ width: '100%', display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '14px 20px', background: 'none', border: 'none', cursor: 'pointer' }}>
              <span style={secLabel}>Info del Torneo</span>
              <span style={{ fontSize: 12, color: 'var(--grey-400)', transform: infoOpen ? 'rotate(0deg)' : 'rotate(-90deg)', transition: 'transform 0.2s', display: 'inline-block' }}>▼</span>
            </button>
            {infoOpen && (
              <div className="bs-stack-mobile" style={{ padding: '0 20px 20px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24 }}>
                <div>
                  {[
                    ['Formato', FORMAT_LABEL[t.format] ?? t.format],
                    ['Modo', t.pairType === 'parejas' ? 'Parejas fijas' : 'Individual'],
                    ['Jugadores', `${t.players.length}/${t.maxPlayers}`],
                    ['Rondas', String(sortedRounds.length)],
                    ['Puntuación', scoreConfigLabel],
                    ['Club', t.club],
                    ['Ciudad', t.city],
                  ].map(([label, val]) => (
                    <div key={label} style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
                      <span style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--grey-400)', minWidth: 90 }}>{label}</span>
                      <span style={{ fontSize: 12, color: 'var(--black)' }}>{val}</span>
                    </div>
                  ))}
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
                  <span style={{ fontSize: 9, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--grey-400)' }}>Código QR</span>
                  <QRCodeSVG value={shareUrl} size={100} />
                  <span style={{ fontSize: 10, color: 'var(--grey-400)' }}>{t.code}</span>
                </div>
              </div>
            )}
          </div>

          {/* ── HISTORIAL DE RONDAS (collapsible section) ── */}
          <div style={{ background: '#fff', border: '1px solid var(--grey-200)', marginBottom: 16 }}>
            <button onClick={() => setRoundsHistOpen(o => !o)}
              style={{ width: '100%', display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '14px 20px', background: 'none', border: 'none', cursor: 'pointer' }}>
              <span style={secLabel}>Historial de Rondas</span>
              <span style={{ fontSize: 12, color: 'var(--grey-400)', transform: roundsHistOpen ? 'rotate(0deg)' : 'rotate(-90deg)', transition: 'transform 0.2s', display: 'inline-block' }}>▼</span>
            </button>
            {roundsHistOpen && (
              <div style={{ padding: '0 12px 12px' }}>
                {sortedRounds.map(round => {
                  const rOpen = roundOpen[round.num] !== false;
                  return (
                    <div key={round.num} style={{ marginBottom: 4, border: '1px solid var(--grey-100)' }}>
                      <button onClick={() => setRoundOpen(prev => ({ ...prev, [round.num]: !rOpen }))}
                        style={{ width: '100%', display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '9px 14px', background: 'var(--grey-50)', border: 'none', cursor: 'pointer' }}>
                        <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--grey-600)' }}>Ronda {round.num}</span>
                        <span style={{ fontSize: 11, color: 'var(--grey-400)', transform: rOpen ? 'rotate(0deg)' : 'rotate(-90deg)', transition: 'transform 0.15s', display: 'inline-block' }}>▼</span>
                      </button>
                      {rOpen && (
                        <div style={{ padding: '6px 14px 10px' }}>
                          {round.courts.map(court => {
                            const p1W = (court.pair1Score ?? 0) > (court.pair2Score ?? 0);
                            const p2W = (court.pair2Score ?? 0) > (court.pair1Score ?? 0);
                            const hasSets = court.sets && court.sets.length > 0;
                            return (
                              <div key={court.courtNum} style={{ marginBottom: 6, border: '1px solid var(--grey-100)', overflow: 'hidden' }}>
                                {/* Header: court label + set column labels */}
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '5px 10px', background: 'var(--grey-50)', borderBottom: '1px solid var(--grey-100)' }}>
                                  <span style={{ fontSize: 9, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--grey-500)' }}>Cancha {court.courtNum}</span>
                                  <div style={{ display: 'flex', gap: 2 }}>
                                    {hasSets
                                      ? court.sets!.map((_, i) => (
                                          <div key={i} style={{ width: 34, textAlign: 'center', fontSize: 8, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--grey-400)' }}>S{i + 1}</div>
                                        ))
                                      : <div style={{ width: 48, textAlign: 'center', fontSize: 8, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--grey-400)' }}>PTS</div>
                                    }
                                  </div>
                                </div>
                                {/* Pair 1 row */}
                                <div style={{ display: 'flex', alignItems: 'center', padding: '6px 10px', borderBottom: '1px solid var(--grey-50)' }}>
                                  <span style={{ flex: 1, fontSize: 12, fontWeight: p1W ? 700 : 400, color: p1W ? 'var(--black)' : 'var(--grey-500)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{getFinishedPairLabel(court.pair1)}</span>
                                  <div style={{ display: 'flex', gap: 2, flexShrink: 0 }}>
                                    {hasSets
                                      ? court.sets!.map((s, i) => (
                                          <div key={i} style={{ width: 34, textAlign: 'center', fontFamily: 'var(--font-display)', fontSize: 13, fontWeight: s.p1 > s.p2 ? 700 : 400, color: s.p1 > s.p2 ? 'var(--black)' : 'var(--grey-400)' }}>{s.p1}</div>
                                        ))
                                      : <div style={{ width: 48, textAlign: 'center', fontFamily: 'var(--font-display)', fontSize: 13, fontWeight: p1W ? 700 : 400, color: p1W ? 'var(--black)' : 'var(--grey-400)' }}>{court.pair1Score ?? '—'}</div>
                                    }
                                  </div>
                                </div>
                                {/* Pair 2 row */}
                                <div style={{ display: 'flex', alignItems: 'center', padding: '6px 10px' }}>
                                  <span style={{ flex: 1, fontSize: 12, fontWeight: p2W ? 700 : 400, color: p2W ? 'var(--black)' : 'var(--grey-500)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{getFinishedPairLabel(court.pair2)}</span>
                                  <div style={{ display: 'flex', gap: 2, flexShrink: 0 }}>
                                    {hasSets
                                      ? court.sets!.map((s, i) => (
                                          <div key={i} style={{ width: 34, textAlign: 'center', fontFamily: 'var(--font-display)', fontSize: 13, fontWeight: s.p2 > s.p1 ? 700 : 400, color: s.p2 > s.p1 ? 'var(--black)' : 'var(--grey-400)' }}>{s.p2}</div>
                                        ))
                                      : <div style={{ width: 48, textAlign: 'center', fontFamily: 'var(--font-display)', fontSize: 13, fontWeight: p2W ? 700 : 400, color: p2W ? 'var(--black)' : 'var(--grey-400)' }}>{court.pair2Score ?? '—'}</div>
                                    }
                                  </div>
                                </div>
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

          {/* ── TABLA FINAL DE CLASIFICACIÓN ── */}
          <div style={{ background: '#fff', border: '1px solid var(--grey-200)', marginBottom: 16, overflow: 'hidden' }}>
            <div style={{ background: 'var(--black)', color: '#fff', padding: '10px 16px', fontSize: 10, fontWeight: 700, letterSpacing: '0.14em', textTransform: 'uppercase' }}>
              Tabla Final de Clasificación
            </div>
            <div className="table-scroll">
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
              <thead>
                <tr style={{ borderBottom: '2px solid var(--grey-100)' }}>
                  <th style={thS()}>POS</th>
                  <th style={thS(true)}>{isParejas ? 'EQUIPO' : 'JUGADOR'}</th>
                  <th style={thS()}>PJ</th>
                  <th style={thS()}>W</th>
                  <th style={thS()}>D</th>
                  <th style={thS()}>L</th>
                  <th style={thS()}>PTS</th>
                  <th style={thS()}>+/-</th>
                </tr>
              </thead>
              <tbody>
                {finalStandings.map((s, i) => {
                  const isMe = currentUser && (s.playerId === currentUser.id || s.player2Id === currentUser.id);
                  const rowLabel = s.playerName;
                  const posIcon = i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : String(i + 1);
                  return (
                    <tr key={s.playerId} style={{ borderBottom: '1px solid var(--grey-100)', background: isMe ? 'rgba(26,78,216,0.1)' : 'transparent' }}>
                      <td style={{ ...tdC, fontFamily: 'var(--font-display)', fontWeight: 700 }}>{posIcon}</td>
                      <td style={{ ...tdL, fontWeight: isMe ? 700 : 500 }}>
                        {rowLabel}{isMe && <span style={{ marginLeft: 4, fontSize: 10, color: 'var(--grey-400)' }}>(tú)</span>}
                      </td>
                      <td style={tdC}>{s.played}</td>
                      <td style={tdC}>{s.wins}</td>
                      <td style={tdC}>{s.draws ?? 0}</td>
                      <td style={tdC}>{s.losses ?? 0}</td>
                      <td style={{ ...tdC, fontFamily: 'var(--font-display)', fontWeight: 700 }}>{s.pts}</td>
                      <td style={{ ...tdC, color: s.diff >= 0 ? 'var(--turf-green, #16a34a)' : '#dc2626' }}>{s.diff > 0 ? `+${s.diff}` : s.diff}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            </div>
          </div>

          {/* ── AJUSTES DE RANKING (matrix) ── */}
          <div style={{ background: '#fff', border: '1px solid var(--grey-200)', padding: '20px' }}>
            <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: '0.18em', textTransform: 'uppercase', color: 'var(--grey-400)', marginBottom: 16 }}>
              Ajustes de Ranking
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: 10 }}>
              {rankingDeltas.map(rd => (
                <div key={rd.playerId} style={{
                  padding: '16px',
                  background: rd.result === 'win' ? '#dcfce7' : rd.result === 'loss' ? '#fee2e2' : '#fef3c7',
                }}>
                  <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 6, color: 'var(--black)' }}>{rd.playerName}</div>
                  <div style={{
                    fontFamily: 'var(--font-display)', fontSize: 28, fontWeight: 800, letterSpacing: '-0.02em',
                    color: rd.delta > 0 ? '#166534' : rd.delta < 0 ? '#ee0005' : '#b45309',
                  }}>
                    {rd.delta > 0 ? '+' : ''}{rd.delta}
                  </div>
                  <div style={{ fontSize: 9, textTransform: 'uppercase', letterSpacing: '0.12em', fontWeight: 700, marginTop: 4, color: rd.result === 'win' ? '#166534' : rd.result === 'loss' ? '#ee0005' : '#b45309' }}>
                    {rd.result === 'win' ? 'Victoria' : rd.result === 'loss' ? 'Derrota' : 'Empate'}
                  </div>
                </div>
              ))}
            </div>
          </div>

        </div>
        <style>{`@keyframes pulse{0%,100%{opacity:1;transform:scale(1)}50%{opacity:0.5;transform:scale(1.3)}}`}</style>
      </div>
    );
  }

  return (
    <div>

      {/* ── Sticky top bar ── */}
      {/* Not stacked via bs-actions-row: this bar is position:sticky and stays on
          screen while scoring — stacking it to 3 rows would permanently eat
          vertical space. Instead it just wraps + gets tighter side padding. */}
      <div style={{
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        padding: '14px 32px', background: 'var(--black)', color: '#fff',
        position: 'sticky', top: 0, zIndex: 20, gap: 12, flexWrap: 'wrap',
      }}>
        <Link href={`/dashboard/player/tournaments/${id}`}
          style={{ fontSize: 12, color: 'var(--grey-300)', textDecoration: 'none', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', whiteSpace: 'nowrap' }}>
          ← Gestionar
        </Link>
        <div style={{ flex: 1, textAlign: 'center' }}>
          <div style={{ fontFamily: 'var(--font-display)', fontSize: 16, fontWeight: 700, letterSpacing: '0.05em', textTransform: 'uppercase', color: '#fff', lineHeight: 1.2 }}>
            {t.name}
          </div>
          <div style={{ fontSize: 11, color: 'var(--grey-400)', marginTop: 2 }}>
            {isKO
              ? (t.knockoutConfig?.currentPhase === 'group_stage' ? 'Fase I: Grupos' : 'Fase II: Cuadro')
              : `Ronda ${currentRoundNum} / ${expectedTotalRounds}`}
          </div>
        </div>
        {!isFinished && (!finishConfirm ? (
          <button
            onClick={() => setFinishConfirm(true)}
            style={{ padding: '8px 16px', background: '#dc2626', color: '#fff', border: 'none', cursor: 'pointer', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', whiteSpace: 'nowrap' }}>
            Finalizar Torneo
          </button>
        ) : (
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <span style={{ fontSize: 10, color: '#fca5a5', fontWeight: 700 }}>¿Seguro?</span>
            <button onClick={handleFinishTournament}
              style={{ padding: '7px 12px', background: '#dc2626', color: '#fff', border: 'none', cursor: 'pointer', fontSize: 10, fontWeight: 700, textTransform: 'uppercase' }}>
              Sí
            </button>
            <button onClick={() => setFinishConfirm(false)}
              style={{ padding: '7px 10px', background: 'transparent', color: 'var(--grey-300)', border: '1px solid var(--grey-500)', cursor: 'pointer', fontSize: 10, fontWeight: 700, textTransform: 'uppercase' }}>
              No
            </button>
          </div>
        ))}
      </div>

      {/* ── Body: single column ── */}
      <div>

      {/* ── Main column ── */}
      <div className="bs-page" style={{
        maxWidth: 1400,
        margin: '0 auto',
        padding: '24px 32px',
      }}>

        {/* ── INFO PANEL: collapsible accordion ── */}
        <div style={{ marginBottom: 32 }}>
          {/* Accordion header */}
          <div
            onClick={() => setInfoOpen(o => !o)}
            style={{
              display: 'flex', justifyContent: 'space-between', alignItems: 'center',
              padding: '12px 24px', background: '#fff', border: '1px solid var(--grey-200)',
              cursor: 'pointer', marginBottom: 1,
            }}
          >
            <div style={{
              fontSize: 10, fontWeight: 700, letterSpacing: '0.14em',
              textTransform: 'uppercase', color: 'var(--grey-500)',
            }}>
              DETALLES DEL TORNEO
            </div>
            <span style={{
              fontSize: 18, color: 'var(--grey-400)',
              transform: infoOpen ? 'rotate(0deg)' : 'rotate(-90deg)',
              transition: 'transform 0.2s',
              display: 'inline-block',
            }}>
              ▼
            </span>
          </div>

          {/* 3-column grid — collapsible */}
          {infoOpen && (
            <div className="bs-stack-mobile" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 16, marginTop: 8 }}>

              {/* Col 1: Detalles del torneo */}
              <div style={card}>
                <div style={secTitle}>Detalles del Torneo</div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8, fontSize: 13 }}>
                  <div>
                    <span style={{ fontWeight: 700, color: 'var(--black)' }}>{t.name}</span>
                  </div>
                  <InfoRow label="Formato" value={FORMAT_LABEL[t.format] ?? t.format} />
                  <InfoRow label="Modalidad" value={t.pairType === 'parejas' ? 'Parejas Fijas' : 'Individual'} />
                  <InfoRow label="Mixto" value={(t as Tournament & { mixto?: boolean }).mixto ? 'Sí' : 'No'} />
                  <InfoRow label="Puntuación" value={scoreConfigLabel} />
                  <InfoRow label="Canchas" value={String(t.courts)} />
                  <InfoRow label="Fecha" value={t.date} />
                  <InfoRow label="Hora" value={t.time} />
                  {t.club && <InfoRow label="Club" value={t.club} />}
                  {t.city && <InfoRow label="Ciudad" value={t.city} />}
                  {isKO && t.knockoutConfig && (
                    <>
                      <InfoRow label="Grupos" value={t.knockoutConfig.hasGroups ? `${t.knockoutConfig.numGroups} grupos` : 'Sin grupos'} />
                      {t.knockoutConfig.hasGroups && (
                        <InfoRow label="Clasifican" value={`${t.knockoutConfig.teamsAdvancing} por grupo`} />
                      )}
                      {t.knockoutConfig.hasGroups && t.groupScoreConfig && (
                        <InfoRow label="Score grupos" value={`${t.groupScoreConfig.setsPerMatch ?? 3} sets`} />
                      )}
                      <InfoRow label="Score knockout" value={`${t.scoreConfig?.setsPerMatch ?? 3} sets`} />
                    </>
                  )}
                </div>
              </div>

              {/* Col 2: Jugadores / Equipos */}
              <div style={card}>
                {t.pairType === 'parejas' && t.fixedPairs && t.fixedPairs.length > 0 ? (
                  <>
                    <div style={secTitle}>Equipos ({t.fixedPairs.length}/{Math.floor(t.maxPlayers / 2)})</div>
                    <div style={{ fontSize: 11, color: 'var(--grey-500)', marginBottom: 12 }}>
                      Equipos confirmados: <strong>{t.fixedPairs.length}</strong>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                      {t.fixedPairs.map((fp, i) => {
                        const isCreatorPair = fp.player1Id === t.creatorId || fp.player2Id === t.creatorId;
                        const label = fp.name?.trim() || `${fp.player1Name} / ${fp.player2Name}`;
                        return (
                          <div key={fp.pairIndex} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12 }}>
                            <span style={{ fontSize: 10, color: 'var(--grey-400)', minWidth: 18, textAlign: 'right', fontWeight: 700 }}>{i + 1}.</span>
                            <div>
                              <span style={{ fontWeight: isCreatorPair ? 700 : 400, color: 'var(--black)' }}>{label}</span>
                              {fp.name?.trim() && <div style={{ fontSize: 10, color: 'var(--grey-400)' }}>{fp.player1Name} / {fp.player2Name}</div>}
                            </div>
                            {isCreatorPair && <span style={{ fontSize: 12, color: '#f59e0b' }}>★</span>}
                          </div>
                        );
                      })}
                    </div>
                  </>
                ) : (
                  <>
                    <div style={secTitle}>Jugadores ({t.players.length}/{t.maxPlayers})</div>
                    <div style={{ fontSize: 11, color: 'var(--grey-500)', marginBottom: 12 }}>
                      Jugadores confirmados: <strong>{t.players.length}</strong>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                      {t.players.map((p, i) => {
                        const isCreatorPlayer = p.id === t.creatorId || p.isCreator;
                        return (
                          <div key={p.id} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12 }}>
                            <span style={{ fontSize: 10, color: 'var(--grey-400)', minWidth: 18, textAlign: 'right', fontWeight: 700 }}>{i + 1}.</span>
                            <span style={{ fontWeight: isCreatorPlayer ? 700 : 400, color: 'var(--black)' }}>{p.name}</span>
                            {isCreatorPlayer && <span style={{ fontSize: 12, color: '#f59e0b' }}>★</span>}
                          </div>
                        );
                      })}
                    </div>
                  </>
                )}
              </div>

              {/* Col 3: QR Código */}
              <div style={card}>
                <div style={secTitle}>QR Código</div>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 }}>
                  <QRCodeSVG value={shareUrl} size={120} />
                  <div style={{ fontFamily: 'monospace', fontSize: 13, fontWeight: 700, color: 'var(--black)', letterSpacing: '0.1em' }}>
                    {t.code}
                  </div>
                  <button
                    onClick={handleCopyUrl}
                    style={{
                      padding: '7px 16px',
                      background: copied ? 'var(--turf-green)' : 'var(--black)',
                      color: '#fff',
                      border: 'none',
                      cursor: 'pointer',
                      fontSize: 11,
                      fontWeight: 700,
                      textTransform: 'uppercase',
                      letterSpacing: '0.06em',
                      transition: 'background 0.2s',
                    }}>
                    {copied ? '✓ Copiado' : 'Copiar URL'}
                  </button>
                  <div style={{ fontSize: 10, color: 'var(--grey-400)', textAlign: 'center', wordBreak: 'break-all' }}>
                    {shareUrl}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* ── REORGANIZATION REQUEST ── */}
        {isActualCreator && !isFinished && (
          <div style={{ marginBottom: 24 }}>
            {(t.reorganizationRequested || reorgRequested) ? (
              <div style={{ display: 'flex', gap: 12, alignItems: 'center', padding: '14px 20px', background: '#fefce8', border: '1px solid #fde047', borderRadius: 6 }}>
                <span style={{ fontSize: 16 }}>⏳</span>
                <div>
                  <div style={{ fontWeight: 700, fontSize: 13, color: '#854d0e' }}>Solicitud de reorganización enviada</div>
                  <div style={{ fontSize: 12, color: '#a16207', marginTop: 2 }}>El SA puede revertir el torneo a estado de gestión para que puedas editar los equipos.</div>
                </div>
              </div>
            ) : (
              <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                <button
                  onClick={() => {
                    const updated: Tournament = {
                      ...t,
                      reorganizationRequested: true,
                      reorganizationRequestedAt: new Date().toISOString(),
                    };
                    saveTournament(updated);
                    setTournament(updated);
                    setReorgRequested(true);
                  }}
                  style={{ padding: '9px 20px', background: '#fff', color: '#92400e', border: '1px solid #fde047', cursor: 'pointer', fontSize: 12, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em' }}
                >
                  ✎ Solicitar reorganización de equipos
                </button>
              </div>
            )}
          </div>
        )}

        {/* ── KNOCKOUT: Group Stage accordion ── */}
        {isKO && t.groups && (() => {
          const groupPhaseActive = t.knockoutConfig?.currentPhase === 'group_stage';
          const groupPhaseComplete = t.knockoutConfig?.currentPhase === 'bracket';
          const allMatches = t.groups.groups.flatMap(g => g.matches);
          const allGroupMatchesDone = allMatches.every(m => m.status === 'completed');
          const maxRound = allMatches.reduce((acc, m) => Math.max(acc, m.roundNum ?? 1), 1);
          const groupSets = (t.groupScoreConfig ?? t.scoreConfig)?.setsPerMatch ?? 3;

          // Find active wave: lowest roundNum with any incomplete match
          let activeWave = maxRound + 1; // sentinel: all done
          for (let w = 1; w <= maxRound; w++) {
            if (allMatches.some(m => (m.roundNum ?? 1) === w && m.status !== 'completed')) {
              activeWave = w;
              break;
            }
          }

          const pairs = t.fixedPairs ?? [];

          function getGroupPairLabel(ids: string[]): string {
            const fp = pairs.find(p => p.player1Id === ids[0]);
            return fp ? (fp.name?.trim() || `${fp.player1Name} / ${fp.player2Name}`) : ids[0] ?? '?';
          }

          function handleGroupScoreWithSets(groupId: string, courtNum: number, key: string) {
            const inputs = koGroupSetInputs[key] ?? Array.from({ length: groupSets }, () => ({ p1: '0', p2: '0' }));
            const setData = inputs.map(s => ({
              p1: parseInt(s.p1 || '0', 10),
              p2: parseInt(s.p2 || '0', 10),
            }));
            const s1 = setData.filter(s => s.p1 > s.p2).length;
            const s2 = setData.filter(s => s.p2 > s.p1).length;
            const updated = updateKnockoutGroupMatch(t, groupId, courtNum, s1, s2, setData);
            saveTournament(updated);
            setTournament(updated);
            setKoGroupSetInputs(prev => { const n = { ...prev }; delete n[key]; return n; });
          }

          return (
            <div style={{ marginBottom: 8 }}>
              {/* Accordion header */}
              <div
                onClick={() => setKoGroupPhaseOpen(o => !o)}
                style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 24px', background: '#fff', border: '1px solid var(--grey-200)', cursor: 'pointer', marginBottom: 1 }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <span style={{ fontFamily: 'var(--font-display)', fontSize: 12, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em' }}>Fase I — Grupos</span>
                  {groupPhaseComplete && <span style={{ fontSize: 11, color: 'var(--grey-400)', fontWeight: 600 }}>✓ COMPLETADA</span>}
                  {groupPhaseActive && <span style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, color: 'var(--turf-green)', fontWeight: 600 }}><span style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--turf-green)', display: 'inline-block', animation: 'pulse 2s infinite' }} />EN JUEGO</span>}
                </div>
                <span style={{ fontSize: 14, color: 'var(--grey-400)', transform: koGroupPhaseOpen ? 'rotate(0deg)' : 'rotate(-90deg)', transition: 'transform 0.2s', display: 'inline-block' }}>▼</span>
              </div>
              {/* Accordion content */}
              {(koGroupPhaseOpen && groupPhaseActive) && (
              <div style={{ marginBottom: 0 }}>
              {/* Section header */}
              <div className="bs-actions-row" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                <div>
                  <div style={{ fontSize: 9, letterSpacing: '0.18em', textTransform: 'uppercase', fontWeight: 700, color: 'var(--grey-400)' }}>
                    Fase I — Grupos
                  </div>
                  {!allGroupMatchesDone && activeWave <= maxRound && (
                    <div style={{ fontSize: 12, color: 'var(--grey-600)', marginTop: 4 }}>
                      Ronda de grupos {activeWave} / {maxRound}
                    </div>
                  )}
                </div>
                {allGroupMatchesDone && !advanceConfirm && (
                  <button onClick={() => setAdvanceConfirm(true)}
                    style={{ padding: '9px 20px', background: 'var(--black)', color: 'var(--bs-light)', border: 'none', cursor: 'pointer', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                    Avanzar al Cuadro →
                  </button>
                )}
                {advanceConfirm && (
                  <div className="bs-actions-buttons" style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                    <span style={{ fontSize: 11, fontWeight: 700, color: '#854d0e' }}>¿Confirmar?</span>
                    <button onClick={() => {
                      const advanced = advanceGroupsToKnockout(t);
                      // Notify qualified pairs (and their first bracket match) as the cuadro fills.
                      const { items, notifiedEvents } = classicAdvanceNotifications(advanced);
                      const updated = { ...advanced, notifiedEvents };
                      saveTournament(updated);
                      setTournament(updated);
                      if (items.length) void createNotifications(updated.id, 'torneo', items);
                      setAdvanceConfirm(false);
                    }} style={{ padding: '7px 14px', background: 'var(--black)', color: 'var(--bs-light)', border: 'none', cursor: 'pointer', fontSize: 11, fontWeight: 700, textTransform: 'uppercase' }}>
                      Sí
                    </button>
                    <button onClick={() => setAdvanceConfirm(false)}
                      style={{ padding: '7px 12px', background: 'transparent', border: '1px solid var(--grey-200)', cursor: 'pointer', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', color: 'var(--grey-500)' }}>
                      No
                    </button>
                  </div>
                )}
              </div>

              {(() => {
                // Flatten all matches across groups, keeping a reference to the
                // group each belongs to, so we can list them by round (not by
                // group column). Standings live in the CLASIFICACIÓN section below.
                const allFlat = t.groups!.groups.flatMap(g =>
                  g.matches.map(match => ({ group: g, match })),
                );
                const activeMatches = allFlat.filter(({ match }) =>
                  (match.roundNum ?? 1) === activeWave && match.status !== 'completed',
                );
                const doneMatches = allFlat.filter(({ match }) => match.status === 'completed');
                const historyOpen = koGroupHistoryOpen['__all__'] ?? true;

                const groupChip = (label: string, small?: boolean) => (
                  <span style={{ background: 'var(--black)', color: '#fff', fontSize: small ? 8 : 9, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', padding: small ? '2px 7px' : '3px 9px' }}>{label}</span>
                );

                return (
                  <div>
                    {/* ── Active round: full-width match list ── */}
                    {activeMatches.length > 0 && (
                      <div style={{ marginBottom: doneMatches.length > 0 ? 28 : 0 }}>
                        <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'var(--grey-400)', marginBottom: 12 }}>
                          Partidos — Ronda {activeWave}
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                          {activeMatches.map(({ group, match }) => {
                            const key = `${group.id}-${match.courtNum}`;
                            const inputs = koGroupSetInputs[key] ?? Array.from({ length: groupSets }, () => ({ p1: '', p2: '' }));
                            const showTB = needsTiebreakSlot(inputs, groupSets);
                            const effSets = showTB ? groupSets + 1 : groupSets;
                            return (
                              <div key={key} style={{ border: '1px solid var(--grey-200)', background: '#fff' }}>
                                {/* Header: group · round · match + set labels */}
                                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, padding: '10px 20px', background: 'var(--grey-50)', borderBottom: '1px solid var(--grey-100)', flexWrap: 'wrap' }}>
                                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                                    {groupChip(group.name)}
                                    <span style={{ fontSize: 9, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--grey-500)' }}>
                                      Ronda {activeWave} · Partido {match.courtNum}
                                    </span>
                                  </div>
                                  <div style={{ display: 'flex', gap: 8 }}>
                                    {Array.from({ length: effSets }, (_, i) => (
                                      <div key={i} style={{ width: 48, textAlign: 'center', fontSize: 9, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: i >= groupSets ? '#b45309' : 'var(--grey-400)' }}>
                                        {i >= groupSets ? 'DESEMPATE' : `SET ${i + 1}`}
                                      </div>
                                    ))}
                                  </div>
                                </div>

                                {/* Pair A row */}
                                <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '14px 20px', borderBottom: '1px solid var(--grey-100)' }}>
                                  <div style={{ flex: 1, minWidth: 0 }}>
                                    <div style={{ fontSize: 9, color: 'var(--grey-400)', marginBottom: 2, fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase' }}>Pareja A</div>
                                    <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--black)' }}>{getGroupPairLabel(match.pair1)}</div>
                                  </div>
                                  <div style={{ display: 'flex', gap: 8, flexShrink: 0 }}>
                                    {Array.from({ length: effSets }, (_, i) => (
                                      <input key={i} type="number" min="0" max="99"
                                        value={inputs[i]?.p1 ?? ''}
                                        onChange={e => setKoGroupSetInputs(prev => {
                                          const cur = [...(prev[key] ?? Array.from({ length: groupSets }, () => ({ p1: '', p2: '' })))];
                                          while (cur.length <= i) cur.push({ p1: '', p2: '' });
                                          cur[i] = { ...cur[i], p1: e.target.value };
                                          return { ...prev, [key]: cur };
                                        })}
                                        placeholder="0"
                                        style={{ width: 48, height: 56, textAlign: 'center', fontFamily: 'var(--font-display)', fontSize: 20, fontWeight: 700, border: `2px solid ${i >= groupSets ? '#fde047' : 'var(--grey-300)'}`, outline: 'none', background: '#fff', color: 'var(--black)' }}
                                      />
                                    ))}
                                  </div>
                                </div>

                                {/* Pair B row */}
                                <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '14px 20px' }}>
                                  <div style={{ flex: 1, minWidth: 0 }}>
                                    <div style={{ fontSize: 9, color: 'var(--grey-400)', marginBottom: 2, fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase' }}>Pareja B</div>
                                    <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--black)' }}>{getGroupPairLabel(match.pair2)}</div>
                                  </div>
                                  <div style={{ display: 'flex', gap: 8, flexShrink: 0 }}>
                                    {Array.from({ length: effSets }, (_, i) => (
                                      <input key={i} type="number" min="0" max="99"
                                        value={inputs[i]?.p2 ?? ''}
                                        onChange={e => setKoGroupSetInputs(prev => {
                                          const cur = [...(prev[key] ?? Array.from({ length: groupSets }, () => ({ p1: '', p2: '' })))];
                                          while (cur.length <= i) cur.push({ p1: '', p2: '' });
                                          cur[i] = { ...cur[i], p2: e.target.value };
                                          return { ...prev, [key]: cur };
                                        })}
                                        placeholder="0"
                                        style={{ width: 48, height: 56, textAlign: 'center', fontFamily: 'var(--font-display)', fontSize: 20, fontWeight: 700, border: `2px solid ${i >= groupSets ? '#fde047' : 'var(--grey-300)'}`, outline: 'none', background: '#fff', color: 'var(--black)' }}
                                      />
                                    ))}
                                  </div>
                                </div>

                                {/* Register button */}
                                <div style={{ padding: '12px 20px', borderTop: '1px solid var(--grey-100)', display: 'flex', justifyContent: 'center' }}>
                                  <button
                                    onClick={() => handleGroupScoreWithSets(group.id, match.courtNum, key)}
                                    style={{ padding: '11px 40px', background: 'var(--black)', color: '#fff', border: 'none', cursor: 'pointer', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em' }}
                                  >
                                    Registrar Score
                                  </button>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}

                    {/* ── Completed match history — collapsible, grouped by round ── */}
                    {doneMatches.length > 0 && (() => {
                      const byRound: Record<number, typeof doneMatches> = {};
                      doneMatches.forEach(item => {
                        const r = item.match.roundNum ?? 1;
                        (byRound[r] ??= []).push(item);
                      });
                      const doneRoundNums = Object.keys(byRound).map(Number).sort((a, b) => a - b);
                      return (
                        <div style={{ border: '1px solid var(--grey-200)', background: '#fff' }}>
                          <button
                            onClick={() => setKoGroupHistoryOpen(prev => ({ ...prev, ['__all__']: !(prev['__all__'] ?? true) }))}
                            style={{ width: '100%', display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 20px', background: 'none', border: 'none', cursor: 'pointer', fontSize: 9, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--grey-400)' }}
                          >
                            <span>Resultados ({doneMatches.length} partido{doneMatches.length !== 1 ? 's' : ''})</span>
                            <span style={{ fontSize: 12, transform: historyOpen ? 'rotate(0deg)' : 'rotate(-90deg)', transition: 'transform 0.2s', display: 'inline-block' }}>▼</span>
                          </button>
                          {historyOpen && (
                            <div style={{ padding: '4px 20px 16px' }}>
                              {doneRoundNums.map(rNum => (
                                <div key={rNum} style={{ marginBottom: 12 }}>
                                  <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--grey-400)', marginBottom: 6, paddingBottom: 4, borderBottom: '1px solid var(--grey-100)' }}>
                                    Ronda {rNum}
                                  </div>
                                  {byRound[rNum].map(({ group, match }) => (
                                    <MatchSetResult
                                      key={`${group.id}-${match.courtNum}`}
                                      style={{ marginBottom: 6 }}
                                      header={<>{groupChip(group.name, true)}<span style={{ fontSize: 8, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--grey-400)' }}>Partido {match.courtNum}</span></>}
                                      pair1Label={getGroupPairLabel(match.pair1)}
                                      pair2Label={getGroupPairLabel(match.pair2)}
                                      sets={match.sets}
                                      pair1Score={match.pair1Score}
                                      pair2Score={match.pair2Score}
                                      onEdit={() => {
                                        const groups2 = t.groups!.groups.map(g => g.id !== group.id ? g : {
                                          ...g,
                                          matches: g.matches.map(m => m.courtNum !== match.courtNum ? m : { ...m, status: 'pending' as const, pair1Score: null, pair2Score: null, sets: undefined }),
                                          standings: g.standings,
                                        });
                                        const upd = { ...t, groups: { groups: groups2 } };
                                        saveTournament(upd); setTournament(upd);
                                      }}
                                    />
                                  ))}
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      );
                    })()}
                  </div>
                );
              })()}
              </div>
              )}
            </div>
          );
        })()}

        {/* ── KNOCKOUT: Bracket accordion ── */}
        {isKO && t.bracket && (() => {
          const bracketActive = t.knockoutConfig?.currentPhase === 'bracket';
          const pairs = t.fixedPairs ?? [];
          return (
            <div style={{ marginBottom: 8 }}>
              <div
                onClick={() => setKoBracketPhaseOpen(o => !o)}
                style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 24px', background: '#fff', border: '1px solid var(--grey-200)', cursor: 'pointer', marginBottom: 1 }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <span style={{ fontFamily: 'var(--font-display)', fontSize: 12, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em' }}>{t.groups ? 'Fase II — Cuadro' : 'Cuadro de Eliminatorias'}</span>
                  {bracketActive && <span style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, color: 'var(--turf-green)', fontWeight: 600 }}><span style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--turf-green)', display: 'inline-block', animation: 'pulse 2s infinite' }} />EN JUEGO</span>}
                </div>
                <span style={{ fontSize: 14, color: 'var(--grey-400)', transform: koBracketPhaseOpen ? 'rotate(0deg)' : 'rotate(-90deg)', transition: 'transform 0.2s', display: 'inline-block' }}>▼</span>
              </div>
              {koBracketPhaseOpen && (() => {
                const onScore = (roundIdx: number, matchIdx: number, s1: number, s2: number, sets?: Array<{ p1: number; p2: number }>, walkover?: boolean) => {
                  const scored = updateKnockoutBracketMatch(t, roundIdx, matchIdx, s1, s2, sets, walkover);
                  // Notify winner (advanced/champion), loser (eliminated) and any newly-set next match.
                  const { items, notifiedEvents } = classicBracketNotifications(scored, roundIdx, matchIdx);
                  const updated = { ...scored, notifiedEvents };
                  saveTournament(updated);
                  setTournament(updated);
                  if (items.length) void createNotifications(updated.id, 'torneo', items);
                  if (updated.status === 'finished') {
                    applyTournamentRankingResults(updated);
                    showToast('¡Torneo finalizado! Resultados guardados.', 'success');
                  }
                };
                return (
                <div style={{ marginBottom: 0 }}>
                {isWC ? (
                  <WorldCupBracketView
                    bracket={t.bracket}
                    fixedPairs={pairs}
                    players={t.players}
                    scoreConfig={t.scoreConfig}
                    isEditable={!isFinished}
                    onScoreEntry={onScore}
                  />
                ) : (
                  <KnockoutBracketView
                    bracket={t.bracket}
                    fixedPairs={pairs}
                    players={t.players}
                    scoreConfig={t.scoreConfig}
                    isEditable={!isFinished}
                    onScoreEntry={onScore}
                  />
                )}
                </div>
                );
              })()}
            </div>
          );
        })()}

        {/* ── KNOCKOUT: Classification tabs (integrated, below accordions) ── */}
        {isKO && (t.groups || t.bracket) && (
          <div style={{ marginBottom: 32, marginTop: 24 }}>
            <div style={{ fontSize: 9, letterSpacing: '0.18em', textTransform: 'uppercase', fontWeight: 700, color: 'var(--grey-400)', marginBottom: 16, paddingBottom: 10, borderBottom: '1px solid var(--grey-100)' }}>
              Clasificación
            </div>
            {standingsPanelContent}
          </div>
        )}

        {/* ── RONDAS ── */}
        {!isKO && <div style={{ marginBottom: 32 }}>
          <div className="bs-actions-row" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <div style={{ fontSize: 9, letterSpacing: '0.18em', textTransform: 'uppercase', fontWeight: 700, color: 'var(--grey-400)' }}>
            Rondas
          </div>
          <button
            onClick={() => {
              const allOpen = sortedRounds.every(r => roundOpen[r.num]);
              const newState: Record<number, boolean> = {};
              sortedRounds.forEach(r => { newState[r.num] = !allOpen; });
              setRoundOpen(newState);
            }}
            style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--grey-400)', background: 'transparent', border: '1px solid var(--grey-200)', padding: '4px 10px', cursor: 'pointer' }}
          >
            {sortedRounds.every(r => roundOpen[r.num]) ? 'Colapsar todas' : 'Expandir todas'}
          </button>
          </div>

          {sortedRounds.map(round => {
            const isActive = round.num === currentRoundNum;
            const isCompleted = round.status === 'completed';
            const isPending = round.status === 'pending' && !isActive;
            const roundDone = isRoundComplete(round);
            const restingPlayers = getRestingPlayers(t, round);

            let sectionBg = '#fff';
            let sectionBorder = '1px solid var(--grey-200)';
            let leftBorder = 'none';

            if (isActive) {
              leftBorder = '4px solid var(--turf-green, #22c55e)';
              sectionBorder = '1px solid var(--grey-200)';
            } else if (isCompleted) {
              sectionBg = '#fafafa';
              sectionBorder = '1px solid var(--grey-100)';
            } else if (isPending) {
              sectionBg = '#fafafa';
              sectionBorder = '1px solid var(--grey-100)';
            }

            return (
              <div key={round.num} style={{
                background: sectionBg,
                border: sectionBorder,
                borderLeft: leftBorder || sectionBorder,
                marginBottom: 24,
                overflow: 'hidden',
              }}>
                {/* Round header — clickable, always visible */}
                <div
                  onClick={() => setRoundOpen(prev => ({ ...prev, [round.num]: !prev[round.num] }))}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '12px 20px',
                    cursor: 'pointer',
                    background: isActive ? '#fff' : 'var(--grey-50)',
                    borderLeft: isActive ? '4px solid var(--turf-green, #22c55e)' : '4px solid transparent',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <span style={{ fontFamily: 'var(--font-display)', fontSize: 13, fontWeight: 700, textTransform: 'uppercase' }}>
                      RONDA {round.num}
                    </span>
                    {isActive && !roundDone && (() => {
                      const doneCourts = round.courts.filter(c => c.status === 'completed').length;
                      const totalCourts = round.courts.length;
                      return (
                        <span style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, color: 'var(--turf-green, #22c55e)', fontWeight: 600 }}>
                          <span style={{
                            width: 6, height: 6, borderRadius: '50%',
                            background: 'var(--turf-green, #22c55e)',
                            display: 'inline-block',
                            animation: 'pulse 2s infinite',
                          }} />
                          EN JUEGO
                          <span style={{ color: 'var(--grey-400)', fontWeight: 500 }}>
                            {doneCourts}/{totalCourts} canchas
                          </span>
                        </span>
                      );
                    })()}
                    {(isCompleted || roundDone) && (
                      <span style={{ fontSize: 11, color: 'var(--grey-400)', fontWeight: 600 }}>✓ COMPLETADA</span>
                    )}
                    {isPending && (
                      <span style={{ fontSize: 11, color: 'var(--grey-400)', fontWeight: 600 }}>PENDIENTE</span>
                    )}
                  </div>
                  <span style={{
                    fontSize: 14, color: 'var(--grey-400)',
                    transform: roundOpen[round.num] ? 'rotate(0deg)' : 'rotate(-90deg)',
                    transition: 'transform 0.2s',
                    display: 'inline-block',
                  }}>▼</span>
                </div>

                {/* Round content — collapsible */}
                {roundOpen[round.num] && (
                  <>
                    {/* Court cards */}
                    <div style={{ padding: '16px 20px' }}>
                      {round.courts.map(court => {
                        const key = `${round.num}-${court.courtNum}`;
                        const isCourtDone = court.status === 'completed';
                        const isInEditMode = editingCourts.has(key);
                        const isEditable = (isActive && !isCompleted && !isFinished) || isInEditMode;
                        const pair1Label = getPairLabel(t, court.pair1);
                        const pair2Label = getPairLabel(t, court.pair2);

                        return (
                          <div key={court.courtNum} style={{ marginBottom: 12, border: `1px solid ${isCourtDone ? 'var(--turf-green, #22c55e)' : isPending ? 'var(--grey-100)' : 'var(--grey-200)'}`, background: isCourtDone ? 'rgba(34,197,94,0.04)' : '#fff', opacity: isPending ? 0.6 : 1 }}>
                            {/* Header */}
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 18px', background: 'var(--grey-50)', borderBottom: '1px solid var(--grey-100)' }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                                <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'var(--grey-500)' }}>
                                  Cancha {court.courtNum}
                                  {isCourtDone && !isInEditMode && <span style={{ marginLeft: 8, color: 'var(--turf-green, #16a34a)' }}>✓</span>}
                                </div>
                                {isCourtDone && isActive && !isFinished && !isInEditMode && (
                                  <button
                                    onClick={() => handleEditCourt(round.num, court.courtNum)}
                                    style={{ fontSize: 9, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--grey-500)', background: 'transparent', border: '1px solid var(--grey-300)', padding: '2px 8px', cursor: 'pointer' }}>
                                    Editar
                                  </button>
                                )}
                                {isInEditMode && (
                                  <span style={{ fontSize: 9, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: '#f59e0b' }}>EDITANDO</span>
                                )}
                              </div>
                              <div style={{ display: 'flex', gap: 8 }}>
                                {isPointsMode ? (
                                  <div style={{ width: 56, textAlign: 'center', fontSize: 9, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--grey-400)' }}>PTS</div>
                                ) : (
                                  (() => {
                                    const curInputs = setInputs[key] ?? Array.from({ length: setsPerMatch }, () => ({ p1: '', p2: '' }));
                                    const showTB = needsTiebreakSlot(curInputs, setsPerMatch);
                                    const effSets = showTB ? setsPerMatch + 1 : setsPerMatch;
                                    return Array.from({ length: effSets }, (_, i) => (
                                      <div key={i} style={{ width: 48, textAlign: 'center', fontSize: 9, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: i >= setsPerMatch ? '#b45309' : 'var(--grey-400)' }}>
                                        {i >= setsPerMatch ? 'DESEMPATE' : `SET ${i + 1}`}
                                      </div>
                                    ));
                                  })()
                                )}
                              </div>
                            </div>

                            {(() => {
                              const courtWinner = isCourtDone && court.pair1Score !== null && court.pair2Score !== null
                                ? (court.pair1Score > court.pair2Score ? 1 : court.pair2Score > court.pair1Score ? 2 : 0)
                                : 0;
                              const courtSetInputs = setInputs[key] ?? Array.from({ length: setsPerMatch }, () => ({ p1: '', p2: '' }));
                              return (
                                <>
                                  {/* Pair 1 */}
                                  <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 18px', borderBottom: '1px solid var(--grey-100)' }}>
                                    <div style={{ width: 60, flexShrink: 0 }}>
                                      {courtWinner === 1 && <span style={{ background: 'var(--court-blue)', color: '#fff', fontSize: 9, fontWeight: 800, letterSpacing: '0.08em', textTransform: 'uppercase', padding: '3px 6px', whiteSpace: 'nowrap' }}>Ganador</span>}
                                    </div>
                                    <div style={{ flex: 1 }}>
                                      <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--black)', lineHeight: 1.3 }}>{pair1Label}</div>
                                    </div>
                                    <div style={{ display: 'flex', gap: 8, flexShrink: 0 }}>
                                      {isPointsMode ? (
                                        isEditable ? (
                                          <input type="number" min={0} max={ptTarget ?? 100}
                                            value={getInputVal(round.num, court.courtNum, 'p1', court)}
                                            onChange={e => handleP1Change(key, e.target.value)}
                                            onBlur={() => handleSaveScore(round.num, court.courtNum)}
                                            style={{ width: 56, height: 56, padding: '0', fontSize: 28, fontFamily: 'var(--font-display)', fontWeight: 700, textAlign: 'center', border: '2px solid var(--grey-300)', outline: 'none', color: 'var(--black)', background: '#fff' }}
                                            onFocus={e => { e.currentTarget.style.borderColor = 'var(--black)'; }}
                                            onBlurCapture={e => { e.currentTarget.style.borderColor = 'var(--grey-300)'; }}
                                          />
                                        ) : (
                                          <div style={{ width: 56, height: 56, display: 'flex', alignItems: 'center', justifyContent: 'center', border: '2px solid var(--grey-200)', fontFamily: 'var(--font-display)', fontSize: 28, fontWeight: 700, color: isCourtDone ? (courtWinner === 1 ? 'var(--black)' : 'var(--grey-400)') : 'var(--grey-300)' }}>
                                            {court.pair1Score !== null ? court.pair1Score : '–'}
                                          </div>
                                        )
                                      ) : isEditable ? (
                                        (() => {
                                          const showTB = needsTiebreakSlot(courtSetInputs, setsPerMatch);
                                          const effSets = showTB ? setsPerMatch + 1 : setsPerMatch;
                                          return Array.from({ length: effSets }, (_, i) => (
                                            <input key={i} type="number" min="0" max="99"
                                              value={courtSetInputs[i]?.p1 ?? ''}
                                              onChange={e => handleTradSetChange(key, i, 'p1', e.target.value, round.num, court.courtNum)}
                                              onBlur={() => handleSaveScore(round.num, court.courtNum)}
                                              placeholder="0"
                                              style={{ width: 48, height: 56, textAlign: 'center', fontFamily: 'var(--font-display)', fontSize: 20, fontWeight: 700, border: `2px solid ${i >= setsPerMatch ? '#fde047' : 'var(--grey-300)'}`, outline: 'none', background: '#fff', color: 'var(--black)' }} />
                                          ));
                                        })()
                                      ) : (
                                        // Completed traditional: show actual games per set
                                        court.sets && court.sets.length > 0
                                          ? court.sets.map((s, i) => (
                                              <div key={i} style={{ width: 48, height: 56, display: 'flex', alignItems: 'center', justifyContent: 'center', border: `2px solid ${courtWinner === 1 ? 'rgba(34,197,94,0.3)' : 'var(--grey-200)'}`, fontFamily: 'var(--font-display)', fontSize: 22, fontWeight: 700, color: courtWinner === 1 ? 'var(--black)' : 'var(--grey-400)' }}>
                                                {s.p1}
                                              </div>
                                            ))
                                          : (
                                              <div style={{ width: 56, height: 56, display: 'flex', alignItems: 'center', justifyContent: 'center', border: '2px solid var(--grey-200)', fontFamily: 'var(--font-display)', fontSize: 28, fontWeight: 700, color: 'var(--grey-300)' }}>–</div>
                                            )
                                      )}
                                    </div>
                                  </div>

                                  {/* Pair 2 */}
                                  <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 18px' }}>
                                    <div style={{ width: 60, flexShrink: 0 }}>
                                      {courtWinner === 2 && <span style={{ background: 'var(--court-blue)', color: '#fff', fontSize: 9, fontWeight: 800, letterSpacing: '0.08em', textTransform: 'uppercase', padding: '3px 6px', whiteSpace: 'nowrap' }}>Ganador</span>}
                                    </div>
                                    <div style={{ flex: 1 }}>
                                      <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--black)', lineHeight: 1.3 }}>{pair2Label}</div>
                                    </div>
                                    <div style={{ display: 'flex', gap: 8, flexShrink: 0 }}>
                                      {isPointsMode ? (
                                        isEditable ? (
                                          <input type="number" min={0} max={ptTarget ?? 100}
                                            value={getInputVal(round.num, court.courtNum, 'p2', court)}
                                            onChange={e => handleP2Change(key, e.target.value)}
                                            onBlur={() => handleSaveScore(round.num, court.courtNum)}
                                            style={{ width: 56, height: 56, padding: '0', fontSize: 28, fontFamily: 'var(--font-display)', fontWeight: 700, textAlign: 'center', border: '2px solid var(--grey-300)', outline: 'none', color: 'var(--black)', background: '#fff' }}
                                            onFocus={e => { e.currentTarget.style.borderColor = 'var(--black)'; }}
                                            onBlurCapture={e => { e.currentTarget.style.borderColor = 'var(--grey-300)'; }}
                                          />
                                        ) : (
                                          <div style={{ width: 56, height: 56, display: 'flex', alignItems: 'center', justifyContent: 'center', border: '2px solid var(--grey-200)', fontFamily: 'var(--font-display)', fontSize: 28, fontWeight: 700, color: isCourtDone ? (courtWinner === 2 ? 'var(--black)' : 'var(--grey-400)') : 'var(--grey-300)' }}>
                                            {court.pair2Score !== null ? court.pair2Score : '–'}
                                          </div>
                                        )
                                      ) : isEditable ? (
                                        (() => {
                                          const showTB = needsTiebreakSlot(courtSetInputs, setsPerMatch);
                                          const effSets = showTB ? setsPerMatch + 1 : setsPerMatch;
                                          return Array.from({ length: effSets }, (_, i) => (
                                            <input key={i} type="number" min="0" max="99"
                                              value={courtSetInputs[i]?.p2 ?? ''}
                                              onChange={e => handleTradSetChange(key, i, 'p2', e.target.value, round.num, court.courtNum)}
                                              onBlur={() => handleSaveScore(round.num, court.courtNum)}
                                              placeholder="0"
                                              style={{ width: 48, height: 56, textAlign: 'center', fontFamily: 'var(--font-display)', fontSize: 20, fontWeight: 700, border: `2px solid ${i >= setsPerMatch ? '#fde047' : 'var(--grey-300)'}`, outline: 'none', background: '#fff', color: 'var(--black)' }} />
                                          ));
                                        })()
                                      ) : (
                                        court.sets && court.sets.length > 0
                                          ? court.sets.map((s, i) => (
                                              <div key={i} style={{ width: 48, height: 56, display: 'flex', alignItems: 'center', justifyContent: 'center', border: `2px solid ${courtWinner === 2 ? 'rgba(34,197,94,0.3)' : 'var(--grey-200)'}`, fontFamily: 'var(--font-display)', fontSize: 22, fontWeight: 700, color: courtWinner === 2 ? 'var(--black)' : 'var(--grey-400)' }}>
                                                {s.p2}
                                              </div>
                                            ))
                                          : (
                                              <div style={{ width: 56, height: 56, display: 'flex', alignItems: 'center', justifyContent: 'center', border: '2px solid var(--grey-200)', fontFamily: 'var(--font-display)', fontSize: 28, fontWeight: 700, color: 'var(--grey-300)' }}>–</div>
                                            )
                                      )}
                                    </div>
                                  </div>
                                  {/* Save button — shown only in explicit edit mode */}
                                  {isInEditMode && (
                                    <div className="bs-actions-buttons" style={{ display: 'flex', justifyContent: 'flex-end', padding: '8px 18px', borderTop: '1px solid var(--grey-100)', gap: 8 }}>
                                      <button
                                        onClick={() => { setEditingCourts(prev => { const next = new Set(prev); next.delete(key); return next; }); }}
                                        style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--grey-500)', background: 'transparent', border: '1px solid var(--grey-300)', padding: '6px 14px', cursor: 'pointer' }}>
                                        Cancelar
                                      </button>
                                      <button
                                        onClick={() => handleSaveScore(round.num, court.courtNum)}
                                        style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: '#fff', background: 'var(--black)', border: 'none', padding: '6px 14px', cursor: 'pointer' }}>
                                        Guardar
                                      </button>
                                    </div>
                                  )}
                                </>
                              );
                            })()}
                          </div>
                        );
                      })}

                      {/* Descansan */}
                      {restingPlayers.length > 0 && (
                        <div style={{
                          padding: '8px 14px',
                          background: 'var(--grey-50)',
                          border: '1px solid var(--grey-100)',
                          fontSize: 12,
                          color: 'var(--grey-500)',
                          marginTop: 4,
                        }}>
                          Descansan — {restingPlayers.map(p => p.name).join(', ')}
                        </div>
                      )}
                    </div>

                    {/* Action banner: only on active round when complete, hidden when finished */}
                    {!isFinished && isActive && roundDone && (
                      <div className="bs-actions-row" style={{
                        padding: '18px 20px',
                        background: 'rgba(34,197,94,0.08)',
                        border: 'none',
                        borderTop: '2px solid rgba(34,197,94,0.3)',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        flexWrap: 'wrap',
                        gap: 12,
                      }}>
                        <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--turf-green, #16a34a)' }}>
                          ✓ Ronda {currentRoundNum} completada
                          {isMexicano && <span style={{ fontSize: 11, fontWeight: 500, color: 'var(--grey-500)', marginLeft: 8 }}>({currentRoundNum}/{expectedTotalRounds} máx.)</span>}
                        </div>
                        {isMexicano ? (
                          currentRoundNum >= expectedTotalRounds ? (
                            <button onClick={handleFinishTournament}
                              style={{ padding: '12px 24px', background: '#dc2626', color: '#fff', border: 'none', cursor: 'pointer', fontFamily: 'var(--font-display)', fontSize: 14, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                              FINALIZAR TORNEO
                            </button>
                          ) : (
                            <div className="bs-actions-buttons" style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                              <button onClick={handleNextRound}
                                style={{ padding: '12px 24px', background: 'var(--black)', color: '#fff', border: 'none', cursor: 'pointer', fontFamily: 'var(--font-display)', fontSize: 14, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                                SIGUIENTE RONDA →
                              </button>
                              <button onClick={handleFinishTournament}
                                style={{ padding: '12px 24px', background: 'transparent', color: '#dc2626', border: '2px solid #dc2626', cursor: 'pointer', fontFamily: 'var(--font-display)', fontSize: 14, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                                FINALIZAR AQUÍ
                              </button>
                            </div>
                          )
                        ) : !gameFinished ? (
                          <button onClick={handleNextRound}
                            style={{ padding: '12px 24px', background: 'var(--black)', color: '#fff', border: 'none', cursor: 'pointer', fontFamily: 'var(--font-display)', fontSize: 14, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                            SIGUIENTE RONDA →
                          </button>
                        ) : (
                          <button onClick={handleFinishTournament}
                            style={{ padding: '12px 24px', background: '#dc2626', color: '#fff', border: 'none', cursor: 'pointer', fontFamily: 'var(--font-display)', fontSize: 14, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                            FINALIZAR TORNEO
                          </button>
                        )}
                      </div>
                    )}
                  </>
                )}
              </div>
            );
          })}
        </div>}

        {/* ── CLASIFICACIÓN + RANKING ── */}
        {t.standings.length > 0 && (() => {
          function getProjectedRankingPts(position: number, standing: Standing): number {
            void position;
            return standing.wins * 3 + (standing.draws ?? 0) * 1 + (standing.losses ?? 0) * (-1);
          }

          const liveStandings = calculateStandings(t);
          const isParejas = t.pairType === 'parejas' && t.fixedPairs && t.fixedPairs.length > 0;

          const thStyle = (leftAlign?: boolean): React.CSSProperties => ({
            padding: '6px 8px',
            textAlign: leftAlign ? 'left' : 'center',
            fontSize: 9,
            fontWeight: 700,
            letterSpacing: '0.12em',
            textTransform: 'uppercase',
            color: 'var(--grey-400)',
          });

          const tdCenter: React.CSSProperties = { padding: '7px 8px', textAlign: 'center', fontSize: 12 };
          const tdLeft: React.CSSProperties = { padding: '7px 8px', textAlign: 'left', fontSize: 12 };

          const tableHeader = (label: string) => (
            <div style={{
              background: 'var(--black)', color: '#fff',
              padding: '8px 12px',
              fontSize: 10, fontWeight: 700, letterSpacing: '0.14em', textTransform: 'uppercase',
              marginBottom: 0,
            }}>
              {label}
            </div>
          );

          return (
            <div style={{ marginBottom: 32 }}>
              {/* TABLE I: CLASIFICACIÓN */}
              <div style={{ ...card, marginBottom: 16, padding: 0 }}>
                {tableHeader('I — CLASIFICACIÓN')}
                <div className="table-scroll" style={{ padding: '0 0 4px' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                    <thead>
                      <tr style={{ borderBottom: '2px solid var(--grey-100)' }}>
                        <th style={thStyle()}>POS</th>
                        <th style={thStyle(true)}>{isParejas ? 'EQUIPO' : 'JUGADOR'}</th>
                        <th style={thStyle()}>PJ</th>
                        <th style={thStyle()}>W</th>
                        <th style={thStyle()}>L</th>
                        <th style={thStyle()}>T</th>
                        <th style={thStyle()}>PTS W</th>
                        <th style={thStyle()}>PTS L</th>
                        <th style={thStyle()}>+/-</th>
                      </tr>
                    </thead>
                    <tbody>
                      {isParejas && t.fixedPairs ? (
                        // Parejas fijas: iterate standings in order (already sorted), find matching pair
                        liveStandings.map((s, i) => {
                          const pair = t.fixedPairs!.find(p => p.player1Id === s.playerId);
                          if (!pair) return null;
                          const isCreatorRow = pair.player1Id === t.creatorId || pair.player2Id === t.creatorId;
                          const isMe = currentUser && (pair.player1Id === currentUser.id || pair.player2Id === currentUser.id);
                          const teamLabel = pair.name || `${pair.player1Name} / ${pair.player2Name}`;
                          return (
                            <tr key={pair.pairIndex} style={{
                              borderBottom: '1px solid var(--grey-100)',
                              background: isCreatorRow ? 'rgba(26,78,216,0.12)' : 'transparent',
                            }}>
                              <td style={{ ...tdCenter, fontFamily: 'var(--font-display)', fontWeight: 700 }}>
                                {i === 0 ? '🥇' : i + 1}
                              </td>
                              <td style={{ ...tdLeft, fontWeight: isMe ? 700 : 500 }}>
                                <div>{teamLabel}{isCreatorRow && <span style={{ marginLeft: 4, fontSize: 12, color: '#f59e0b' }}>★</span>}{isMe && !isCreatorRow && <span style={{ marginLeft: 4, fontSize: 10, color: 'var(--grey-400)' }}>(tú)</span>}</div>
                                {pair.name && <div style={{ fontSize: 10, color: 'var(--grey-400)', marginTop: 1 }}>{pair.player1Name} / {pair.player2Name}</div>}
                              </td>
                              <td style={tdCenter}>{s.played}</td>
                              <td style={tdCenter}>{s.wins}</td>
                              <td style={tdCenter}>{s.losses ?? 0}</td>
                              <td style={tdCenter}>{s.draws ?? 0}</td>
                              <td style={tdCenter}>{s.pointsFor}</td>
                              <td style={tdCenter}>{s.pointsAgainst}</td>
                              <td style={{ ...tdCenter, color: s.diff >= 0 ? 'var(--turf-green, #16a34a)' : '#dc2626' }}>
                                {s.diff > 0 ? `+${s.diff}` : s.diff}
                              </td>
                            </tr>
                          );
                        })
                      ) : (
                        // Individual
                        liveStandings.map((s, i) => {
                          const isMe = currentUser && s.playerId === currentUser.id;
                          const isCreatorRow = s.playerId === t.creatorId || s.playerId === creatorPlayer?.id;
                          return (
                            <tr key={s.playerId} style={{
                              borderBottom: '1px solid var(--grey-100)',
                              background: isMe ? 'rgba(26,78,216,0.07)' : isCreatorRow ? 'rgba(26,78,216,0.12)' : 'transparent',
                              outline: isMe ? '2px solid rgba(26,78,216,0.2)' : undefined,
                            }}>
                              <td style={{ ...tdCenter, fontFamily: 'var(--font-display)', fontWeight: 700 }}>
                                {i === 0 ? '🥇' : i + 1}
                              </td>
                              <td style={{ ...tdLeft, fontWeight: isMe ? 700 : 500 }}>
                                {s.playerName}
                                {isCreatorRow && <span style={{ marginLeft: 4, fontSize: 12, color: '#f59e0b' }}>★</span>}
                                {isMe && <span style={{ marginLeft: 4, fontSize: 10, fontWeight: 700, color: 'var(--court-blue)' }}>TÚ</span>}
                              </td>
                              <td style={tdCenter}>{s.played}</td>
                              <td style={tdCenter}>{s.wins}</td>
                              <td style={tdCenter}>{s.losses ?? 0}</td>
                              <td style={tdCenter}>{s.draws ?? 0}</td>
                              <td style={tdCenter}>{s.pointsFor}</td>
                              <td style={tdCenter}>{s.pointsAgainst}</td>
                              <td style={{ ...tdCenter, color: s.diff >= 0 ? 'var(--turf-green, #16a34a)' : '#dc2626' }}>
                                {s.diff > 0 ? `+${s.diff}` : s.diff}
                              </td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* TABLE II: RANKING */}
              <div style={{ ...card, padding: 0 }}>
                {tableHeader('II — RANKING')}
                <div className="table-scroll" style={{ padding: '0 0 4px' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                    <thead>
                      <tr style={{ borderBottom: '2px solid var(--grey-100)' }}>
                        <th style={thStyle()}>POS</th>
                        <th style={thStyle(true)}>JUGADOR</th>
                        <th style={thStyle()}>+/-</th>
                        <th style={thStyle()}>RNK</th>
                      </tr>
                    </thead>
                    <tbody>
                      {liveStandings.map((s, i) => {
                        const isMe = currentUser && s.playerId === currentUser.id;
                        const isCreatorRow = s.playerId === t.creatorId || s.playerId === creatorPlayer?.id;
                        const rnk = getProjectedRankingPts(i, s);
                        return (
                          <tr key={s.playerId} style={{
                            borderBottom: '1px solid var(--grey-100)',
                            background: isMe ? 'rgba(26,78,216,0.07)' : isCreatorRow ? 'rgba(26,78,216,0.12)' : 'transparent',
                            outline: isMe ? '2px solid rgba(26,78,216,0.2)' : undefined,
                          }}>
                            <td style={{ ...tdCenter, fontFamily: 'var(--font-display)', fontWeight: 700 }}>
                              {i === 0 ? '🥇' : i + 1}
                            </td>
                            <td style={{ ...tdLeft, fontWeight: isMe ? 700 : 500 }}>
                              {s.playerName}
                              {isCreatorRow && <span style={{ marginLeft: 4, fontSize: 12, color: '#f59e0b' }}>★</span>}
                              {isMe && <span style={{ marginLeft: 4, fontSize: 10, fontWeight: 700, color: 'var(--court-blue)' }}>TÚ</span>}
                            </td>
                            <td style={{ ...tdCenter, color: s.diff >= 0 ? 'var(--turf-green, #16a34a)' : '#dc2626' }}>
                              {s.diff > 0 ? `+${s.diff}` : s.diff}
                            </td>
                            <td style={{ ...tdCenter, fontWeight: 700, color: 'var(--black)' }}>
                              {rnk > 0 ? `+${rnk}` : rnk}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          );
        })()}
      </div>

      </div>{/* end body */}

      {/* Pulse animation for active dot */}
      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; transform: scale(1); }
          50% { opacity: 0.5; transform: scale(1.3); }
        }
      `}</style>
    </div>
  );
}

// ── InfoRow helper ────────────────────────────────────────────────────────────

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8, fontSize: 12 }}>
      <span style={{ color: 'var(--grey-400)', fontWeight: 600, flexShrink: 0 }}>{label}</span>
      <span style={{ color: 'var(--black)', textAlign: 'right' }}>{value}</span>
    </div>
  );
}
