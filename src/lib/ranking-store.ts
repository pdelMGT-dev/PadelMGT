// ranking-store.ts — Quick Game ranking adjustments (actual +/- delta)

import type { ActiveGame, Standing } from './game-engine';
import { calculateStandings } from './game-engine';
import type { Tournament } from './tournament-store';
import { updatePlayerRankingPoints } from './player-store';

const STORAGE_KEY = 'padelmgt_ranking_history';

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
}

const DELTA: Record<RankingResult, number> = {
  win: 3,
  draw: 1,
  loss: -1,
};

function isServer(): boolean {
  return typeof window === 'undefined';
}

function load(): RankingEntry[] {
  if (isServer()) return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as RankingEntry[]) : [];
  } catch {
    return [];
  }
}

function persist(entries: RankingEntry[]): void {
  if (isServer()) return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(entries));
  } catch {}
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
 * For head-to-head, compare individual court wins.
 */
function deriveResult(playerId: string, standings: Standing[]): RankingResult {
  if (standings.length === 0) return 'draw';
  const pos = standings.findIndex((s) => s.playerId === playerId);
  if (pos < 0) return 'draw';
  const n = standings.length;
  if (pos === 0) return 'win';
  if (pos === n - 1) return 'loss';
  // Top third → win, bottom third → loss, middle → draw
  if (pos < Math.ceil(n / 3)) return 'win';
  if (pos >= n - Math.floor(n / 3)) return 'loss';
  return 'draw';
}

/**
 * Apply game results to all confirmed players and persist the entries.
 * Returns the list of entries created.
 */
export function applyGameRankingResults(game: ActiveGame): RankingEntry[] {
  const all = load();
  const created: RankingEntry[] = [];
  const isTraditional = game.scoreConfig?.type === 'traditional';

  for (const player of game.players) {
    if (all.some((e) => e.gameId === game.id && e.playerId === player.id)) continue;

    const s = game.standings.find(st => st.playerId === player.id);
    let delta = 0;
    if (s) {
      if (isTraditional) {
        // (setsWon × 3) + (setsLost × -1)
        delta = s.pointsFor * 3 - s.pointsAgainst;
      } else {
        // (W × 3) + (T × 1) + (L × -1)
        delta = s.wins * 3 + s.draws - s.losses;
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
    };

    all.push(entry);
    created.push(entry);
    updatePlayerRankingPoints(player.id, delta);
  }

  persist(all);
  return created;
}

// ---------------------------------------------------------------------------
// Tournament ranking
// ---------------------------------------------------------------------------

/**
 * Position prizes for Americano-style tournaments (pool 250 pts).
 * Index is 0-based position. Positions >= 5 get 0 pts.
 */
const POSITION_PRIZES = [250, 175, 125, 62, 25];

/**
 * Apply tournament final standings to ranking and persist entries.
 * Skips if already recorded for this tournament.
 * Returns the list of entries created.
 */
export function applyTournamentRankingResults(tournament: Tournament): RankingEntry[] {
  const all = load();
  const created: RankingEntry[] = [];

  // Skip if already recorded for this tournament
  if (all.some((e) => e.gameId === tournament.id)) return [];

  const standings = calculateStandings(tournament);
  const n = standings.length;

  // Sort by pts descending to determine final positions
  const sorted = [...standings].sort((a, b) => b.pts - a.pts);

  for (let position = 0; position < sorted.length; position++) {
    const standing = sorted[position];
    const player = tournament.players.find((p) => p.id === standing.playerId);
    if (!player) continue;

    const positionPrize = position < POSITION_PRIZES.length ? POSITION_PRIZES[position] : 0;

    // Per-game bonus: wins * 3, draws * 1, losses * (-1)
    // Standing only has wins and played; derive draws = pts - wins*3 (for americano pts = scored points not match pts)
    // Use wins directly; draws and losses approximated from played
    const wins = standing.wins;
    const losses = standing.played - wins; // treat non-wins as losses for bonus (no draw tracking in Standing)
    const perGameBonus = wins * 3 + losses * (-1);

    const delta = positionPrize + perGameBonus;

    // result: win if 1st place, loss if last place, draw otherwise
    const result: RankingResult =
      position === 0 ? 'win' : position === n - 1 ? 'loss' : 'draw';

    const current = getPlayerCurrentPoints(player.id);
    const newTotal = Math.max(0, current + delta);

    const entry: RankingEntry = {
      id: generateId(),
      gameId: tournament.id,
      gameName: tournament.name,
      gameDate: tournament.date,
      playerId: player.id,
      playerName: player.name,
      result,
      delta,
      newTotal,
      createdAt: new Date().toISOString(),
    };

    all.push(entry);
    created.push(entry);

    updatePlayerRankingPoints(player.id, delta);
  }

  persist(all);
  return created;
}

export function getRankingHistoryForPlayer(playerId: string): RankingEntry[] {
  return load().filter((e) => e.playerId === playerId);
}

export function getRankingHistoryForGame(gameId: string): RankingEntry[] {
  return load().filter((e) => e.gameId === gameId);
}
