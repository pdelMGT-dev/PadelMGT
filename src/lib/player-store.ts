// player-store.ts — Single source of truth for all registered players
import { SEED_PLAYERS, SEED_FRIENDSHIPS } from './seeds/players';
import { createLocalStore, isServer } from './local-store';
import { normalizeLegacyLevel } from './level-config';
export { SEED_PLAYERS, SEED_FRIENDSHIPS };

/** Sync player data to Supabase via the server-side API route (uses service role key). */
async function syncPlayerToSupabase(p: RegisteredPlayer & { authUserId?: string }): Promise<void> {
  if (typeof window === 'undefined') return; // server-side: skip
  const res = await fetch('/api/player/update', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(p),
  });
  if (!res.ok) {
    let message = `status ${res.status}`;
    try { const body = await res.json() as { error?: string }; if (body.error) message = body.error; } catch { /* ignore */ }
    throw new Error(message);
  }
}

const STORAGE_KEY = 'padelmgt_registered_players';
const _store = createLocalStore<RegisteredPlayer[]>(STORAGE_KEY, SEED_PLAYERS);

export type { PlayerLevel } from './level-config';
export type PlayerSex = 'M' | 'F';

export interface RegisteredPlayer {
  id: string;
  shortId: string;           // e.g. "#00101"
  name: string;
  email: string;
  /** @deprecated Passwords are managed by Supabase Auth. Only present on legacy/seed records. */
  password?: string;
  sex?: PlayerSex;
  country?: string;
  city?: string;
  level?: import('./level-config').PlayerLevel;
  /** Photo URL (Supabase Storage or external URL). */
  photoUrl?: string;
  phone?: string;
  description?: string;
  birthDate?: string;
  ranking: number;
  rankingPoints: number;
  profileCompleted?: boolean;
  /** Supabase Auth user UUID, set on registration via Supabase Auth. */
  authUserId?: string;
  /** Highest active plan (backwards compat). Authoritative list in subscriptions table. */
  plan?: string;
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
  country: string;
  sex: PlayerSex;
  /** Supabase Auth user UUID — provided when registration goes through Supabase Auth. */
  authUserId?: string;
}

/**
 * Server-first registration: the id/shortId are assigned by Supabase via
 * /api/player/register (idempotent by email), so they can never collide
 * across devices. The result is cached locally. Falls back to the legacy
 * local-only path when the server is unreachable (dev without Supabase).
 */
export async function registerPlayerServerFirst(
  params: RegisterParams,
): Promise<{ player: RegisteredPlayer | null; existed: boolean; offline: boolean }> {
  if (typeof window !== 'undefined') {
    try {
      const res = await fetch('/api/player/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(params),
      });
      if (res.ok) {
        const json = await res.json();
        const p = json.player as RegisteredPlayer;
        // Cache locally, replacing any stale row with the same email or id.
        const all = _store.load().filter(x =>
          x.id !== p.id && x.email.toLowerCase() !== p.email.toLowerCase());
        _store.persist([...all, { ...p, authUserId: params.authUserId }]);
        return { player: p, existed: !!json.existed, offline: false };
      }
      if (res.status === 400 || res.status === 403) {
        return { player: null, existed: false, offline: false };
      }
      // 5xx → fall through to the local fallback
    } catch { /* network error → local fallback */ }
  }
  return { player: registerPlayer(params), existed: false, offline: true };
}

/** @deprecated Local-only registration; ids may collide across devices.
 * Kept solely as the offline fallback for registerPlayerServerFirst. */
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
    // password intentionally not stored — managed by Supabase Auth
    sex: params.sex,
    country: params.country,
    level: '1.0',
    plan: 'free',
    ranking: all.length + 1,
    rankingPoints: 0,
    profileCompleted: false,
    authUserId: params.authUserId,
  };
  _store.persist([...all, newPlayer]);
  syncPlayerToSupabase({ ...newPlayer, authUserId: params.authUserId })
    .catch(err => console.warn('[player-store] registerPlayer sync failed:', err));
  return newPlayer;
}

/**
 * Legacy plaintext-password authentication — only used for seed/demo accounts
 * that have a `password` field and haven't migrated to Supabase Auth.
 * New registrations via Supabase Auth never store passwords here.
 */
