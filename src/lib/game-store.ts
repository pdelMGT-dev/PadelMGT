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
  invitedPlayers: [],
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
  invitedPlayers: [],
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
  invitedPlayers: [],
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
  invitedPlayers: [],
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

// g5: Test game — creator carlos (player-001), 4 confirmed players, ready to start
const G5_NOW = new Date();
G5_NOW.setDate(G5_NOW.getDate() + 1);
const G5_DATE = G5_NOW.toISOString().split('T')[0];

const G5_PLAYERS: GamePlayer[] = [
  mkPlayer('player-001', 'Carlos Méndez', 1200, true),
  mkPlayer('player-002', 'Sofía Ruiz',    1050, false),
  mkPlayer('player-003', 'Lucas Herrera',  980, false),
  mkPlayer('player-004', 'Ana Rodríguez', 1450, false),
];

const G5_INVITED: import('./game-engine').InvitedPlayer[] = [
  { id: 'player-002', name: 'Sofía Ruiz',    email: 'sofia@padelmgt.com',  shortId: '#00102', ranking: 1050, status: 'accepted', invitedAt: new Date().toISOString(), isFriend: true  },
  { id: 'player-003', name: 'Lucas Herrera', email: 'lucas@padelmgt.com',  shortId: '#00103', ranking:  980, status: 'accepted', invitedAt: new Date().toISOString(), isFriend: false },
  { id: 'player-004', name: 'Ana Rodríguez', email: 'ana@padelmgt.com',    shortId: '#00104', ranking: 1450, status: 'accepted', invitedAt: new Date().toISOString(), isFriend: true  },
];

const g5: ActiveGame = {
  id: 'g5',
  code: 'JR-2026-5001',
  name: 'Americano Express Carlos',
  format: 'americano',
  status: 'created',
  date: G5_DATE,
  time: '19:00',
  club: 'Club La Cantera',
  city: 'Córdoba',
  country: 'Argentina',
  pairType: 'individual',
  mixto: false,
  scoreConfig: { type: 'points', target: 24 },
  maxPlayers: 4,
  courts: 1,
  players: G5_PLAYERS,
  invitedPlayers: G5_INVITED,
  rounds: [],
  currentRound: 0,
  standings: [],
  levelLabel: 'Intermedio',
  creatorId: 'player-001',
  coCreatorIds: [],
};

// ── Test games for carlos (player-001) in all states ────────────────────────

function tomorrow(): string {
  const d = new Date(); d.setDate(d.getDate() + 1); return d.toISOString().split('T')[0];
}

function inv(id: string, name: string, email: string, shortId: string, ranking: number, isFriend: boolean): import('./game-engine').InvitedPlayer {
  return { id, name, email, shortId, ranking, status: 'accepted', invitedAt: new Date().toISOString(), isFriend };
}

// g6: 8 players, intercambio, all confirmed — ready to start (Carlos creator)
const G6_PLAYERS: GamePlayer[] = [
  mkPlayer('player-001', 'Carlos Méndez',   1200, true),
  mkPlayer('player-004', 'Ana Rodríguez',   1450, false),
  mkPlayer('player-005', 'Marcos Herrera',  1800, false),
  mkPlayer('player-006', 'Carlos Vargas',    850, false),
  mkPlayer('player-007', 'Laura Torres',     780, false),
  mkPlayer('player-008', 'Diego Fernández', 1320, false),
  mkPlayer('player-009', 'Pedro Morales',   2100, false),
  mkPlayer('player-010', 'Isabel Bravo',    1650, false),
];

const g6: ActiveGame = {
  id: 'g6',
  code: 'JR-2026-6001',
  name: 'Ronda de 8 — Intercambio',
  format: 'americano',
  status: 'created',
  date: tomorrow(),
  time: '10:00',
  club: 'Padel Arena',
  city: 'Buenos Aires',
  country: 'Argentina',
  pairType: 'individual',
  mixto: false,
  scoreConfig: { type: 'points', target: 24 },
  maxPlayers: 8,
  courts: 2,
  players: G6_PLAYERS,
  invitedPlayers: [
    inv('player-004', 'Ana Rodríguez',   'ana@padelmgt.com',         '#00104', 1450, true),
    inv('player-005', 'Marcos Herrera',  'marcos@padelmgt.com',      '#00105', 1800, true),
    inv('player-006', 'Carlos Vargas',   'cvargas@padelmgt.com',     '#00106',  850, false),
    inv('player-007', 'Laura Torres',    'ltorres@padelmgt.com',     '#00107',  780, false),
    inv('player-008', 'Diego Fernández', 'dfernandez@padelmgt.com',  '#00108', 1320, true),
    inv('player-009', 'Pedro Morales',   'pmorales@padelmgt.com',    '#00109', 2100, false),
    inv('player-010', 'Isabel Bravo',    'ibravo@padelmgt.com',      '#00110', 1650, false),
  ],
  rounds: [],
  currentRound: 0,
  standings: [],
  levelLabel: 'Avanzado',
  creatorId: 'player-001',
  coCreatorIds: [],
};

