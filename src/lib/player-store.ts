// player-store.ts — All registered players on the platform

const STORAGE_KEY = 'padelmgt_registered_players';

export type PlayerLevel = 'beginner' | 'intermediate' | 'advanced';

export interface RegisteredPlayer {
  id: string;
  name: string;
  email: string;
  shortId: string;
  ranking: number;
  rankingPoints: number;
  level: PlayerLevel;
  city?: string;
  country?: string;
}

// ── Seed data ─────────────────────────────────────────────────────────────────

const SEED_PLAYERS: RegisteredPlayer[] = [
  // Auth users (must match login page user IDs)
  { id: 'player-001', name: 'Carlos Méndez',    email: 'carlos@padelmgt.com',       shortId: '#00101', ranking: 101, rankingPoints: 1200, level: 'intermediate', city: 'Buenos Aires', country: 'Argentina' },
  { id: 'player-002', name: 'Sofía Ruiz',        email: 'sofia@padelmgt.com',         shortId: '#00102', ranking: 102, rankingPoints: 1050, level: 'intermediate', city: 'Mendoza',      country: 'Argentina' },
  { id: 'player-003', name: 'Lucas Herrera',     email: 'lucas@padelmgt.com',         shortId: '#00103', ranking: 103, rankingPoints:  980, level: 'beginner',     city: 'Córdoba',      country: 'Argentina' },
  // Additional mock players for search
  { id: 'player-004', name: 'Ana Rodríguez',     email: 'ana@padelmgt.com',           shortId: '#00104', ranking:  34, rankingPoints: 1450, level: 'intermediate', city: 'Buenos Aires', country: 'Argentina' },
  { id: 'player-005', name: 'Marcos Herrera',    email: 'marcos@padelmgt.com',        shortId: '#00105', ranking:  12, rankingPoints: 1800, level: 'advanced',     city: 'Buenos Aires', country: 'Argentina' },
  { id: 'player-006', name: 'Carlos Vargas',     email: 'cvargas@padelmgt.com',       shortId: '#00106', ranking:  89, rankingPoints:  850, level: 'beginner',     city: 'Rosario',      country: 'Argentina' },
  { id: 'player-007', name: 'Laura Torres',      email: 'ltorres@padelmgt.com',       shortId: '#00107', ranking: 101, rankingPoints:  780, level: 'beginner',     city: 'Córdoba',      country: 'Argentina' },
  { id: 'player-008', name: 'Diego Fernández',   email: 'dfernandez@padelmgt.com',    shortId: '#00108', ranking:  45, rankingPoints: 1320, level: 'intermediate', city: 'Buenos Aires', country: 'Argentina' },
  { id: 'player-009', name: 'Pedro Morales',     email: 'pmorales@padelmgt.com',      shortId: '#00109', ranking:   8, rankingPoints: 2100, level: 'advanced',     city: 'Madrid',       country: 'España'    },
  { id: 'player-010', name: 'Isabel Bravo',      email: 'ibravo@padelmgt.com',        shortId: '#00110', ranking:  23, rankingPoints: 1650, level: 'advanced',     city: 'Madrid',       country: 'España'    },
  { id: 'player-011', name: 'Juan Castro',       email: 'jcastro@padelmgt.com',       shortId: '#00111', ranking:  67, rankingPoints: 1050, level: 'intermediate', city: 'Santiago',     country: 'Chile'     },
  { id: 'player-012', name: 'Elena Vidal',       email: 'evidal@padelmgt.com',        shortId: '#00112', ranking:  78, rankingPoints:  920, level: 'beginner',     city: 'Montevideo',   country: 'Uruguay'   },
  { id: 'player-013', name: 'Raúl Ortega',       email: 'rortega@padelmgt.com',       shortId: '#00113', ranking:  15, rankingPoints: 1760, level: 'advanced',     city: 'Buenos Aires', country: 'Argentina' },
  { id: 'player-014', name: 'Marta Fuentes',     email: 'mfuentes@padelmgt.com',      shortId: '#00114', ranking:  92, rankingPoints:  810, level: 'beginner',     city: 'Córdoba',      country: 'Argentina' },
  { id: 'player-015', name: 'Valentina Cruz',    email: 'vcruz@padelmgt.com',         shortId: '#00115', ranking:  56, rankingPoints: 1120, level: 'intermediate', city: 'Rosario',      country: 'Argentina' },
  { id: 'player-016', name: 'Nicolás Gómez',     email: 'ngomez@padelmgt.com',        shortId: '#00116', ranking:  29, rankingPoints: 1580, level: 'advanced',     city: 'Buenos Aires', country: 'Argentina' },
  { id: 'player-017', name: 'Fernanda Ríos',     email: 'frios@padelmgt.com',         shortId: '#00117', ranking:  71, rankingPoints:  990, level: 'intermediate', city: 'Madrid',       country: 'España'    },
  { id: 'player-018', name: 'Alejandro Pérez',   email: 'aperez@padelmgt.com',        shortId: '#00118', ranking:  44, rankingPoints: 1340, level: 'intermediate', city: 'Santiago',     country: 'Chile'     },
];

