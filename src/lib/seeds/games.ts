/**
 * seeds/games.ts
 *
 * Demo seed data for the quick-game store.
 * Extracted from game-store.ts (g1–g13) so the store file contains only logic.
 */

import type {
  ActiveGame,
  GamePlayer,
  ScoreConfig,
  GameRound,
  InvitedPlayer,
} from '../game-engine';
import {
  generateAmericanoRounds,
  calculateStandings,
} from '../game-engine';

// ── Helpers ───────────────────────────────────────────────────────────────────

function mkPlayer(id: string, name: string, ranking: number, isCreator = false): GamePlayer {
  return { id, name, ranking, isCreator };
}

function completedRound(
  num: number,
  courts: Array<{
    courtNum: number;
    pair1: string[];
    pair2: string[];
    pair1Score: number;
    pair2Score: number;
  }>,
): GameRound {
  return {
    num,
    status: 'completed',
    resting: [],
    courts: courts.map((c) => ({ ...c, status: 'completed' as const })),
  };
}

function tomorrow(): string {
  const d = new Date(); d.setDate(d.getDate() + 1); return d.toISOString().split('T')[0];
}

function daysFromNow(n: number): string {
  const d = new Date(); d.setDate(d.getDate() + n); return d.toISOString().split('T')[0];
}

function inv(id: string, name: string, email: string, shortId: string, ranking: number, isFriend: boolean): InvitedPlayer {
  return { id, name, email, shortId, ranking, status: 'accepted', invitedAt: new Date().toISOString(), isFriend };
}

// ── Shared player sets ────────────────────────────────────────────────────────

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

const defaultPointsConfig: ScoreConfig = { type: 'points', target: 24 };

// ── g1: Americano live, 4 players, 1 round done + 1 active ───────────────────

const g1_rounds_generated = generateAmericanoRounds(PLAYERS_4, 1);
const g1_round1 = completedRound(1, [
  { courtNum: 1, pair1: [PLAYERS_4[0].id, PLAYERS_4[1].id], pair2: [PLAYERS_4[2].id, PLAYERS_4[3].id], pair1Score: 16, pair2Score: 10 },
]);
const g1_round2: GameRound = g1_rounds_generated[1]
  ? { ...g1_rounds_generated[1], num: 2, status: 'active' }
  : { num: 2, status: 'active', resting: [], courts: [{ courtNum: 1, pair1: [PLAYERS_4[0].id, PLAYERS_4[2].id], pair2: [PLAYERS_4[1].id, PLAYERS_4[3].id], pair1Score: null, pair2Score: null, status: 'pending' }] };

const g1Base: Omit<ActiveGame, 'standings'> = {
  id: 'g1', invitedPlayers: [], code: 'JR-2026-1001',
  name: 'Americano Express', format: 'americano', status: 'live',
  date: '2026-05-16', time: '19:00', club: 'Padel Madrid Central', city: 'Madrid',
  pairType: 'individual', mixto: false, scoreConfig: defaultPointsConfig,
  maxPlayers: 4, courts: 1, players: PLAYERS_4,
  rounds: [g1_round1, g1_round2], currentRound: 2, isCreator: true,
};
const g1: ActiveGame = { ...g1Base, standings: calculateStandings({ ...g1Base, standings: [] }) };

// ── g2: Americano starting_soon ───────────────────────────────────────────────

const g2: ActiveGame = {
  id: 'g2', invitedPlayers: [], code: 'JR-2026-1002',
  name: 'Juego del Barrio', format: 'americano', status: 'starting_soon',
  date: '2026-05-16', time: '20:30', club: 'Club Padel Barcelona', city: 'Barcelona',
  pairType: 'individual', mixto: false, scoreConfig: defaultPointsConfig,
  maxPlayers: 4, courts: 1, players: PLAYERS_4, rounds: [], currentRound: 0, standings: [],
};

// ── g3: Americano created, 2 players (incomplete) ────────────────────────────

const g3: ActiveGame = {
  id: 'g3', invitedPlayers: [], code: 'JR-2026-1003',
  name: 'Rápido Avanzado', format: 'americano', status: 'created',
  date: '2026-05-17', time: '09:00', club: 'Padel London Arena', city: 'London',
  pairType: 'individual', mixto: false, scoreConfig: defaultPointsConfig,
  maxPlayers: 8, courts: 1, players: [PLAYERS_4[0], PLAYERS_4[1]],
  rounds: [], currentRound: 0, standings: [],
};

