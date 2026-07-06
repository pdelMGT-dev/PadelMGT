// game-store.ts — localStorage-backed store with Supabase write-through.

import type {
  ActiveGame,
  GamePlayer,
  ScoreConfig,
  PairType,
} from './game-engine';
import {
  generateAmericanoRounds,
  generateKnockoutBracket,
  generateRoundRobinRounds,
  calculateStandings,
  startGame,
  updateMatchScore,
  startNextRound,
  isGameFinished,
} from './game-engine';
import { upsertGameToSupabase, deleteGameFromSupabase } from './superadmin-data';
import { createLocalStore } from './local-store';
import { sanitizeGameRecords } from './store-sanitize';

// Re-export engine functions so consumers can import from one place.
export {
  generateAmericanoRounds,
  generateKnockoutBracket,
  generateRoundRobinRounds,
  calculateStandings,
  startGame,
  updateMatchScore,
  startNextRound,
  isGameFinished,
};

// No seed data: quick games come exclusively from Supabase (cached locally).
const _store = createLocalStore<ActiveGame[]>('padelmgt_games', [], { seedOnFirstLoad: false });

// ---------------------------------------------------------------------------
// Code generators
// ---------------------------------------------------------------------------

function randomDigits(n: number): string {
  return Math.floor(Math.random() * Math.pow(10, n)).toString().padStart(n, '0');
}

function generateQuickCode(): string {
  return `JR-${new Date().getFullYear()}-${randomDigits(4)}`;
}

function generateId(): string {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) return crypto.randomUUID();
  return `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

export function getAllGames(): ActiveGame[] {
  // Sanitize on every load: Supabase-synced rows can contain null entries in
  // players/standings/rounds which crash pages that iterate them in render.
  return sanitizeGameRecords<ActiveGame>(_store.load());
}

export function getGame(id: string): ActiveGame | null {
  return _store.load().find((g) => g.id === id) ?? null;
}

export function getGameByCode(code: string): ActiveGame | null {
  return _store.load().find((g) => g.code === code) ?? null;
}

export function saveGame(game: ActiveGame): void {
  const games = _store.load();
  const idx = games.findIndex((g) => g.id === game.id);
  if (idx >= 0) games[idx] = game;
  else games.push(game);
  _store.persist(games);
  upsertGameToSupabase(game as unknown as Record<string, unknown>)
    .catch(err => console.warn('[Supabase] saveGame failed:', err));
}

export function updateGame(id: string, updates: Partial<ActiveGame>): ActiveGame | null {
  const games = _store.load();
  const idx = games.findIndex((g) => g.id === id);
  if (idx < 0) return null;
  const updated: ActiveGame = { ...games[idx], ...updates };
  games[idx] = updated;
  _store.persist(games);
  upsertGameToSupabase(updated as unknown as Record<string, unknown>)
    .catch(err => console.warn('[Supabase] updateGame failed:', err));
  return updated;
}

export function deleteGame(id: string): void {
  _store.persist(_store.load().filter((g) => g.id !== id));
  deleteGameFromSupabase(id)
    .catch(err => console.warn('[Supabase] deleteGame failed:', err));
}

export function createQuickGame(params: {
  name: string;
  date: string;
  time: string;
  club: string;
  city: string;
  country?: string;
  locationName?: string;
  format: 'americano' | 'mexicano';
  pairType: PairType;
  mixto: boolean;
  scoreConfig: ScoreConfig;
  maxPlayers: number;
  courts: number;
  players: GamePlayer[];
  invitedPlayers?: import('./game-engine').InvitedPlayer[];
  levelLabel?: string;
  creatorId?: string;
  leagueId?: string;
  seasonId?: string;
}): ActiveGame {
  const game: ActiveGame = {
    id: generateId(),
    code: generateQuickCode(),
    name: params.name,
    format: params.format,
    status: 'created',
    createdAt: new Date().toISOString(),
    date: params.date,
    time: params.time,
    club: params.club,
    city: params.city,
    country: params.country,
    locationName: params.locationName,
    pairType: params.pairType,
    mixto: params.mixto,
    scoreConfig: params.scoreConfig,
    maxPlayers: params.maxPlayers,
    courts: params.courts,
    players: params.players,
    invitedPlayers: params.invitedPlayers ?? [],
    rounds: [],
    currentRound: 0,
    standings: [],
    levelLabel: params.levelLabel,
    creatorId: params.creatorId,
    leagueId: params.leagueId,
    seasonId: params.seasonId,
  };
  saveGame(game);
  return game;
}

// Clone a finished/past Quick Game with the same configuration. Only
// name/date/time are supplied fresh; all other params are copied and the
// live/result state is reset so the clone starts clean.
export function cloneQuickGame(
  source: ActiveGame,
  opts: {
    name: string;
    date: string;
    time: string;
    creatorId: string;
    creatorName?: string;
    copyRoster: boolean;
  },
): ActiveGame {
  let players: GamePlayer[];
  let invitedPlayers: import('./game-engine').InvitedPlayer[];
  let fixedPairs = source.fixedPairs;

  if (opts.copyRoster) {
    players = (source.players ?? []).map(p => ({ ...p, isCreator: p.id === opts.creatorId }));
    invitedPlayers = (source.invitedPlayers ?? []).map(p => ({
      ...p,
      status: 'pending' as const,
      invitedAt: new Date().toISOString(),
    }));
  } else {
    players = opts.creatorName
      ? [{ id: opts.creatorId, name: opts.creatorName, ranking: 100, isCreator: true }]
      : [];
    invitedPlayers = [];
    fixedPairs = undefined;
  }

  const game: ActiveGame = {
    id: generateId(),
    code: generateQuickCode(),
    name: opts.name,
    format: source.format,
    status: 'created',
    createdAt: new Date().toISOString(),
    date: opts.date,
    time: opts.time,
    club: source.club,
    city: source.city,
    country: source.country,
    locationName: source.locationName,
    pairType: source.pairType,
    mixto: source.mixto,
    scoreConfig: source.scoreConfig,
    maxPlayers: source.maxPlayers,
    courts: source.courts,
    players,
    invitedPlayers,
    fixedPairs,
    rounds: [],
    currentRound: 0,
    standings: [],
    levelLabel: source.levelLabel,
    creatorId: opts.creatorId,
    leagueId: source.leagueId,
    seasonId: source.seasonId,
  };
  saveGame(game);
  return game;
}

