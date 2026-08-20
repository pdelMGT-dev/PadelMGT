// friends-ranking-store.ts — Friends ranking snapshots (monthly/annual)
import { createLocalStore } from './local-store';

export interface FriendsSnapshot {
  id: string;
  ownerId: string;           // the player whose friend group this belongs to
  year: number;
  month: number | null;      // null = annual snapshot
  entries: FriendsSnapshotEntry[];
  createdAt: string;
}

export interface FriendsSnapshotEntry {
  playerId: string;
  playerName: string;
  points: number;
  wins: number;
  draws: number;
  losses: number;
  played: number;
}

const _store = createLocalStore<FriendsSnapshot[]>('padelmgt_friends_snapshots', []);

export function getFriendsSnapshots(ownerId: string): FriendsSnapshot[] {
  return _store.load().filter(s => s.ownerId === ownerId);
}

export function getFriendsSnapshot(ownerId: string, year: number, month: number | null): FriendsSnapshot | null {
  return _store.load().find(s => s.ownerId === ownerId && s.year === year && s.month === month) ?? null;
}

export function saveFriendsSnapshot(snapshot: FriendsSnapshot): void {
  const all = _store.load();
  const idx = all.findIndex(s => s.ownerId === snapshot.ownerId && s.year === snapshot.year && s.month === snapshot.month);
  if (idx >= 0) all[idx] = snapshot;
  else all.push(snapshot);
  _store.persist(all);
  pushSnapshotToSupabase(snapshot).catch(err => console.warn('[friends-ranking] Supabase sync failed:', err));
}

export function getAvailableYears(ownerId: string): number[] {
  const snapshots = getFriendsSnapshots(ownerId);
  const years = new Set(snapshots.map(s => s.year));
  return Array.from(years).sort((a, b) => b - a);
}

// ── Supabase sync ─────────────────────────────────────────────────────────────

async function pushSnapshotToSupabase(snapshot: FriendsSnapshot): Promise<void> {
  const res = await fetch('/api/friends-ranking-snapshots', {
    method: 'POST', credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(snapshot),
  });
  if (!res.ok) throw new Error(`push snapshot failed: ${res.status}`);
}

/** Pull this owner's real snapshots from Supabase and merge into the local
 * cache. Returns null on fetch failure (caller should keep showing the
 * local cache in that case). */
export async function fetchFriendsSnapshotsFromSupabase(ownerId: string): Promise<FriendsSnapshot[] | null> {
  try {
    const res = await fetch('/api/friends-ranking-snapshots', { credentials: 'include' });
    if (!res.ok) return null;
    const data = await res.json() as { snapshots: FriendsSnapshot[] };
    const remote = data.snapshots.filter(s => s.ownerId === ownerId);
    const others = _store.load().filter(s => s.ownerId !== ownerId);
    _store.persist([...others, ...remote]);
    return remote;
  } catch { return null; }
}