// ── g4: Americano finished, 8 players, 3 rounds ───────────────────────────────

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
  id: 'g4', invitedPlayers: [], code: 'JR-2026-0920',
  name: 'Open Mixto', format: 'americano', status: 'finished',
  date: '2026-05-10', time: '10:00', club: 'Amsterdam Padel Center', city: 'Amsterdam',
  pairType: 'individual', mixto: true, scoreConfig: defaultPointsConfig,
  maxPlayers: 8, courts: 2, players: PLAYERS_8,
  rounds: [g4_r1, g4_r2, g4_r3], currentRound: 3,
};
const g4: ActiveGame = { ...g4Base, standings: calculateStandings({ ...g4Base, standings: [] }) };

// ── g5: Carlos creator, 4 players confirmed, ready to start ──────────────────

const G5_DATE = daysFromNow(1);
const G5_PLAYERS: GamePlayer[] = [
  mkPlayer('player-001', 'Carlos Méndez', 1200, true),
  mkPlayer('player-002', 'Sofía Ruiz',    1050),
  mkPlayer('player-003', 'Lucas Herrera',  980),
  mkPlayer('player-004', 'Ana Rodríguez', 1450),
];
const g5: ActiveGame = {
  id: 'g5', code: 'JR-2026-5001',
  name: 'Americano Express Carlos', format: 'americano', status: 'created',
  date: G5_DATE, time: '19:00', club: 'Club La Cantera', city: 'Córdoba', country: 'Argentina',
  pairType: 'individual', mixto: false, scoreConfig: { type: 'points', target: 24 },
  maxPlayers: 4, courts: 1, players: G5_PLAYERS,
  invitedPlayers: [
    inv('player-002', 'Sofía Ruiz',    'sofia@padelmgt.com',  '#00102', 1050, true),
    inv('player-003', 'Lucas Herrera', 'lucas@padelmgt.com',  '#00103',  980, false),
    inv('player-004', 'Ana Rodríguez', 'ana@padelmgt.com',    '#00104', 1450, true),
  ],
  rounds: [], currentRound: 0, standings: [],
  levelLabel: 'Intermedio', creatorId: 'player-001', coCreatorIds: [],
};

// ── g6: 8 players, intercambio, all confirmed ─────────────────────────────────

const G6_PLAYERS: GamePlayer[] = [
  mkPlayer('player-001', 'Carlos Méndez',   1200, true),
  mkPlayer('player-004', 'Ana Rodríguez',   1450),
  mkPlayer('player-005', 'Marcos Herrera',  1800),
  mkPlayer('player-006', 'Carlos Vargas',    850),
  mkPlayer('player-007', 'Laura Torres',     780),
  mkPlayer('player-008', 'Diego Fernández', 1320),
  mkPlayer('player-009', 'Pedro Morales',   2100),
  mkPlayer('player-010', 'Isabel Bravo',    1650),
];
const g6: ActiveGame = {
  id: 'g6', code: 'JR-2026-6001',
  name: 'Ronda de 8 — Intercambio', format: 'americano', status: 'created',
  date: tomorrow(), time: '10:00', club: 'Padel Arena', city: 'Buenos Aires', country: 'Argentina',
  pairType: 'individual', mixto: false, scoreConfig: { type: 'points', target: 24 },
  maxPlayers: 8, courts: 2, players: G6_PLAYERS,
  invitedPlayers: [
    inv('player-004', 'Ana Rodríguez',   'ana@padelmgt.com',         '#00104', 1450, true),
    inv('player-005', 'Marcos Herrera',  'marcos@padelmgt.com',      '#00105', 1800, true),
    inv('player-006', 'Carlos Vargas',   'cvargas@padelmgt.com',     '#00106',  850, false),
    inv('player-007', 'Laura Torres',    'ltorres@padelmgt.com',     '#00107',  780, false),
    inv('player-008', 'Diego Fernández', 'dfernandez@padelmgt.com',  '#00108', 1320, true),
    inv('player-009', 'Pedro Morales',   'pmorales@padelmgt.com',    '#00109', 2100, false),
    inv('player-010', 'Isabel Bravo',    'ibravo@padelmgt.com',      '#00110', 1650, false),
  ],
  rounds: [], currentRound: 0, standings: [],
  levelLabel: 'Avanzado', creatorId: 'player-001', coCreatorIds: [],
};