// g7: 4 players, pareja fija, all confirmed — ready to start (Carlos creator)
const G7_PLAYERS: GamePlayer[] = [
  mkPlayer('player-001', 'Carlos Méndez',   1200, true),
  mkPlayer('player-002', 'Sofía Ruiz',      1050, false),
  mkPlayer('player-003', 'Lucas Herrera',    980, false),
  mkPlayer('player-013', 'Raúl Ortega',     1760, false),
];

const g7: ActiveGame = {
  id: 'g7',
  code: 'JR-2026-7001',
  name: 'Pareja Fija — 4 Jugadores',
  format: 'americano',
  status: 'created',
  date: tomorrow(),
  time: '18:00',
  club: 'Club La Cantera',
  city: 'Córdoba',
  country: 'Argentina',
  pairType: 'parejas',
  mixto: false,
  scoreConfig: { type: 'points', target: 16 },
  maxPlayers: 4,
  courts: 1,
  players: G7_PLAYERS,
  invitedPlayers: [
    inv('player-002', 'Sofía Ruiz',    'sofia@padelmgt.com',  '#00102', 1050, true),
    inv('player-003', 'Lucas Herrera', 'lucas@padelmgt.com',  '#00103',  980, false),
    inv('player-013', 'Raúl Ortega',   'rortega@padelmgt.com','#00113', 1760, false),
  ],
  rounds: [],
  currentRound: 0,
  standings: [],
  levelLabel: 'Intermedio',
  creatorId: 'player-001',
  coCreatorIds: [],
};

// g8: 4 players, live game, 1 round done + 1 active (Carlos creator)
const G8_PLAYERS: GamePlayer[] = [
  mkPlayer('player-001', 'Carlos Méndez', 1200, true),
  mkPlayer('player-002', 'Sofía Ruiz',   1050, false),
  mkPlayer('player-003', 'Lucas Herrera',  980, false),
  mkPlayer('player-004', 'Ana Rodríguez', 1450, false),
];

const G8_R1 = completedRound(1, [
  { courtNum: 1, pair1: ['player-001', 'player-003'], pair2: ['player-002', 'player-004'], pair1Score: 18, pair2Score: 14 },
]);
const G8_R2: import('./game-engine').GameRound = {
  num: 2, status: 'active', resting: [],
  courts: [{ courtNum: 1, pair1: ['player-001', 'player-002'], pair2: ['player-003', 'player-004'], pair1Score: null, pair2Score: null, status: 'pending' }],
};
const G8_R3: import('./game-engine').GameRound = {
  num: 3, status: 'pending', resting: [],
  courts: [{ courtNum: 1, pair1: ['player-001', 'player-004'], pair2: ['player-002', 'player-003'], pair1Score: null, pair2Score: null, status: 'pending' }],
};

const g8Base: Omit<ActiveGame, 'standings'> = {
  id: 'g8',
  code: 'JR-2026-8001',
  name: 'En Vivo — Ronda 2',
  format: 'americano',
  status: 'live',
  date: new Date().toISOString().split('T')[0],
  time: '20:00',
  club: 'Padel Arena',
  city: 'Buenos Aires',
  country: 'Argentina',
  pairType: 'individual',
  mixto: false,
  scoreConfig: { type: 'points', target: 24 },
  maxPlayers: 4,
  courts: 1,
  players: G8_PLAYERS,
  invitedPlayers: [
    inv('player-002', 'Sofía Ruiz',    'sofia@padelmgt.com',  '#00102', 1050, true),
    inv('player-003', 'Lucas Herrera', 'lucas@padelmgt.com',  '#00103',  980, false),
    inv('player-004', 'Ana Rodríguez', 'ana@padelmgt.com',    '#00104', 1450, true),
  ],
  rounds: [G8_R1, G8_R2, G8_R3],
  currentRound: 2,
  levelLabel: 'Todos',
  creatorId: 'player-001',
  coCreatorIds: ['player-002'],
};

const g8: ActiveGame = { ...g8Base, standings: calculateStandings({ ...g8Base, standings: [] }) };

// ── 5 games — all players confirmed, ready to start ──────────────────────────

