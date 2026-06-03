// player-store.ts — Single source of truth for all registered players
import { registerPlayerToSupabase, upsertSAPlayerToSupabase } from './superadmin-data';
import { SEED_PLAYERS, SEED_FRIENDSHIPS } from './seeds/players';
import { createLocalStore, isServer } from './local-store';
export { SEED_PLAYERS, SEED_FRIENDSHIPS };

const STORAGE_KEY = 'padelmgt_registered_players';
const _store = createLocalStore<RegisteredPlayer[]>(STORAGE_KEY, SEED_PLAYERS);

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
  return _store.load();
}

export function getPlayer(id: string): RegisteredPlayer | null {
  return _store.load().find(p => p.id === id) ?? null;
}

export function getPlayerByEmail(email: string): RegisteredPlayer | null {
  return _store.load().find(p => p.email.toLowerCase() === email.toLowerCase()) ?? null;
}

export function getPlayerByShortId(shortId: string): RegisteredPlayer | null {
  const q = shortId.startsWith('#') ? shortId : `#${shortId}`;
  return _store.load().find(p => p.shortId.toLowerCase() === q.toLowerCase()) ?? null;
}

/** Search by name, shortId or email. Optional country filter. */
export function searchPlayers(
  query: string,
  opts?: { country?: string },
): RegisteredPlayer[] {
  const q = query.trim().toLowerCase();
  const players = _store.load();
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
  const all = _store.load();
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
  const all = _store.load();
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
  _store.persist([...all, newPlayer]);
  registerPlayerToSupabase(newPlayer).catch(err => console.warn('[Supabase] registerPlayer failed:', err));
  return newPlayer;
}

/**
 * Authenticate by email + password.
 * SECURITY NOTE: passwords are stored in plaintext — demo only.
 * Before going to production, replace with Supabase Auth or server-side hashing.
 */
export function authenticatePlayer(
  email: string,
  password: string,
): RegisteredPlayer | null {
  const p = _store.load().find(
    p => p.email.toLowerCase() === email.toLowerCase() && p.password === password,
  );
  return p ?? null;
}

/** Mark the player's profile as completed. */
export function markProfileCompleted(playerId: string): void {
  const all = _store.load();
  const idx = all.findIndex(p => p.id === playerId);
  if (idx < 0) return;
  all[idx] = { ...all[idx], profileCompleted: true };
  _store.persist(all);
}

// ── Friendship helpers ────────────────────────────────────────────────────────
// SEED_FRIENDSHIPS is re-exported above from seeds/players.ts

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
  return _store.load().filter(p => allIds.has(p.id));
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
  const all = _store.load();
  const idx = all.findIndex(p => p.id === playerId);
  if (idx < 0) return;
  all[idx] = { ...all[idx], rankingPoints: Math.max(0, all[idx].rankingPoints + delta) };
  _store.persist(all);
  upsertSAPlayerToSupabase(all[idx]).catch(err => console.warn('[Supabase] updateRankingPoints failed:', err));
}

/** Update any fields on an existing player and sync to Supabase. */
export function updatePlayer(playerId: string, updates: Partial<RegisteredPlayer>): RegisteredPlayer | null {
  const all = _store.load();
  const idx = all.findIndex(p => p.id === playerId);
  if (idx < 0) return null;
  const updated = { ...all[idx], ...updates };
  all[idx] = updated;
  _store.persist(all);
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
  upsertSAPlayerToSupabase(updated).catch(err => console.warn('[Supabase] updatePlayer failed:', err));
  return updated;
}
