/**
 * seeds/players.ts
 *
 * Demo seed data for the registered-player store and related fixtures.
 * Extracted from player-store.ts and friend-request-store.ts so store files
 * remain free of hard-coded data arrays.
 *
 * NOTE: Types are defined inline here (not imported from the stores) to avoid
 * circular module dependencies. Keep these in sync with player-store.ts and
 * friend-request-store.ts.
 */

// Inline minimal types to avoid circular imports
type PlayerLevel = '1.0' | '1.5' | '2.0' | '2.5' | '3.0' | '3.5' | '4.0' | '4.5' | '5.0' | '5.5' | '6.0' | '7.0';
type PlayerSex   = 'M' | 'F';

interface RegisteredPlayer {
  id: string; shortId: string; name: string; email: string;
  password?: string; sex?: PlayerSex; country?: string; city?: string;
  level?: PlayerLevel; photoUrl?: string; ranking: number; rankingPoints: number;
  profileCompleted?: boolean; plan?: string;
}

interface FriendRequest {
  id: string; fromId: string; fromName: string;
  toId: string; toName: string;
  status: 'pending' | 'accepted' | 'rejected';
  createdAt: string;
}

// ── Seed players ──────────────────────────────────────────────────────────────

export const SEED_PLAYERS: RegisteredPlayer[] = [
  { id: 'player-001', shortId: '#00101', name: 'Carlos Méndez',   email: 'carlos@padelmgt.com',      password: 'jugador123', sex: 'M', country: 'Argentina', city: 'Buenos Aires', level: '3.0', ranking: 101, rankingPoints: 1200, profileCompleted: true },
  { id: 'player-002', shortId: '#00102', name: 'Sofía Ruiz',       email: 'sofia@padelmgt.com',        password: 'jugador123', sex: 'F', country: 'Argentina', city: 'Mendoza',      level: '3.0', ranking: 102, rankingPoints: 1050, profileCompleted: true },
  { id: 'player-003', shortId: '#00103', name: 'Lucas Herrera',    email: 'lucas@padelmgt.com',        password: 'jugador123', sex: 'M', country: 'Argentina', city: 'Córdoba',      level: '1.0',     ranking: 103, rankingPoints:  980, profileCompleted: true },
  { id: 'player-004', shortId: '#00104', name: 'Ana Rodríguez',    email: 'ana@padelmgt.com',          password: 'jugador123', sex: 'F', country: 'Argentina', city: 'Buenos Aires', level: '3.0', ranking:  34, rankingPoints: 1450, profileCompleted: true },
  { id: 'player-005', shortId: '#00105', name: 'Marcos Herrera',   email: 'marcos@padelmgt.com',       password: 'jugador123', sex: 'M', country: 'Argentina', city: 'Buenos Aires', level: '4.5',     ranking:  12, rankingPoints: 1800, profileCompleted: true },
  { id: 'player-006', shortId: '#00106', name: 'Carlos Vargas',    email: 'cvargas@padelmgt.com',      password: 'jugador123', sex: 'M', country: 'Argentina', city: 'Rosario',      level: '1.0',     ranking:  89, rankingPoints:  850, profileCompleted: true },
  { id: 'player-007', shortId: '#00107', name: 'Laura Torres',     email: 'ltorres@padelmgt.com',      password: 'jugador123', sex: 'F', country: 'Argentina', city: 'Córdoba',      level: '1.0',     ranking: 101, rankingPoints:  780, profileCompleted: true },
  { id: 'player-008', shortId: '#00108', name: 'Diego Fernández',  email: 'dfernandez@padelmgt.com',   password: 'jugador123', sex: 'M', country: 'Argentina', city: 'Buenos Aires', level: '3.0', ranking:  45, rankingPoints: 1320, profileCompleted: true },
  { id: 'player-009', shortId: '#00109', name: 'Pedro Morales',    email: 'pmorales@padelmgt.com',     password: 'jugador123', sex: 'M', country: 'España',    city: 'Madrid',       level: '4.5',     ranking:   8, rankingPoints: 2100, profileCompleted: true },
  { id: 'player-010', shortId: '#00110', name: 'Isabel Bravo',     email: 'ibravo@padelmgt.com',       password: 'jugador123', sex: 'F', country: 'España',    city: 'Madrid',       level: '4.5',     ranking:  23, rankingPoints: 1650, profileCompleted: true },
  { id: 'player-011', shortId: '#00111', name: 'Juan Castro',      email: 'jcastro@padelmgt.com',      password: 'jugador123', sex: 'M', country: 'Chile',     city: 'Santiago',     level: '3.0', ranking:  67, rankingPoints: 1050, profileCompleted: true },
  { id: 'player-012', shortId: '#00112', name: 'Elena Vidal',      email: 'evidal@padelmgt.com',       password: 'jugador123', sex: 'F', country: 'Uruguay',   city: 'Montevideo',   level: '1.0',     ranking:  78, rankingPoints:  920, profileCompleted: true },
  { id: 'player-013', shortId: '#00113', name: 'Raúl Ortega',      email: 'rortega@padelmgt.com',      password: 'jugador123', sex: 'M', country: 'Argentina', city: 'Buenos Aires', level: '4.5',     ranking:  15, rankingPoints: 1760, profileCompleted: true },
  { id: 'player-014', shortId: '#00114', name: 'Marta Fuentes',    email: 'mfuentes@padelmgt.com',     password: 'jugador123', sex: 'F', country: 'Argentina', city: 'Córdoba',      level: '1.0',     ranking:  92, rankingPoints:  810, profileCompleted: true },
  { id: 'player-015', shortId: '#00115', name: 'Valentina Cruz',   email: 'vcruz@padelmgt.com',        password: 'jugador123', sex: 'F', country: 'Argentina', city: 'Rosario',      level: '3.0', ranking:  56, rankingPoints: 1120, profileCompleted: true },
  { id: 'player-016', shortId: '#00116', name: 'Nicolás Gómez',    email: 'ngomez@padelmgt.com',       password: 'jugador123', sex: 'M', country: 'Argentina', city: 'Buenos Aires', level: '4.5',     ranking:  29, rankingPoints: 1580, profileCompleted: true },
  { id: 'player-017', shortId: '#00117', name: 'Fernanda Ríos',    email: 'frios@padelmgt.com',        password: 'jugador123', sex: 'F', country: 'España',    city: 'Madrid',       level: '3.0', ranking:  71, rankingPoints:  990, profileCompleted: true },
  { id: 'player-018', shortId: '#00118', name: 'Alejandro Pérez',  email: 'aperez@padelmgt.com',       password: 'jugador123', sex: 'M', country: 'Chile',     city: 'Santiago',     level: '3.0', ranking:  44, rankingPoints: 1340, profileCompleted: true },
];

// ── Seed friendships ─────────────────────────────────────────────────────────

export const SEED_FRIENDSHIPS: Record<string, string[]> = {
  'player-001': ['player-004', 'player-005', 'player-006', 'player-008'],
  'player-002': ['player-004', 'player-007', 'player-015'],
  'player-003': ['player-006', 'player-007', 'player-014'],
};

// ── Seed friend requests ──────────────────────────────────────────────────────

export const SEED_FRIEND_REQUESTS: FriendRequest[] = [
  { id: 'fr-seed-1', fromId: 'player-009', fromName: 'Pedro Morales',  toId: 'player-001', toName: 'Carlos Méndez', status: 'pending', createdAt: '2026-05-24T10:00:00.000Z' },
  { id: 'fr-seed-2', fromId: 'player-010', fromName: 'Isabel Bravo',   toId: 'player-001', toName: 'Carlos Méndez', status: 'pending', createdAt: '2026-05-24T11:30:00.000Z' },
  { id: 'fr-seed-3', fromId: 'player-001', fromName: 'Carlos Méndez',  toId: 'player-016', toName: 'Nicolás Gómez', status: 'pending', createdAt: '2026-05-23T09:00:00.000Z' },
];