function daysFromNow(n: number): string {
  const d = new Date(); d.setDate(d.getDate() + n); return d.toISOString().split('T')[0];
}

// g9: 4 players · intercambio · Por Puntos 24 · Buenos Aires
const g9: ActiveGame = {
  id: 'g9', code: 'JR-2026-9001',
  name: 'Americano Barrio Norte',
  format: 'americano', status: 'created',
  date: daysFromNow(1), time: '20:00',
  club: 'Club Barrio Norte', city: 'Buenos Aires', country: 'Argentina',
  pairType: 'individual', mixto: false,
  scoreConfig: { type: 'points', target: 24 },
  maxPlayers: 4, courts: 1,
  players: [
    mkPlayer('player-001', 'Carlos Méndez',  1200, true),
    mkPlayer('player-002', 'Sofía Ruiz',     1050, false),
    mkPlayer('player-003', 'Lucas Herrera',   980, false),
    mkPlayer('player-004', 'Ana Rodríguez',  1450, false),
  ],
  invitedPlayers: [
    inv('player-002', 'Sofía Ruiz',    'sofia@padelmgt.com',  '#00102', 1050, true),
    inv('player-003', 'Lucas Herrera', 'lucas@padelmgt.com',  '#00103',  980, true),
    inv('player-004', 'Ana Rodríguez', 'ana@padelmgt.com',    '#00104', 1450, true),
  ],
  rounds: [], currentRound: 0, standings: [],
  levelLabel: 'Intermedio', creatorId: 'player-001', coCreatorIds: [],
};

// g10: 8 players · intercambio · Por Puntos 24 · Córdoba · 2 canchas
const g10: ActiveGame = {
  id: 'g10', code: 'JR-2026-9002',
  name: 'Americano La Cantera 8',
  format: 'americano', status: 'created',
  date: daysFromNow(2), time: '10:00',
  club: 'Club La Cantera', city: 'Córdoba', country: 'Argentina',
  pairType: 'individual', mixto: false,
  scoreConfig: { type: 'points', target: 24 },
  maxPlayers: 8, courts: 2,
  players: [
    mkPlayer('player-001', 'Carlos Méndez',    1200, true),
    mkPlayer('player-005', 'Marcos Herrera',   1800, false),
    mkPlayer('player-006', 'Carlos Vargas',     850, false),
    mkPlayer('player-007', 'Laura Torres',      780, false),
    mkPlayer('player-008', 'Diego Fernández',  1320, false),
    mkPlayer('player-013', 'Raúl Ortega',      1760, false),
    mkPlayer('player-014', 'Marta Fuentes',     810, false),
    mkPlayer('player-015', 'Valentina Cruz',   1120, false),
  ],
  invitedPlayers: [
    inv('player-005', 'Marcos Herrera',   'marcos@padelmgt.com',      '#00105', 1800, true),
    inv('player-006', 'Carlos Vargas',    'cvargas@padelmgt.com',     '#00106',  850, false),
    inv('player-007', 'Laura Torres',     'ltorres@padelmgt.com',     '#00107',  780, false),
    inv('player-008', 'Diego Fernández',  'dfernandez@padelmgt.com',  '#00108', 1320, false),
    inv('player-013', 'Raúl Ortega',      'rortega@padelmgt.com',     '#00113', 1760, false),
    inv('player-014', 'Marta Fuentes',    'mfuentes@padelmgt.com',    '#00114',  810, false),
    inv('player-015', 'Valentina Cruz',   'vcruz@padelmgt.com',       '#00115', 1120, false),
  ],
  rounds: [], currentRound: 0, standings: [],
  levelLabel: 'Avanzado', creatorId: 'player-001', coCreatorIds: [],
};

// g11: 6 players · intercambio · Tradicional (sets) · Madrid · 1 cancha
const g11: ActiveGame = {
  id: 'g11', code: 'JR-2026-9003',
  name: 'Sets Clásicos Madrid',
  format: 'americano', status: 'created',
  date: daysFromNow(3), time: '11:00',
  club: 'World Padel Tour', city: 'Madrid', country: 'España',
  pairType: 'individual', mixto: false,
  scoreConfig: { type: 'traditional', setsPerMatch: 1, gamesPerSet: 6, tiebreak: 7, deuce: 'oro' },
  maxPlayers: 6, courts: 1,
  players: [
    mkPlayer('player-001', 'Carlos Méndez',    1200, true),
    mkPlayer('player-009', 'Pedro Morales',    2100, false),
    mkPlayer('player-010', 'Isabel Bravo',     1650, false),
    mkPlayer('player-016', 'Nicolás Gómez',   1580, false),
    mkPlayer('player-017', 'Fernanda Ríos',    990, false),
    mkPlayer('player-018', 'Alejandro Pérez', 1340, false),
  ],
  invitedPlayers: [
    inv('player-009', 'Pedro Morales',    'pmorales@padelmgt.com',  '#00109', 2100, false),
    inv('player-010', 'Isabel Bravo',     'ibravo@padelmgt.com',    '#00110', 1650, false),
    inv('player-016', 'Nicolás Gómez',   'ngomez@padelmgt.com',    '#00116', 1580, false),
    inv('player-017', 'Fernanda Ríos',   'frios@padelmgt.com',     '#00117',  990, false),
    inv('player-018', 'Alejandro Pérez', 'aperez@padelmgt.com',    '#00118', 1340, false),
  ],
  rounds: [], currentRound: 0, standings: [],
  levelLabel: 'Avanzado', creatorId: 'player-001', coCreatorIds: [],
};

