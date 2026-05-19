// ranking-store.ts — Quick Game ranking adjustments (W=+3, D=+1, L=-1)

import type { ActiveGame, Standing } from './game-engine';
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

  for (const player of game.players) {
    // Skip if already recorded for this game
    if (all.some((e) => e.gameId === game.id && e.playerId === player.id)) continue;

    const result = deriveResult(player.id, game.standings);
    const delta = DELTA[result];
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

    // Update the player's stored ranking points
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