// ── g7: 4 players, pareja fija ────────────────────────────────────────────────

const G7_PLAYERS: GamePlayer[] = [
  mkPlayer('player-001', 'Carlos Méndez', 1200, true),
  mkPlayer('player-002', 'Sofía Ruiz',   1050),
  mkPlayer('player-003', 'Lucas Herrera',  980),
  mkPlayer('player-013', 'Raúl Ortega',  1760),
];
const g7: ActiveGame = {
  id: 'g7', code: 'JR-2026-7001',
  name: 'Pareja Fija — 4 Jugadores', format: 'americano', status: 'created',
  date: tomorrow(), time: '18:00', club: 'Club La Cantera', city: 'Córdoba', country: 'Argentina',
  pairType: 'parejas', mixto: false, scoreConfig: { type: 'points', target: 16 },
  maxPlayers: 4, courts: 1, players: G7_PLAYERS,
  invitedPlayers: [
    inv('player-002', 'Sofía Ruiz',    'sofia@padelmgt.com',   '#00102', 1050, true),
    inv('player-003', 'Lucas Herrera', 'lucas@padelmgt.com',   '#00103',  980, false),
    inv('player-013', 'Raúl Ortega',   'rortega@padelmgt.com', '#00113', 1760, false),
  ],
  rounds: [], currentRound: 0, standings: [],
  levelLabel: 'Intermedio', creatorId: 'player-001', coCreatorIds: [],
};

// ── g8: 4 players, live, round 2 active ──────────────────────────────────────

const G8_PLAYERS: GamePlayer[] = [
  mkPlayer('player-001', 'Carlos Méndez', 1200, true),
  mkPlayer('player-002', 'Sofía Ruiz',   1050),
  mkPlayer('player-003', 'Lucas Herrera',  980),
  mkPlayer('player-004', 'Ana Rodríguez', 1450),
];
const G8_R1 = completedRound(1, [
  { courtNum: 1, pair1: ['player-001', 'player-003'], pair2: ['player-002', 'player-004'], pair1Score: 18, pair2Score: 14 },
]);
const G8_R2: GameRound = {
  num: 2, status: 'active', resting: [],
  courts: [{ courtNum: 1, pair1: ['player-001', 'player-002'], pair2: ['player-003', 'player-004'], pair1Score: null, pair2Score: null, status: 'pending' }],
};
const G8_R3: GameRound = {
  num: 3, status: 'pending', resting: [],
  courts: [{ courtNum: 1, pair1: ['player-001', 'player-004'], pair2: ['player-002', 'player-003'], pair1Score: null, pair2Score: null, status: 'pending' }],
};
const g8Base: Omit<ActiveGame, 'standings'> = {
  id: 'g8', code: 'JR-2026-8001',
  name: 'En Vivo — Ronda 2', format: 'americano', status: 'live',
  date: new Date().toISOString().split('T')[0], time: '20:00',
  club: 'Padel Arena', city: 'Buenos Aires', country: 'Argentina',
  pairType: 'individual', mixto: false, scoreConfig: { type: 'points', target: 24 },
  maxPlayers: 4, courts: 1, players: G8_PLAYERS,
  invitedPlayers: [
    inv('player-002', 'Sofía Ruiz',    'sofia@padelmgt.com',  '#00102', 1050, true),
    inv('player-003', 'Lucas Herrera', 'lucas@padelmgt.com',  '#00103',  980, false),
    inv('player-004', 'Ana Rodríguez', 'ana@padelmgt.com',    '#00104', 1450, true),
  ],
  rounds: [G8_R1, G8_R2, G8_R3], currentRound: 2,
  levelLabel: 'Todos', creatorId: 'player-001', coCreatorIds: ['player-002'],
};
const g8: ActiveGame = { ...g8Base, standings: calculateStandings({ ...g8Base, standings: [] }) };

// ── g9–g13: 5 games, all confirmed, ready to start ───────────────────────────

