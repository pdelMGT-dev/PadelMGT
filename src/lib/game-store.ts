// game-store.ts — localStorage-backed store. Drop-in replaceable with Supabase later.

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

// Re-export for convenience so consumers can import from one place.
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

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const STORAGE_KEY = 'padelmgt_games';

// ---------------------------------------------------------------------------
// Mock players
// ---------------------------------------------------------------------------

function mkPlayer(id: string, name: string, ranking: number, isCreator = false): GamePlayer {
  return { id, name, ranking, isCreator };
}

const PLAYERS_4: GamePlayer[] = [
  mkPlayer('p1', 'Carlos V.', 1200, true),
  mkPlayer('p2', 'Ana R.', 1150),
  mkPlayer('p3', 'Diego M.', 1100),
  mkPlayer('p4', 'Sofía L.', 1050),
];

const PLAYERS_8: GamePlayer[] = [
  mkPlayer('p1', 'Carlos V.', 1300, true),
  mkPlayer('p2', 'Ana R.', 1250),
  mkPlayer('p3', 'Diego M.', 1200),
  mkPlayer('p4', 'Sofía L.', 1150),
  mkPlayer('p5', 'Marco T.', 1100),
  mkPlayer('p6', 'Lucia F.', 1050),
  mkPlayer('p7', 'Rafa G.', 1000),
  mkPlayer('p8', 'Elena B.', 950),
];

// ---------------------------------------------------------------------------
// Default score config
// ---------------------------------------------------------------------------

const defaultPointsConfig: ScoreConfig = { type: 'points', target: 24 };

// ---------------------------------------------------------------------------
// Helper to build a completed round
// ---------------------------------------------------------------------------

function completedRound(
  num: number,
  courts: Array<{
    courtNum: number;
    pair1: string[];
    pair2: string[];
    pair1Score: number;
    pair2Score: number;
  }>,
): import('./game-engine').GameRound {
  return {
    num,
    status: 'completed',
    resting: [],
    courts: courts.map((c) => ({
      ...c,
      status: 'completed' as const,
    })),
  };
}

// ---------------------------------------------------------------------------
// INITIAL_GAMES seed data
// ---------------------------------------------------------------------------

// g1: Americano individual, status='live', 4 players, 1 round done + 1 active
const g1_rounds_generated = generateAmericanoRounds(PLAYERS_4, 1);

const g1_round1 = completedRound(1, [
  { courtNum: 1, pair1: [PLAYERS_4[0].id, PLAYERS_4[1].id], pair2: [PLAYERS_4[2].id, PLAYERS_4[3].id], pair1Score: 16, pair2Score: 10 },
]);

const g1_round2: import('./game-engine').GameRound = g1_rounds_generated[1]
  ? { ...g1_rounds_generated[1], num: 2, status: 'active' }
  : {
      num: 2,
      status: 'active',
      resting: [],
      courts: [
        {
          courtNum: 1,
          pair1: [PLAYERS_4[0].id, PLAYERS_4[2].id],
          pair2: [PLAYERS_4[1].id, PLAYERS_4[3].id],
          pair1Score: null,
          pair2Score: null,
          status: 'pending',
        },
      ],
    };

const g1Base: Omit<ActiveGame, 'standings'> = {
  id: 'g1',
  code: 'JR-2026-1001',
  name: 'Americano Express',
  format: 'americano',
  status: 'live',
  date: '2026-05-16',
  time: '19:00',
  club: 'Padel Madrid Central',
  city: 'Madrid',
  pairType: 'individual',
  mixto: false,
  scoreConfig: defaultPointsConfig,
  maxPlayers: 4,
  courts: 1,
  players: PLAYERS_4,
  rounds: [g1_round1, g1_round2],
  currentRound: 2,
  isCreator: true,
};

const g1: ActiveGame = { ...g1Base, standings: calculateStandings({ ...g1Base, standings: [] }) };

// g2: Americano individual, status='starting_soon', 4 players, 0 rounds
const g2: ActiveGame = {
  id: 'g2',
  code: 'JR-2026-1002',
  name: 'Juego del Barrio',
  format: 'americano',
  status: 'starting_soon',
  date: '2026-05-16',
  time: '20:30',
  club: 'Club Padel Barcelona',
  city: 'Barcelona',
  pairType: 'individual',
  mixto: false,
  scoreConfig: defaultPointsConfig,
  maxPlayers: 4,
  courts: 1,
  players: PLAYERS_4,
  rounds: [],
  currentRound: 0,
  standings: [],
};

// g3: Americano individual, status='created', 2 players (not enough yet)
const g3: ActiveGame = {
  id: 'g3',
  code: 'JR-2026-1003',
  name: 'Rápido Avanzado',
  format: 'americano',
  status: 'created',
  date: '2026-05-17',
  time: '09:00',
  club: 'Padel London Arena',
  city: 'London',
  pairType: 'individual',
  mixto: false,
  scoreConfig: defaultPointsConfig,
  maxPlayers: 8,
  courts: 1,
  players: [PLAYERS_4[0], PLAYERS_4[1]],
  rounds: [],
  currentRound: 0,
  standings: [],
};

