// ranking-store.ts — Quick Game ranking adjustments (actual +/- delta)

import type { ActiveGame, Standing } from './game-engine';
import { calculateStandings } from './game-engine';
import type { Tournament } from './tournament-store';
import { updatePlayerRankingPoints } from './player-store';
import { createLocalStore } from './local-store';
import { getGlobalRankingConfig } from './ranking-config-store';
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
  return created;
}

/**
 * Apply tournament final standings to ranking and persist entries.
 */
export function applyTournamentRankingResults(tournament: Tournament, leagueId?: string): RankingEntry[] {
  const all = _store.load();
  const created: RankingEntry[] = [];

  if (all.some((e) => e.gameId === tournament.id)) return [];

  const standings = calculateStandings(tournament);
  const cfg = getGlobalRankingConfig();

  for (const standing of standings) {
    const player = tournament.players.find((p) => p.id === standing.playerId);
    if (!player) continue;

    const wins = standing.wins;
    const draws = standing.draws ?? 0;
    const losses = standing.losses ?? (standing.played - wins - draws);
    const delta = wins * cfg.pointsWin + draws * cfg.pointsDraw + losses * cfg.pointsLoss;
    const result: RankingResult = delta > 0 ? 'win' : delta < 0 ? 'loss' : 'draw';

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
      ...(leagueId ? { leagueId } : {}),
    };

    all.push(entry);
    created.push(entry);
    updatePlayerRankingPoints(player.id, delta);
  }

  _store.persist(all);
  return created;
}

export function getRankingHistoryForPlayer(playerId: string): RankingEntry[] {
  return _store.load().filter((e) => e && e.playerId === playerId);
}

export function getRankingHistoryForGame(gameId: string): RankingEntry[] {
  return _store.load().filter((e) => e && e.gameId === gameId);
}