const g9: ActiveGame = {
  id: 'g9', code: 'JR-2026-9001',
  name: 'Americano Barrio Norte', format: 'americano', status: 'created',
  date: daysFromNow(1), time: '20:00', club: 'Club Barrio Norte', city: 'Buenos Aires', country: 'Argentina',
  pairType: 'individual', mixto: false, scoreConfig: { type: 'points', target: 24 },
  maxPlayers: 4, courts: 1,
  players: [
    mkPlayer('player-001', 'Carlos Méndez',  1200, true),
    mkPlayer('player-002', 'Sofía Ruiz',     1050),
    mkPlayer('player-003', 'Lucas Herrera',   980),
    mkPlayer('player-004', 'Ana Rodríguez',  1450),
  ],
  invitedPlayers: [
    inv('player-002', 'Sofía Ruiz',    'sofia@padelmgt.com',  '#00102', 1050, true),
    inv('player-003', 'Lucas Herrera', 'lucas@padelmgt.com',  '#00103',  980, true),
    inv('player-004', 'Ana Rodríguez', 'ana@padelmgt.com',    '#00104', 1450, true),
  ],
  rounds: [], currentRound: 0, standings: [],
  levelLabel: 'Intermedio', creatorId: 'player-001', coCreatorIds: [],
};

const g10: ActiveGame = {
  id: 'g10', code: 'JR-2026-9002',
  name: 'Americano La Cantera 8', format: 'americano', status: 'created',
  date: daysFromNow(2), time: '10:00', club: 'Club La Cantera', city: 'Córdoba', country: 'Argentina',
  pairType: 'individual', mixto: false, scoreConfig: { type: 'points', target: 24 },
  maxPlayers: 8, courts: 2,
  players: [
    mkPlayer('player-001', 'Carlos Méndez',    1200, true),
    mkPlayer('player-005', 'Marcos Herrera',   1800),
    mkPlayer('player-006', 'Carlos Vargas',     850),
    mkPlayer('player-007', 'Laura Torres',      780),
    mkPlayer('player-008', 'Diego Fernández',  1320),
    mkPlayer('player-013', 'Raúl Ortega',      1760),
    mkPlayer('player-014', 'Marta Fuentes',     810),
    mkPlayer('player-015', 'Valentina Cruz',   1120),
  ],
  invitedPlayers: [
    inv('player-005', 'Marcos Herrera',   'marcos@padelmgt.com',     '#00105', 1800, true),
    inv('player-006', 'Carlos Vargas',    'cvargas@padelmgt.com',    '#00106',  850, false),
    inv('player-007', 'Laura Torres',     'ltorres@padelmgt.com',    '#00107',  780, false),
    inv('player-008', 'Diego Fernández',  'dfernandez@padelmgt.com', '#00108', 1320, false),
    inv('player-013', 'Raúl Ortega',      'rortega@padelmgt.com',    '#00113', 1760, false),
    inv('player-014', 'Marta Fuentes',    'mfuentes@padelmgt.com',   '#00114',  810, false),
    inv('player-015', 'Valentina Cruz',   'vcruz@padelmgt.com',      '#00115', 1120, false),
  ],
  rounds: [], currentRound: 0, standings: [],
  levelLabel: 'Avanzado', creatorId: 'player-001', coCreatorIds: [],
};

const g11: ActiveGame = {
  id: 'g11', code: 'JR-2026-9003',
  name: 'Sets Clásicos Madrid', format: 'americano', status: 'created',
  date: daysFromNow(3), time: '11:00', club: 'World Padel Tour', city: 'Madrid', country: 'España',
  pairType: 'individual', mixto: false,
  scoreConfig: { type: 'traditional', setsPerMatch: 1, gamesPerSet: 6, tiebreak: 7, deuce: 'oro' },
  maxPlayers: 6, courts: 1,
  players: [
    mkPlayer('player-001', 'Carlos Méndez',    1200, true),
    mkPlayer('player-009', 'Pedro Morales',    2100),
    mkPlayer('player-010', 'Isabel Bravo',     1650),
    mkPlayer('player-016', 'Nicolás Gómez',   1580),
    mkPlayer('player-017', 'Fernanda Ríos',    990),
    mkPlayer('player-018', 'Alejandro Pérez', 1340),
  ],
  invitedPlayers: [
    inv('player-009', 'Pedro Morales',    'pmorales@padelmgt.com', '#00109', 2100, false),
    inv('player-010', 'Isabel Bravo',     'ibravo@padelmgt.com',   '#00110', 1650, false),
    inv('player-016', 'Nicolás Gómez',   'ngomez@padelmgt.com',   '#00116', 1580, false),
    inv('player-017', 'Fernanda Ríos',   'frios@padelmgt.com',    '#00117',  990, false),
    inv('player-018', 'Alejandro Pérez', 'aperez@padelmgt.com',   '#00118', 1340, false),
  ],
  rounds: [], currentRound: 0, standings: [],
  levelLabel: 'Avanzado', creatorId: 'player-001', coCreatorIds: [],
};