function isServer(): boolean {
  return typeof window === 'undefined';
}

function load(): RegisteredPlayer[] {
  if (isServer()) return SEED_PLAYERS;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(SEED_PLAYERS));
      return SEED_PLAYERS;
    }
    return JSON.parse(raw) as RegisteredPlayer[];
  } catch {
    return SEED_PLAYERS;
  }
}

function persist(players: RegisteredPlayer[]): void {
  if (isServer()) return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(players));
  } catch {}
}

export function getAllPlayers(): RegisteredPlayer[] {
  return load();
}

export function getPlayer(id: string): RegisteredPlayer | null {
  return load().find((p) => p.id === id) ?? null;
}

export function searchPlayers(query: string): RegisteredPlayer[] {
  if (!query.trim()) return [];
  const q = query.toLowerCase().trim();
  return load().filter(
    (p) =>
      p.name.toLowerCase().includes(q) ||
      p.email.toLowerCase().includes(q) ||
      p.shortId.toLowerCase().includes(q),
  );
}

export function getFriendsForPlayer(playerId: string): RegisteredPlayer[] {
  // Seed friendships (fallback for accounts without localStorage data)
  const SEED_FRIENDSHIPS: Record<string, string[]> = {
    'player-001': ['player-004', 'player-005', 'player-006', 'player-008'],
    'player-002': ['player-004', 'player-007', 'player-015'],
    'player-003': ['player-006', 'player-007', 'player-014'],
  };

  const seedIds = new Set<string>(SEED_FRIENDSHIPS[playerId] ?? []);

  // Dynamic friendships from localStorage (written by addFriendship)
  const dynamicIds = new Set<string>();
  if (!isServer()) {
    try {
      const raw = localStorage.getItem('padelmgt_friendships') ?? '{}';
      const map: Record<string, string[]> = JSON.parse(raw);
      (map[playerId] ?? []).forEach(id => dynamicIds.add(id));
    } catch {}
  }

  const allIds = new Set([...seedIds, ...dynamicIds]);
  return load().filter((p) => allIds.has(p.id));
}

export function addFriendship(playerId: string, friendId: string): void {
  // In a real app this would be a DB relation. Here we use a separate localStorage key.
  if (isServer()) return;
  try {
    const raw = localStorage.getItem('padelmgt_friendships') ?? '{}';
    const map: Record<string, string[]> = JSON.parse(raw);
    if (!map[playerId]) map[playerId] = [];
    if (!map[friendId]) map[friendId] = [];
    if (!map[playerId].includes(friendId)) map[playerId].push(friendId);
    if (!map[friendId].includes(playerId)) map[friendId].push(playerId);
    localStorage.setItem('padelmgt_friendships', JSON.stringify(map));
  } catch {}
}

export function areFriends(playerId: string, otherId: string): boolean {
  if (isServer()) return false;
  try {
    const raw = localStorage.getItem('padelmgt_friendships') ?? '{}';
    const map: Record<string, string[]> = JSON.parse(raw);
    return (map[playerId] ?? []).includes(otherId);
  } catch {
    return false;
  }
}

export function updatePlayerRankingPoints(playerId: string, delta: number): void {
  const all = load();
  const idx = all.findIndex((p) => p.id === playerId);
  if (idx < 0) return;
  all[idx] = {
    ...all[idx],
    rankingPoints: Math.max(0, all[idx].rankingPoints + delta),
  };
  persist(all);
}
