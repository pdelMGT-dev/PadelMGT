// game-store.ts — localStorage-backed store with Supabase write-through.

import type {
  ActiveGame,
  GamePlayer,
  ScoreConfig,
  GameFormat,
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
import { INITIAL_GAMES } from './seeds/games';

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

const _store = createLocalStore<ActiveGame[]>('padelmgt_games', INITIAL_GAMES);

// ---------------------------------------------------------------------------
// Code generators
// ---------------------------------------------------------------------------

function randomDigits(n: number): string {
  return Math.floor(Math.random() * Math.pow(10, n)).toString().padStart(n, '0');
}

function generateQuickCode(): string {
  return `JR-${new Date().getFullYear()}-${randomDigits(4)}`;
}

function generateTournamentCode(): string {
  return `T-${new Date().getFullYear()}-${randomDigits(4)}`;
}

function generateId(): string {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) return crypto.randomUUID();
  return `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

export function getAllGames(): ActiveGame[] {
  return _store.load();
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
  };
  saveGame(game);
  return game;
}

export function createTournament(params: {
  name: string;
  date: string;
  time: string;
  club: string;
  city: string;
  format: GameFormat;
  pairType: PairType;
  mixto: boolean;
  scoreConfig: ScoreConfig;
  maxPlayers: number;
  courts: number;
  players: GamePlayer[];
}): ActiveGame {
  const game: ActiveGame = {
    id: generateId(),
    code: generateTournamentCode(),
    name: params.name,
    format: params.format,
    status: 'created',
    createdAt: new Date().toISOString(),
    date: params.date,
    time: params.time,
    club: params.club,
    city: params.city,
    pairType: params.pairType,
    mixto: params.mixto,
    scoreConfig: params.scoreConfig,
    maxPlayers: params.maxPlayers,
    courts: params.courts,
    players: params.players,
    invitedPlayers: [],
    rounds: [],
    currentRound: 0,
    standings: [],
  };
  saveGame(game);
  return game;
}
