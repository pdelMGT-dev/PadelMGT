// friend-request-store.ts — Two-way friend requests, Supabase-backed.
// Friend data lives in the `friend_requests` table and is written exclusively
// through the service-role /api/friends endpoint, so both parties see the same
// state on any device.

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
