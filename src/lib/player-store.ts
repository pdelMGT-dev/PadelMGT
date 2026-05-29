// player-store.ts — Single source of truth for all registered players
import { registerPlayerToSupabase, upsertSAPlayerToSupabase } from './superadmin-data';

const STORAGE_KEY = 'padelmgt_registered_players';

export type PlayerLevel = 'beginner' | 'intermediate' | 'advanced';
export type PlayerSex   = 'M' | 'F';

export interface RegisteredPlayer {
  id: string;
  shortId: string;           // e.g. "#00101"
  name: string;
  email: string;
  password?: string;         // stored for demo; real app would hash server-side
  sex?: PlayerSex;
  country?: string;
  city?: string;
  level?: PlayerLevel;
  ranking: number;
  rankingPoints: number;
  profileCompleted?: boolean;
}

// ── Seed players ──────────────────────────────────────────────────────────────

const SEED_PLAYERS: RegisteredPlayer[] = [
  { id: 'player-001', shortId: '#00101', name: 'Carlos Méndez',   email: 'carlos@padelmgt.com',      password: 'jugador123', sex: 'M', country: 'Argentina', city: 'Buenos Aires', level: 'intermediate', ranking: 101, rankingPoints: 1200, profileCompleted: true },
  { id: 'player-002', shortId: '#00102', name: 'Sofía Ruiz',       email: 'sofia@padelmgt.com',        password: 'jugador123', sex: 'F', country: 'Argentina', city: 'Mendoza',      level: 'intermediate', ranking: 102, rankingPoints: 1050, profileCompleted: true },
  { id: 'player-003', shortId: '#00103', name: 'Lucas Herrera',    email: 'lucas@padelmgt.com',        password: 'jugador123', sex: 'M', country: 'Argentina', city: 'Córdoba',      level: 'beginner',     ranking: 103, rankingPoints:  980, profileCompleted: true },
  { id: 'player-004', shortId: '#00104', name: 'Ana Rodríguez',    email: 'ana@padelmgt.com',          password: 'jugador123', sex: 'F', country: 'Argentina', city: 'Buenos Aires', level: 'intermediate', ranking:  34, rankingPoints: 1450, profileCompleted: true },
  { id: 'player-005', shortId: '#00105', name: 'Marcos Herrera',   email: 'marcos@padelmgt.com',       password: 'jugador123', sex: 'M', country: 'Argentina', city: 'Buenos Aires', level: 'advanced',     ranking:  12, rankingPoints: 1800, profileCompleted: true },
  { id: 'player-006', shortId: '#00106', name: 'Carlos Vargas',    email: 'cvargas@padelmgt.com',      password: 'jugador123', sex: 'M', country: 'Argentina', city: 'Rosario',      level: 'beginner',     ranking:  89, rankingPoints:  850, profileCompleted: true },
  { id: 'player-007', shortId: '#00107', name: 'Laura Torres',     email: 'ltorres@padelmgt.com',      password: 'jugador123', sex: 'F', country: 'Argentina', city: 'Córdoba',      level: 'beginner',     ranking: 101, rankingPoints:  780, profileCompleted: true },
  { id: 'player-008', shortId: '#00108', name: 'Diego Fernández',  email: 'dfernandez@padelmgt.com',   password: 'jugador123', sex: 'M', country: 'Argentina', city: 'Buenos Aires', level: 'intermediate', ranking:  45, rankingPoints: 1320, profileCompleted: true },
  { id: 'player-009', shortId: '#00109', name: 'Pedro Morales',    email: 'pmorales@padelmgt.com',     password: 'jugador123', sex: 'M', country: 'España',    city: 'Madrid',       level: 'advanced',     ranking:   8, rankingPoints: 2100, profileCompleted: true },
  { id: 'player-010', shortId: '#00110', name: 'Isabel Bravo',     email: 'ibravo@padelmgt.com',       password: 'jugador123', sex: 'F', country: 'España',    city: 'Madrid',       level: 'advanced',     ranking:  23, rankingPoints: 1650, profileCompleted: true },
  { id: 'player-011', shortId: '#00111', name: 'Juan Castro',      email: 'jcastro@padelmgt.com',      password: 'jugador123', sex: 'M', country: 'Chile',     city: 'Santiago',     level: 'intermediate', ranking:  67, rankingPoints: 1050, profileCompleted: true },
  { id: 'player-012', shortId: '#00112', name: 'Elena Vidal',      email: 'evidal@padelmgt.com',       password: 'jugador123', sex: 'F', country: 'Uruguay',   city: 'Montevideo',   level: 'beginner',     ranking:  78, rankingPoints:  920, profileCompleted: true },
  { id: 'player-013', shortId: '#00113', name: 'Raúl Ortega',      email: 'rortega@padelmgt.com',      password: 'jugador123', sex: 'M', country: 'Argentina', city: 'Buenos Aires', level: 'advanced',     ranking:  15, rankingPoints: 1760, profileCompleted: true },
  { id: 'player-014', shortId: '#00114', name: 'Marta Fuentes',    email: 'mfuentes@padelmgt.com',     password: 'jugador123', sex: 'F', country: 'Argentina', city: 'Córdoba',      level: 'beginner',     ranking:  92, rankingPoints:  810, profileCompleted: true },
  { id: 'player-015', shortId: '#00115', name: 'Valentina Cruz',   email: 'vcruz@padelmgt.com',        password: 'jugador123', sex: 'F', country: 'Argentina', city: 'Rosario',      level: 'intermediate', ranking:  56, rankingPoints: 1120, profileCompleted: true },
  { id: 'player-016', shortId: '#00116', name: 'Nicolás Gómez',    email: 'ngomez@padelmgt.com',       password: 'jugador123', sex: 'M', country: 'Argentina', city: 'Buenos Aires', level: 'advanced',     ranking:  29, rankingPoints: 1580, profileCompleted: true },
  { id: 'player-017', shortId: '#00117', name: 'Fernanda Ríos',    email: 'frios@padelmgt.com',        password: 'jugador123', sex: 'F', country: 'España',    city: 'Madrid',       level: 'intermediate', ranking:  71, rankingPoints:  990, profileCompleted: true },
  { id: 'player-018', shortId: '#00118', name: 'Alejandro Pérez',  email: 'aperez@padelmgt.com',       password: 'jugador123', sex: 'M', country: 'Chile',     city: 'Santiago',     level: 'intermediate', ranking:  44, rankingPoints: 1340, profileCompleted: true },
];

