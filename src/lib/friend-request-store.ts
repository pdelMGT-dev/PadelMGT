// friend-request-store.ts — Two-way friend request management

import { addFriendship } from './player-store';
import { upsertFriendRequestToSupabase } from './superadmin-data';
import { SEED_FRIEND_REQUESTS } from './seeds/players';
import { createLocalStore } from './local-store';

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

const _store = createLocalStore<FriendRequest[]>(KEY, SEED_FRIEND_REQUESTS);

function generateId(): string {
  return `fr-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
}

// ── Public API ────────────────────────────────────────────────────────────────

/** Returns any non-rejected request between two players (either direction). */
export function getRequestBetween(
  userId: string,
  otherId: string,
): FriendRequest | null {
  return _store.load().find(
    r =>
      r.status !== 'rejected' &&
      ((r.fromId === userId && r.toId === otherId) ||
       (r.fromId === otherId && r.toId === userId)),
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
  _store.persist([..._store.load(), req]);
  upsertFriendRequestToSupabase(req).catch(() => {});
  return req;
}

/** Accept a pending request — creates the friendship on both sides. */
export function acceptFriendRequest(requestId: string): void {
  const all = _store.load();
  const idx = all.findIndex(r => r.id === requestId);
  if (idx < 0) return;
  const req = all[idx];
  const accepted = { ...req, status: 'accepted' as const };
  all[idx] = accepted;
  _store.persist(all);
  upsertFriendRequestToSupabase(accepted).catch(() => {});
  addFriendship(req.fromId, req.toId);
}

/** Reject a pending request. */
export function rejectFriendRequest(requestId: string): void {
  const all = _store.load();
  const idx = all.findIndex(r => r.id === requestId);
  if (idx < 0) return;
  const rejected = { ...all[idx], status: 'rejected' as const };
  all[idx] = rejected;
  _store.persist(all);
  upsertFriendRequestToSupabase(rejected).catch(() => {});
}

/** Cancel (delete) a request the current user sent. */
export function cancelFriendRequest(requestId: string): void {
  _store.persist(_store.load().filter(r => r.id !== requestId));
}

/** Pending requests received by userId. */
export function getPendingRequestsFor(userId: string): FriendRequest[] {
  return _store.load().filter(r => r.toId === userId && r.status === 'pending');
}

/** All requests sent by userId (pending or rejected). */
export function getSentRequests(userId: string): FriendRequest[] {
  return _store.load().filter(r => r.fromId === userId);
}

/** Count of pending requests received by userId (for badge). */
export function getPendingCount(userId: string): number {
  return getPendingRequestsFor(userId).length;
}