export function authenticatePlayer(
  email: string,
  password: string,
): RegisteredPlayer | null {
  const p = _store.load().find(
    p => p.email.toLowerCase() === email.toLowerCase() && !!p.password && p.password === password,
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
  syncFriendshipToSupabase(playerId, friendId).catch(err => console.warn('[player-store] friendship sync failed:', err));
}

/** Directly confirm an accepted friendship in Supabase (no approval step) so
 * it's visible to the other player on any device. Fire-and-forget from the
 * caller's perspective; playerId must be the currently authenticated caller. */
async function syncFriendshipToSupabase(playerId: string, friendId: string): Promise<void> {
  if (typeof window === 'undefined') return;
  const players = _store.load();
  const fromName = players.find(p => p.id === playerId)?.name;
  const toName = players.find(p => p.id === friendId)?.name;
  const res = await fetch('/api/friends', {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ op: 'auto', fromId: playerId, fromName, toId: friendId, toName }),
  });
  if (!res.ok) throw new Error(`sync friendship failed: ${res.status}`);
}

/** Pull the caller's accepted friends from Supabase and merge into the local
 * cache so friendships made on another device show up here too. Returns
 * null on fetch failure (caller should keep showing the local cache). */
export async function fetchFriendsFromSupabase(playerId: string): Promise<RegisteredPlayer[] | null> {
  if (isServer()) return null;
  try {
    const res = await fetch('/api/friends', { credentials: 'include' });
    if (!res.ok) return null;
    const data = await res.json() as { friends: Array<{ playerId: string }> };
    const map = loadFriendshipMap();
    const ids = new Set([...(map[playerId] ?? []), ...data.friends.map(f => f.playerId)]);
    map[playerId] = [...ids];
    for (const f of data.friends) {
      const rev = new Set(map[f.playerId] ?? []);
      rev.add(playerId);
      map[f.playerId] = [...rev];
    }
    persistFriendshipMap(map);
    return getFriendsForPlayer(playerId);
  } catch { return null; }
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
  syncPlayerToSupabase(all[idx]).catch(err => console.warn('[player-store] updateRankingPoints sync failed:', err));
}

/**
 * Cache a player row locally WITHOUT pushing back to Supabase — used when the
 * row was just fetched FROM Supabase (e.g. the profile page's load-on-mount),
 * so the local cache has a match before the user edits anything. This is what
 * makes updatePlayer() below reliable: without it, a stale/empty local cache
 * silently swallowed every edit (found live: player-00119's level/sex updates
 * never reached Supabase because idx<0 short-circuited before the sync call).
 */
export function seedLocalPlayer(player: RegisteredPlayer): void {
  const all = _store.load();
  const idx = all.findIndex(p => p.id === player.id);
  if (idx >= 0) all[idx] = { ...all[idx], ...player }; else all.push(player);
  _store.persist(all);
}

/** Update any fields on a player and sync to Supabase. Works even when the
 * local cache doesn't have the row yet (e.g. cleared cache, different device) —
 * it always pushes to Supabase rather than silently no-op'ing; the server
 * route is the actual source of truth and merges custom_fields safely.
 *
 * Returns the optimistically-updated local player plus a `synced` promise
 * the caller can await to know whether the Supabase write actually landed —
 * without this, a failed sync (auth session expired, ownership check
 * rejected, DB error) was invisible: the UI always showed success. */
export function updatePlayer(
  playerId: string,
  updates: Partial<RegisteredPlayer>,
): { player: RegisteredPlayer | null; synced: Promise<boolean> } {
  const all = _store.load();
  const idx = all.findIndex(p => p.id === playerId);
  const existing = idx >= 0 ? all[idx] : null;
  if (!existing && !updates.email) {
    // No local row and no email supplied: the server route requires email to
    // identify/authorize the row, so this update cannot be pushed. Log loudly
    // instead of a silent drop, and give callers a chance to pass it.
    console.warn(`[player-store] updatePlayer(${playerId}): no local cache and no email in updates — skipping Supabase sync`);
    return { player: null, synced: Promise.resolve(false) };
  }
  const updated: RegisteredPlayer = existing
    ? { ...existing, ...updates }
    : { id: playerId, shortId: '', name: '', ranking: 0, rankingPoints: 0, ...updates } as RegisteredPlayer;
  if (idx >= 0) all[idx] = updated; else all.push(updated);
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
  const synced = syncPlayerToSupabase(updated)
    .then(() => true)
    .catch(err => { console.warn('[player-store] updatePlayer sync failed:', err); return false; });
  return { player: updated, synced };
}
