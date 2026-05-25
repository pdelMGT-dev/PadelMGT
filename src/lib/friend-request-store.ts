// friend-request-store.ts — Two-way friend request management

import { addFriendship } from './player-store';

const KEY = 'padelmgt_friend_requests';

export type FriendRequestStatus = 'pending' | 'accepted' | 'rejected';

export interface FriendRequest {
  id: string;
  fromId: string;
  fromName: string;
  toId: string;
  toName: string;
  status: FriendRequestStatus;
  createdAt: string;
}

// ── Seed requests ─────────────────────────────────────────────────────────────
// player-009 and player-010 sent requests to player-001 on first load

const SEED_REQUESTS: FriendRequest[] = [
  { id: 'fr-seed-1', fromId: 'player-009', fromName: 'Pedro Morales',  toId: 'player-001', toName: 'Carlos Méndez', status: 'pending', createdAt: '2026-05-24T10:00:00.000Z' },
  { id: 'fr-seed-2', fromId: 'player-010', fromName: 'Isabel Bravo',   toId: 'player-001', toName: 'Carlos Méndez', status: 'pending', createdAt: '2026-05-24T11:30:00.000Z' },
  { id: 'fr-seed-3', fromId: 'player-001', fromName: 'Carlos Méndez',  toId: 'player-016', toName: 'Nicolás Gómez', status: 'pending', createdAt: '2026-05-23T09:00:00.000Z' },
];

function isServer(): boolean {
  return typeof window === 'undefined';
}

function load(): FriendRequest[] {
  if (isServer()) return SEED_REQUESTS;
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) {
      localStorage.setItem(KEY, JSON.stringify(SEED_REQUESTS));
      return SEED_REQUESTS;
    }
    return JSON.parse(raw) as FriendRequest[];
  } catch {
    return SEED_REQUESTS;
  }
}

function save(reqs: FriendRequest[]): void {
  if (isServer()) return;
  try { localStorage.setItem(KEY, JSON.stringify(reqs)); } catch {}
}

function generateId(): string {
  return `fr-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
}

// ── Public API ────────────────────────────────────────────────────────────────

/** Returns any existing request between two players (either direction). */
export function getRequestBetween(
  userId: string,
  otherId: string,
): FriendRequest | null {
  return load().find(
    r =>
      (r.fromId === userId && r.toId === otherId) ||
      (r.fromId === otherId && r.toId === userId),
  ) ?? null;
}

/** Send a friend request. Returns the request, or null if already exists. */
export function sendFriendRequest(
  fromId: string,
  fromName: string,
  toId: string,
  toName: string,
): FriendRequest | null {
  const existing = getRequestBetween(fromId, toId);
  if (existing) return null;

  const req: FriendRequest = {
    id: generateId(),
    fromId, fromName, toId, toName,
    status: 'pending',
    createdAt: new Date().toISOString(),
  };
  const all = load();
  save([...all, req]);
  return req;
}

/** Accept a pending request — creates the friendship on both sides. */
export function acceptFriendRequest(requestId: string): void {
  const all = load();
  const idx = all.findIndex(r => r.id === requestId);
  if (idx < 0) return;
  const req = all[idx];
  all[idx] = { ...req, status: 'accepted' };
  save(all);
  addFriendship(req.fromId, req.toId);
}

/** Reject a pending request. */
export function rejectFriendRequest(requestId: string): void {
  const all = load();
  const idx = all.findIndex(r => r.id === requestId);
  if (idx < 0) return;
  all[idx] = { ...all[idx], status: 'rejected' };
  save(all);
}

/** Cancel (delete) a request the current user sent. */
export function cancelFriendRequest(requestId: string): void {
  save(load().filter(r => r.id !== requestId));
}

/** Pending requests received by userId. */
export function getPendingRequestsFor(userId: string): FriendRequest[] {
  return load().filter(r => r.toId === userId && r.status === 'pending');
}

/** All requests sent by userId (pending or rejected). */
export function getSentRequests(userId: string): FriendRequest[] {
  return load().filter(r => r.fromId === userId);
}

/** Count of pending requests received by userId (for badge). */
export function getPendingCount(userId: string): number {
  return getPendingRequestsFor(userId).length;
}