const g12: ActiveGame = {
  id: 'g12', code: 'JR-2026-9004',
  name: 'Pareja Fija Rosario', format: 'americano', status: 'created',
  date: daysFromNow(2), time: '18:30',
  club: 'Padel Rosario Central', city: 'Rosario', country: 'Argentina',
  pairType: 'parejas', mixto: false, scoreConfig: { type: 'points', target: 16 },
  maxPlayers: 4, courts: 1,
  players: [
    mkPlayer('player-001', 'Carlos Méndez',   1200, true),
    mkPlayer('player-004', 'Ana Rodríguez',   1450),
    mkPlayer('player-008', 'Diego Fernández', 1320),
    mkPlayer('player-010', 'Isabel Bravo',    1650),
  ],
  invitedPlayers: [
    inv('player-004', 'Ana Rodríguez',   'ana@padelmgt.com',         '#00104', 1450, true),
    inv('player-008', 'Diego Fernández', 'dfernandez@padelmgt.com',  '#00108', 1320, false),
    inv('player-010', 'Isabel Bravo',    'ibravo@padelmgt.com',      '#00110', 1650, false),
  ],
  rounds: [], currentRound: 0, standings: [],
  levelLabel: 'Intermedio', creatorId: 'player-001', coCreatorIds: [],
};

const g13: ActiveGame = {
  id: 'g13', code: 'JR-2026-9005',
  name: 'Equipos Chile 8', format: 'americano', status: 'created',
  date: daysFromNow(4), time: '09:00',
  club: 'Padel Santiago', city: 'Santiago', country: 'Chile',
  pairType: 'parejas', mixto: false, scoreConfig: { type: 'points', target: 24 },
  maxPlayers: 8, courts: 2,
  players: [
    mkPlayer('player-001', 'Carlos Méndez',    1200, true),
    mkPlayer('player-002', 'Sofía Ruiz',       1050),
    mkPlayer('player-003', 'Lucas Herrera',     980),
    mkPlayer('player-005', 'Marcos Herrera',   1800),
    mkPlayer('player-011', 'Juan Castro',      1050),
    mkPlayer('player-012', 'Elena Vidal',       920),
    mkPlayer('player-015', 'Valentina Cruz',   1120),
    mkPlayer('player-018', 'Alejandro Pérez', 1340),
  ],
  invitedPlayers: [
    inv('player-002', 'Sofía Ruiz',       'sofia@padelmgt.com',   '#00102', 1050, true),
    inv('player-003', 'Lucas Herrera',    'lucas@padelmgt.com',   '#00103',  980, true),
    inv('player-005', 'Marcos Herrera',   'marcos@padelmgt.com',  '#00105', 1800, true),
    inv('player-011', 'Juan Castro',      'jcastro@padelmgt.com', '#00111', 1050, false),
    inv('player-012', 'Elena Vidal',      'evidal@padelmgt.com',  '#00112',  920, false),
    inv('player-015', 'Valentina Cruz',   'vcruz@padelmgt.com',   '#00115', 1120, false),
    inv('player-018', 'Alejandro Pérez',  'aperez@padelmgt.com',  '#00118', 1340, false),
  ],
  rounds: [], currentRound: 0, standings: [],
  levelLabel: 'Todos', creatorId: 'player-001', coCreatorIds: [],
};

export const INITIAL_GAMES: ActiveGame[] = [g1, g2, g3, g4, g5, g6, g7, g8, g9, g10, g11, g12, g13];