// ── Storage helpers ───────────────────────────────────────────────────────────

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

// ── Sequential shortId generator ─────────────────────────────────────────────

function nextShortId(players: RegisteredPlayer[]): string {
  const nums = players
    .map(p => parseInt(p.shortId.replace('#', ''), 10))
    .filter(n => !isNaN(n));
  const next = nums.length > 0 ? Math.max(...nums) + 1 : 101;
  return '#' + String(next).padStart(5, '0');
}

// ── Public API ────────────────────────────────────────────────────────────────

export function getAllPlayers(): RegisteredPlayer[] {
  return load();
}

export function getPlayer(id: string): RegisteredPlayer | null {
  return load().find(p => p.id === id) ?? null;
}

export function getPlayerByEmail(email: string): RegisteredPlayer | null {
  return load().find(p => p.email.toLowerCase() === email.toLowerCase()) ?? null;
}

export function getPlayerByShortId(shortId: string): RegisteredPlayer | null {
  const q = shortId.startsWith('#') ? shortId : `#${shortId}`;
  return load().find(p => p.shortId.toLowerCase() === q.toLowerCase()) ?? null;
}

/** Search by name, shortId or email. Optional country filter. */
export function searchPlayers(
  query: string,
  opts?: { country?: string },
): RegisteredPlayer[] {
  const q = query.trim().toLowerCase();
  const players = load();
  return players.filter(p => {
    const matchQuery = !q
      || p.name.toLowerCase().includes(q)
      || p.email.toLowerCase().includes(q)
      || p.shortId.toLowerCase().includes(q)
      || p.shortId.replace('#', '').includes(q);
    const matchCountry = !opts?.country || p.country === opts.country;
    return matchQuery && matchCountry;
  });
}

/** Get all distinct countries from the player base. */
export function getPlayerCountries(): string[] {
  const all = load();
  return [...new Set(all.map(p => p.country).filter(Boolean) as string[])].sort();
}

export interface RegisterParams {
  name: string;
  email: string;
  password: string;
  country: string;
  sex: PlayerSex;
}

/** Register a new player. Returns the player or null if email already taken. */
export function registerPlayer(params: RegisterParams): RegisteredPlayer | null {
  const all = load();
  if (all.some(p => p.email.toLowerCase() === params.email.toLowerCase())) return null;

  const shortId = nextShortId(all);
  const id = `player-${shortId.replace('#', '')}`;
  const newPlayer: RegisteredPlayer = {
    id,
    shortId,
    name: params.name,
    email: params.email,
    password: params.password,
    sex: params.sex,
    country: params.country,
    ranking: all.length + 1,
    rankingPoints: 0,
    profileCompleted: false,
  };
  persist([...all, newPlayer]);
  registerPlayerToSupabase(newPlayer).catch(() => {/* fire-and-forget */});
  return newPlayer;
}