// g12: 4 players · pareja fija · Por Puntos 16 · Rosario · 1 cancha
const g12: ActiveGame = {
  id: 'g12', code: 'JR-2026-9004',
  name: 'Pareja Fija Rosario',
  format: 'americano', status: 'created',
  date: daysFromNow(2), time: '18:30',
  club: 'Padel Rosario Central', city: 'Rosario', country: 'Argentina',
  pairType: 'parejas', mixto: false,
  scoreConfig: { type: 'points', target: 16 },
  maxPlayers: 4, courts: 1,
  players: [
    mkPlayer('player-001', 'Carlos Méndez',   1200, true),
    mkPlayer('player-004', 'Ana Rodríguez',   1450, false),
    mkPlayer('player-008', 'Diego Fernández', 1320, false),
    mkPlayer('player-010', 'Isabel Bravo',    1650, false),
  ],
  invitedPlayers: [
    inv('player-004', 'Ana Rodríguez',   'ana@padelmgt.com',          '#00104', 1450, true),
    inv('player-008', 'Diego Fernández', 'dfernandez@padelmgt.com',   '#00108', 1320, false),
    inv('player-010', 'Isabel Bravo',    'ibravo@padelmgt.com',       '#00110', 1650, false),
  ],
  rounds: [], currentRound: 0, standings: [],
  levelLabel: 'Intermedio', creatorId: 'player-001', coCreatorIds: [],
};

// g13: 8 players · pareja fija · Por Puntos 24 · Santiago · 2 canchas
const g13: ActiveGame = {
  id: 'g13', code: 'JR-2026-9005',
  name: 'Equipos Chile 8',
  format: 'americano', status: 'created',
  date: daysFromNow(4), time: '09:00',
  club: 'Padel Santiago', city: 'Santiago', country: 'Chile',
  pairType: 'parejas', mixto: false,
  scoreConfig: { type: 'points', target: 24 },
  maxPlayers: 8, courts: 2,
  players: [
    mkPlayer('player-001', 'Carlos Méndez',    1200, true),
    mkPlayer('player-002', 'Sofía Ruiz',       1050, false),
    mkPlayer('player-003', 'Lucas Herrera',     980, false),
    mkPlayer('player-005', 'Marcos Herrera',   1800, false),
    mkPlayer('player-011', 'Juan Castro',      1050, false),
    mkPlayer('player-012', 'Elena Vidal',       920, false),
    mkPlayer('player-015', 'Valentina Cruz',   1120, false),
    mkPlayer('player-018', 'Alejandro Pérez', 1340, false),
  ],
  invitedPlayers: [
    inv('player-002', 'Sofía Ruiz',       'sofia@padelmgt.com',    '#00102', 1050, true),
    inv('player-003', 'Lucas Herrera',    'lucas@padelmgt.com',    '#00103',  980, true),
    inv('player-005', 'Marcos Herrera',   'marcos@padelmgt.com',   '#00105', 1800, true),
    inv('player-011', 'Juan Castro',      'jcastro@padelmgt.com',  '#00111', 1050, false),
    inv('player-012', 'Elena Vidal',      'evidal@padelmgt.com',   '#00112',  920, false),
    inv('player-015', 'Valentina Cruz',   'vcruz@padelmgt.com',    '#00115', 1120, false),
    inv('player-018', 'Alejandro Pérez',  'aperez@padelmgt.com',   '#00118', 1340, false),
  ],
  rounds: [], currentRound: 0, standings: [],
  levelLabel: 'Todos', creatorId: 'player-001', coCreatorIds: [],
};

const INITIAL_GAMES: ActiveGame[] = [g1, g2, g3, g4, g5, g6, g7, g8, g9, g10, g11, g12, g13];

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
