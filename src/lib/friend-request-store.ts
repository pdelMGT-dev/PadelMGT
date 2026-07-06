// friend-request-store.ts — Two-way friend requests, Supabase-backed.
// Friend data lives in the `friend_requests` table and is written exclusively
// through the service-role /api/friends endpoint, so both parties see the same
// state on any device. The legacy localStorage functions below are kept only
// for callers not yet migrated; the friends page uses the async helpers.

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

export interface FriendSummary {
  requestId: string;
  playerId: string;
  playerName: string;
  since: string;
}

export interface FriendData {
  incoming: FriendRequest[];
  sent: FriendRequest[];
  friends: FriendSummary[];
}

// ── Supabase-backed API (used by the friends page) ────────────────────────────

/** Fetch the caller's incoming/sent requests and accepted friends. */
export async function fetchFriendData(): Promise<FriendData | null> {
  if (typeof window === 'undefined') return null;
  try {
    const res = await fetch('/api/friends');
    if (!res.ok) return null;
    return (await res.json()) as FriendData;
  } catch {
    return null;
  }
}

async function postFriends(body: Record<string, unknown>): Promise<boolean> {
  if (typeof window === 'undefined') return false;
  try {
    const res = await fetch('/api/friends', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    return res.ok;
  } catch {
    return false;
  }
}

export function sendFriendRequestSB(fromId: string, fromName: string, toId: string, toName: string): Promise<boolean> {
  return postFriends({ op: 'send', fromId, fromName, toId, toName });
}
export function acceptFriendRequestSB(requestId: string): Promise<boolean> {
  return postFriends({ op: 'accept', requestId });
}
export function rejectFriendRequestSB(requestId: string): Promise<boolean> {
  return postFriends({ op: 'reject', requestId });
}
export function cancelFriendRequestSB(requestId: string): Promise<boolean> {
  return postFriends({ op: 'cancel', requestId });
}
export function removeFriendSB(requestId: string): Promise<boolean> {
  return postFriends({ op: 'remove', requestId });
}

// ── Legacy localStorage API (kept for un-migrated callers) ─────────────────────

import { createLocalStore } from './local-store';

const KEY = 'padelmgt_friend_requests';
const _store = createLocalStore<FriendRequest[]>(KEY, [], { seedOnFirstLoad: false });

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
  return req;
}

/** Accept a pending request (local fallback only). */
export function acceptFriendRequest(requestId: string): void {
  const all = _store.load();
  const idx = all.findIndex(r => r.id === requestId);
  if (idx < 0) return;
  all[idx] = { ...all[idx], status: 'accepted' as const };
  _store.persist(all);
}

/** Reject a pending request (local fallback only). */
export function rejectFriendRequest(requestId: string): void {
  const all = _store.load();
  const idx = all.findIndex(r => r.id === requestId);
  if (idx < 0) return;
  all[idx] = { ...all[idx], status: 'rejected' as const };
  _store.persist(all);
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