/** Authenticate by email + password. Returns the player or null. */
export function authenticatePlayer(
  email: string,
  password: string,
): RegisteredPlayer | null {
  const p = load().find(
    p => p.email.toLowerCase() === email.toLowerCase() && p.password === password,
  );
  return p ?? null;
}

/** Mark the player's profile as completed. */
export function markProfileCompleted(playerId: string): void {
  const all = load();
  const idx = all.findIndex(p => p.id === playerId);
  if (idx < 0) return;
  all[idx] = { ...all[idx], profileCompleted: true };
  persist(all);
}

// ── Friendship helpers ────────────────────────────────────────────────────────

const SEED_FRIENDSHIPS: Record<string, string[]> = {
  'player-001': ['player-004', 'player-005', 'player-006', 'player-008'],
  'player-002': ['player-004', 'player-007', 'player-015'],
  'player-003': ['player-006', 'player-007', 'player-014'],
};

function loadFriendshipMap(): Record<string, string[]> {
  if (isServer()) return SEED_FRIENDSHIPS;
  try {
    const raw = localStorage.getItem('padelmgt_friendships') ?? '{}';
    return JSON.parse(raw) as Record<string, string[]>;
  } catch { return {}; }
}

function persistFriendshipMap(map: Record<string, string[]>): void {
  if (isServer()) return;
  try { localStorage.setItem('padelmgt_friendships', JSON.stringify(map)); } catch {}
}

export function getFriendsForPlayer(playerId: string): RegisteredPlayer[] {
  const seedIds = new Set<string>(SEED_FRIENDSHIPS[playerId] ?? []);
  const dynamic = loadFriendshipMap();
  const dynamicIds = new Set<string>(dynamic[playerId] ?? []);
  const allIds = new Set([...seedIds, ...dynamicIds]);
  return load().filter(p => allIds.has(p.id));
}

export function addFriendship(playerId: string, friendId: string): void {
  if (isServer()) return;
  const map = loadFriendshipMap();
  if (!map[playerId]) map[playerId] = [];
  if (!map[friendId]) map[friendId] = [];
  if (!map[playerId].includes(friendId)) map[playerId].push(friendId);
  if (!map[friendId].includes(playerId)) map[friendId].push(playerId);
  persistFriendshipMap(map);
}

export function removeFriendship(playerId: string, friendId: string): void {
  if (isServer()) return;
  const map = loadFriendshipMap();

  // Also remove from seed (store overrides)
  if (!map[playerId]) map[playerId] = [...(SEED_FRIENDSHIPS[playerId] ?? [])];
  if (!map[friendId]) map[friendId] = [...(SEED_FRIENDSHIPS[friendId] ?? [])];

  // Merge seed + dynamic then remove
  const merged1 = [...new Set([...(SEED_FRIENDSHIPS[playerId] ?? []), ...map[playerId]])];
  const merged2 = [...new Set([...(SEED_FRIENDSHIPS[friendId] ?? []), ...map[friendId]])];
  map[playerId] = merged1.filter(id => id !== friendId);
  map[friendId] = merged2.filter(id => id !== playerId);
  persistFriendshipMap(map);
}

export function areFriends(playerId: string, otherId: string): boolean {
  if (isServer()) return false;
  const seedFriends = SEED_FRIENDSHIPS[playerId] ?? [];
  if (seedFriends.includes(otherId)) return true;
  const map = loadFriendshipMap();
  return (map[playerId] ?? []).includes(otherId);
}

export function updatePlayerRankingPoints(playerId: string, delta: number): void {
  const all = load();
  const idx = all.findIndex(p => p.id === playerId);
  if (idx < 0) return;
  all[idx] = { ...all[idx], rankingPoints: Math.max(0, all[idx].rankingPoints + delta) };
  persist(all);
  upsertSAPlayerToSupabase(all[idx]).catch(() => {});
}

/** Update any fields on an existing player and sync to Supabase. */
export function updatePlayer(playerId: string, updates: Partial<RegisteredPlayer>): RegisteredPlayer | null {
  const all = load();
  const idx = all.findIndex(p => p.id === playerId);
  if (idx < 0) return null;
  const updated = { ...all[idx], ...updates };
  all[idx] = updated;
  persist(all);
  // Also update padelmgt_user session if it's the same player
  if (typeof window !== 'undefined') {
    try {
      const raw = localStorage.getItem('padelmgt_user');
      if (raw) {
        const session = JSON.parse(raw) as { id?: string };
        if (session.id === playerId) {
          localStorage.setItem('padelmgt_user', JSON.stringify({ ...session, ...updates }));
        }
      }
    } catch { /* silent */ }
  }
  upsertSAPlayerToSupabase(updated).catch(() => {});
  return updated;
}
