// ranking-store.ts — Quick Game ranking adjustments (actual +/- delta)

import type { ActiveGame, Standing } from './game-engine';
import { calculateStandings } from './game-engine';
import type { Tournament } from './tournament-store';
import { updatePlayerRankingPoints } from './player-store';
import { createLocalStore } from './local-store';
import { getGlobalRankingConfig } from './ranking-config-store';
import type { PersonalizadoTournament, PersonalizadoMatch, BracketMatch, MatchResult } from './personalizado-store';
export type { RankingTableConfig as RankingConfig } from './ranking-config-store';

const _store = createLocalStore<RankingEntry[]>('padelmgt_ranking_history', [], { seedOnFirstLoad: false });

export type RankingResult = 'win' | 'draw' | 'loss';

export interface RankingEntry {
  id: string;
  gameId: string;
  gameName: string;
  gameDate: string;
  playerId: string;
  playerName: string;
  result: RankingResult;
  delta: number;
  newTotal: number;
  createdAt: string;
  leagueId?: string;
}

function generateId(): string {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) return crypto.randomUUID();
  return `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

function getPlayerCurrentPoints(playerId: string): number {
  try {
    const raw = localStorage.getItem('padelmgt_registered_players') ?? '[]';
    const players: Array<{ id: string; rankingPoints: number }> = JSON.parse(raw);
    return players.find((p) => p.id === playerId)?.rankingPoints ?? 0;
  } catch {
    return 0;
  }
}

/**
 * Determine ranking result for a player from standings.
 * Top third = win, middle = draw, bottom third = loss.
 */
function deriveResult(playerId: string, standings: Standing[]): RankingResult {
  if (standings.length === 0) return 'draw';
  const pos = standings.findIndex((s) => s.playerId === playerId);
  if (pos < 0) return 'draw';
  const n = standings.length;
  if (pos === 0) return 'win';
  if (pos === n - 1) return 'loss';
  if (pos < Math.ceil(n / 3)) return 'win';
  if (pos >= n - Math.floor(n / 3)) return 'loss';
  return 'draw';
}

/**
 * Apply game results to all confirmed players and persist the entries.
 */
export function applyGameRankingResults(game: ActiveGame, leagueId?: string): RankingEntry[] {
  const all = _store.load();
  const created: RankingEntry[] = [];
  const isTraditional = game.scoreConfig?.type === 'traditional';
  const cfg = getGlobalRankingConfig();

  for (const player of game.players) {
    if (all.some((e) => e.gameId === game.id && e.playerId === player.id)) continue;

    const s = game.standings.find(st => st.playerId === player.id);
    let delta = 0;
    if (s) {
      if (isTraditional) {
        delta = s.pointsFor * cfg.pointsWin - s.pointsAgainst * Math.abs(cfg.pointsLoss);
      } else {
        delta = s.wins * cfg.pointsWin + s.draws * cfg.pointsDraw + s.losses * cfg.pointsLoss;
      }
    }

    const result: RankingResult = delta > 0 ? 'win' : delta < 0 ? 'loss' : 'draw';
    const current = getPlayerCurrentPoints(player.id);
    const newTotal = Math.max(0, current + delta);

    const entry: RankingEntry = {
      id: generateId(),
      gameId: game.id,
      gameName: game.name,
      gameDate: game.date,
      playerId: player.id,
      playerName: player.name,
      result,
      delta,
      newTotal,
      createdAt: new Date().toISOString(),
      ...(leagueId ? { leagueId } : {}),
    };

    all.push(entry);
    created.push(entry);
    updatePlayerRankingPoints(player.id, delta);
  }

  _store.persist(all);
  pushRankingEntriesToSupabase(created).catch(() => {});
  return created;
}

/**
 * Per-player win/draw/loss record for a classic tournament, counting BOTH the
 * group / round-robin matches (rounds[].courts[]) AND the knockout bracket
 * (bracket.rounds[].matches[]). calculateStandings only reads the former, so a
 * tournament decided in the bracket (or a pure-knockout one) would otherwise
 * credit zero ranking to everyone. Records are keyed per player id, so both
 * members of a pair are credited (not just player1).
 */
interface PlayerRankRecord { playerId: string; playerName: string; wins: number; draws: number; losses: number; }

export function computeTournamentRankRecords(game: ActiveGame): PlayerRankRecord[] {
  const rec = new Map<string, PlayerRankRecord>();
  const nameOf = (pid: string): string => game.players.find(p => p.id === pid)?.name ?? '';
  const ensure = (pid: string): PlayerRankRecord => {
    let r = rec.get(pid);
    if (!r) { r = { playerId: pid, playerName: nameOf(pid), wins: 0, draws: 0, losses: 0 }; rec.set(pid, r); }
    return r;
  };

  // Group / round-robin courts.
  for (const round of game.rounds ?? []) {
    for (const court of round.courts) {
      if (court.status !== 'completed' || court.pair1Score === null || court.pair2Score === null) continue;
      const s1 = court.pair1Score, s2 = court.pair2Score;
      const res: 'A' | 'B' | 'D' = s1 > s2 ? 'A' : s2 > s1 ? 'B' : 'D';
      for (const pid of court.pair1) { const r = ensure(pid); if (res === 'A') r.wins++; else if (res === 'B') r.losses++; else r.draws++; }
      for (const pid of court.pair2) { const r = ensure(pid); if (res === 'B') r.wins++; else if (res === 'A') r.losses++; else r.draws++; }
    }
  }

  // Knockout bracket — the winner array holds the winning pair's player ids.
  for (const round of game.bracket?.rounds ?? []) {
    for (const m of round.matches) {
      if (m.status !== 'completed' || !m.winner?.length || !m.pair1 || !m.pair2) continue;
      const winners = new Set(m.winner);
      const loserPair = m.pair1.every(id => winners.has(id)) ? m.pair2 : m.pair1;
      for (const pid of m.winner) ensure(pid).wins++;
      for (const pid of loserPair) ensure(pid).losses++;
    }
  }

  return [...rec.values()];
}

/** Ranking preview rows (delta + result) for the finished-tournament view,
 *  using the same records + global config as the actual crediting. */
export function getTournamentRankingPreview(game: ActiveGame): Array<{ playerId: string; playerName: string; delta: number; result: RankingResult }> {
  const cfg = getGlobalRankingConfig();
  return computeTournamentRankRecords(game)
    .filter(r => r.wins + r.draws + r.losses > 0)
    .map(r => {
      const delta = r.wins * cfg.pointsWin + r.draws * cfg.pointsDraw + r.losses * cfg.pointsLoss;
      return { playerId: r.playerId, playerName: r.playerName, delta, result: (delta > 0 ? 'win' : delta < 0 ? 'loss' : 'draw') as RankingResult };
    })
    .sort((a, b) => b.delta - a.delta);
}

/**
 * Apply tournament results to ranking and persist entries. Counts group +
 * bracket matches (via computeTournamentRankRecords) and credits every player.
 * Auto-recomputes: if this tournament was already processed but the stored
 * entries no longer match a fresh calculation (e.g. a pre-fix run that credited
 * zero because the bracket was ignored), the old entries are reversed and
 * replaced. Otherwise it's a no-op, so it stays safe to call on every load.
 */
export function applyTournamentRankingResults(tournament: Tournament, leagueId?: string): RankingEntry[] {
  const cfg = getGlobalRankingConfig();
  const records = computeTournamentRankRecords(tournament).filter(r => r.wins + r.draws + r.losses > 0);

  // Fresh per-player delta from the combined group + bracket record.
  const fresh = new Map<string, { delta: number; result: RankingResult; name: string }>();
  for (const r of records) {
    const delta = r.wins * cfg.pointsWin + r.draws * cfg.pointsDraw + r.losses * cfg.pointsLoss;
    fresh.set(r.playerId, { delta, result: delta > 0 ? 'win' : delta < 0 ? 'loss' : 'draw', name: r.playerName });
  }

  let all = _store.load();
  const existing = all.filter(e => e.gameId === tournament.id);
  let wasRecomputed = false;

  if (existing.length > 0) {
    // Already processed — recompute only if the stored entries are stale.
    const storedDelta = new Map(existing.map(e => [e.playerId, e.delta]));
    let stale = existing.length !== fresh.size;
    if (!stale) for (const [pid, f] of fresh) { if ((storedDelta.get(pid) ?? null) !== f.delta) { stale = true; break; } }
    if (!stale) return [];
    // Reverse the old point effect and drop the old entries before re-applying.
    for (const e of existing) updatePlayerRankingPoints(e.playerId, -e.delta);
    all = all.filter(e => e.gameId !== tournament.id);
    _store.persist(all);
    all = _store.load();
    wasRecomputed = true;
  }

  const created: RankingEntry[] = [];
  for (const [playerId, f] of fresh) {
    const current = getPlayerCurrentPoints(playerId);
    const newTotal = Math.max(0, current + f.delta);
    const entry: RankingEntry = {
      id: generateId(),
      gameId: tournament.id,
      gameName: tournament.name,
      gameDate: tournament.date,
      playerId,
      playerName: f.name,
      result: f.result,
      delta: f.delta,
      newTotal,
      createdAt: new Date().toISOString(),
      ...(leagueId ? { leagueId } : {}),
    };
    all.push(entry);
    created.push(entry);
    updatePlayerRankingPoints(playerId, f.delta);
  }

  _store.persist(all);
  pushRankingEntriesToSupabase(created, wasRecomputed ? tournament.id : undefined).catch(() => {});
  return created;
}

interface TeamRecord { wins: number; draws: number; losses: number; }

/** Tally one match's outcome (win/draw/loss) into both teams' running records. */
function tallyMatchResult(
  result: MatchResult,
  teamAId: string,
  teamBId: string,
  records: Map<string, TeamRecord>,
): void {
  const recA = records.get(teamAId);
  const recB = records.get(teamBId);
  if (!recA || !recB) return;

  if (result.walkover) {
    const winner = result.winnerId === teamAId ? recA : recB;
    const loser  = result.winnerId === teamAId ? recB : recA;
    winner.wins++;
    loser.losses++;
    return;
  }

  let setsA = 0, setsB = 0;
  for (const s of result.sets) {
    if (s.a > s.b) setsA++;
    else if (s.b > s.a) setsB++;
  }
  if (setsA > setsB) { recA.wins++; recB.losses++; }
  else if (setsB > setsA) { recB.wins++; recA.losses++; }
  else { recA.draws++; recB.draws++; }
}

/**
 * Apply PERSONALIZADO (TP) tournament results to ranking and persist entries.
 *
 * TP has no single flat standings list like classic tournaments — instead each
 * team plays across a per-category group stage and (optionally) a knockout
 * bracket. This aggregates a team's win/draw/loss record across ALL of its
 * matches (group ∪ bracket, every category) and applies the SAME per-match
 * point formula used everywhere else (getGlobalRankingConfig), crediting BOTH
 * players on the team with the identical delta — the pairing is TP's team
 * model, mirroring how classic tournaments credit each individual player.
 * Idempotent: dedups via the same gameId-based check as the other apply* fns,
 * so calling this repeatedly for an already-processed tournament is a no-op.
 */
export function applyPersonalizadoRankingResults(tournament: PersonalizadoTournament): RankingEntry[] {
  const all = _store.load();
  if (all.some((e) => e.gameId === tournament.id)) return [];

  const created: RankingEntry[] = [];
  const cfg = getGlobalRankingConfig();

  // Same "still counts" status set used by calculateGroupStandings.
  const countedTeams = tournament.teams.filter(t => t.status === 'pending' || t.status === 'confirmed');
  const records = new Map<string, TeamRecord>();
  for (const team of countedTeams) records.set(team.id, { wins: 0, draws: 0, losses: 0 });

  const groupMatches: PersonalizadoMatch[] = tournament.config?.matches ?? [];
  const bracketMatches: BracketMatch[] = tournament.config?.bracketMatches ?? [];

  for (const m of groupMatches) {
    if (!m.result) continue;
    tallyMatchResult(m.result, m.teamAId, m.teamBId, records);
  }
  for (const m of bracketMatches) {
    if (!m.result || !m.teamAId || !m.teamBId) continue;
    tallyMatchResult(m.result, m.teamAId, m.teamBId, records);
  }

  for (const team of countedTeams) {
    const rec = records.get(team.id);
    if (!rec || rec.wins + rec.draws + rec.losses === 0) continue; // never took the court

    const delta = rec.wins * cfg.pointsWin + rec.draws * cfg.pointsDraw + rec.losses * cfg.pointsLoss;
    const result: RankingResult = delta > 0 ? 'win' : delta < 0 ? 'loss' : 'draw';

    const players: Array<{ id?: string; name?: string }> = [
      { id: team.player1Id, name: team.player1Name },
      { id: team.player2Id, name: team.player2Name },
    ];
    for (const p of players) {
      if (!p.id) continue; // no linked account (e.g. guest-only registration) — nothing to credit
      const current = getPlayerCurrentPoints(p.id);
      const newTotal = Math.max(0, current + delta);
      const entry: RankingEntry = {
        id: generateId(),
        gameId: tournament.id,
        gameName: tournament.name,
        gameDate: tournament.date,
        playerId: p.id,
        playerName: p.name ?? '',
        result,
        delta,
        newTotal,
        createdAt: new Date().toISOString(),
      };
      all.push(entry);
      created.push(entry);
      updatePlayerRankingPoints(p.id, delta);
    }
  }

  _store.persist(all);
  pushRankingEntriesToSupabase(created).catch(() => {});
  return created;
}

export function getRankingHistoryForPlayer(playerId: string): RankingEntry[] {
  return _store.load().filter((e) => e && e.playerId === playerId);
}

export function getRankingHistoryForGame(gameId: string): RankingEntry[] {
  return _store.load().filter((e) => e && e.gameId === gameId);
}

// ── Supabase sync ─────────────────────────────────────────────────────────────
// The apply* functions above stay synchronous (they're called inline from
// game/tournament finish flows and their return value feeds the UI), so the
// local cache remains the source of truth for the dedup check within a single
// call. These push newly-created entries in the background and let other
// devices pull the durable trail for display / diffing.

async function pushRankingEntriesToSupabase(entries: RankingEntry[], replaceGameId?: string): Promise<void> {
  if (typeof window === 'undefined') return;
  if (entries.length === 0 && !replaceGameId) return;
  try {
    const res = await fetch('/api/ranking-history', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ entries, replaceGameId }),
    });
    if (!res.ok) console.warn('[ranking-store] push failed:', res.status);
  } catch (err) {
    console.warn('[ranking-store] push failed:', err);
  }
}

/** Pull this player's real ranking history from Supabase and merge into the
 * local cache. Returns null on fetch failure (caller should keep showing
 * the local cache in that case). */
export async function fetchRankingHistoryForPlayerFromSupabase(playerId: string): Promise<RankingEntry[] | null> {
  if (typeof window === 'undefined') return null;
  try {
    const res = await fetch(`/api/ranking-history?playerId=${encodeURIComponent(playerId)}`);
    if (!res.ok) return null;
    const data = await res.json() as { entries: RankingEntry[] };
    const others = _store.load().filter(e => e.playerId !== playerId);
    _store.persist([...others, ...data.entries]);
    return data.entries;
  } catch { return null; }
}

/** Pull the real entries already recorded for one game/tournament from
 * Supabase and merge into the local cache — call before the dedup check in
 * apply* so a device that never ran this locally doesn't re-credit points
 * another device already applied. Returns null on fetch failure. */
export async function fetchRankingHistoryForGameFromSupabase(gameId: string): Promise<RankingEntry[] | null> {
  if (typeof window === 'undefined') return null;
  try {
    const res = await fetch(`/api/ranking-history?gameId=${encodeURIComponent(gameId)}`);
    if (!res.ok) return null;
    const data = await res.json() as { entries: RankingEntry[] };
    const others = _store.load().filter(e => e.gameId !== gameId);
    _store.persist([...others, ...data.entries]);
    return data.entries;
  } catch { return null; }
}
