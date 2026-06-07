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
}

export function getAvailableYears(ownerId: string): number[] {
  const snapshots = getFriendsSnapshots(ownerId);
  const years = new Set(snapshots.map(s => s.year));
  return Array.from(years).sort((a, b) => b - a);
}