// g4: Americano individual, status='finished', 8 players, 3 rounds all done
const g4_r1 = completedRound(1, [
  { courtNum: 1, pair1: ['p1', 'p2'], pair2: ['p3', 'p4'], pair1Score: 18, pair2Score: 12 },
  { courtNum: 2, pair1: ['p5', 'p6'], pair2: ['p7', 'p8'], pair1Score: 14, pair2Score: 16 },
]);
const g4_r2 = completedRound(2, [
  { courtNum: 1, pair1: ['p1', 'p3'], pair2: ['p2', 'p5'], pair1Score: 20, pair2Score: 10 },
  { courtNum: 2, pair1: ['p4', 'p6'], pair2: ['p7', 'p8'], pair1Score: 12, pair2Score: 18 },
]);
const g4_r3 = completedRound(3, [
  { courtNum: 1, pair1: ['p1', 'p4'], pair2: ['p6', 'p7'], pair1Score: 22, pair2Score: 8 },
  { courtNum: 2, pair1: ['p2', 'p3'], pair2: ['p5', 'p8'], pair1Score: 15, pair2Score: 15 },
]);

const g4Base: Omit<ActiveGame, 'standings'> = {
  id: 'g4',
  code: 'JR-2026-0920',
  name: 'Open Mixto',
  format: 'americano',
  status: 'finished',
  date: '2026-05-10',
  time: '10:00',
  club: 'Amsterdam Padel Center',
  city: 'Amsterdam',
  pairType: 'individual',
  mixto: true,
  scoreConfig: defaultPointsConfig,
  maxPlayers: 8,
  courts: 2,
  players: PLAYERS_8,
  rounds: [g4_r1, g4_r2, g4_r3],
  currentRound: 3,
};

const g4: ActiveGame = { ...g4Base, standings: calculateStandings({ ...g4Base, standings: [] }) };

const INITIAL_GAMES: ActiveGame[] = [g1, g2, g3, g4];

// ---------------------------------------------------------------------------
// localStorage helpers
// ---------------------------------------------------------------------------

function isServer(): boolean {
  return typeof window === 'undefined';
}

function loadGames(): ActiveGame[] {
  if (isServer()) return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      // First load: seed
      localStorage.setItem(STORAGE_KEY, JSON.stringify(INITIAL_GAMES));
      return INITIAL_GAMES;
    }
    return JSON.parse(raw) as ActiveGame[];
  } catch {
    return INITIAL_GAMES;
  }
}

function persistGames(games: ActiveGame[]): void {
  if (isServer()) return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(games));
  } catch {
    // ignore quota errors
  }
}

// ---------------------------------------------------------------------------
// Code generator
// ---------------------------------------------------------------------------

function randomDigits(n: number): string {
  return Math.floor(Math.random() * Math.pow(10, n))
    .toString()
    .padStart(n, '0');
}

function generateQuickCode(): string {
  return `JR-${new Date().getFullYear()}-${randomDigits(4)}`;
}

function generateTournamentCode(): string {
  return `T-${new Date().getFullYear()}-${randomDigits(4)}`;
}

function generateId(): string {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

export function getAllGames(): ActiveGame[] {
  return loadGames();
}

export function getGame(id: string): ActiveGame | null {
  return loadGames().find((g) => g.id === id) ?? null;
}

export function getGameByCode(code: string): ActiveGame | null {
  return loadGames().find((g) => g.code === code) ?? null;
}

export function saveGame(game: ActiveGame): void {
  const games = loadGames();
  const idx = games.findIndex((g) => g.id === game.id);
  if (idx >= 0) {
    games[idx] = game;
  } else {
    games.push(game);
  }
  persistGames(games);
}

export function updateGame(id: string, updates: Partial<ActiveGame>): ActiveGame | null {
  const games = loadGames();
  const idx = games.findIndex((g) => g.id === id);
  if (idx < 0) return null;
  const updated: ActiveGame = { ...games[idx], ...updates };
  games[idx] = updated;
  persistGames(games);
  return updated;
}

export function deleteGame(id: string): void {
  const games = loadGames().filter((g) => g.id !== id);
  persistGames(games);
}

export function createQuickGame(params: {
  name: string;
  date: string;
  time: string;
  club: string;
  city: string;
  format: 'americano' | 'mexicano';
  pairType: PairType;
  mixto: boolean;
  scoreConfig: ScoreConfig;
  maxPlayers: number;
  courts: number;
  players: GamePlayer[];
}): ActiveGame {
  const game: ActiveGame = {
    id: generateId(),
    code: generateQuickCode(),
    name: params.name,
    format: params.format,
    status: 'created',
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
    rounds: [],
    currentRound: 0,
    standings: [],
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
    rounds: [],
    currentRound: 0,
    standings: [],
  };
  saveGame(game);
  return game;
}
