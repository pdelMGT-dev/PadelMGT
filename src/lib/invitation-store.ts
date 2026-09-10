// invitation-store.ts — Direct player invitations for Quick Games

import { createLocalStore } from './local-store';
import { sendInviteEmail } from './email';

export interface Invitation {
  id: string;
  gameId: string;
  gameName: string;
  gameDate: string;
  gameTime: string;
  gameClub: string;
  gameCity: string;
  fromPlayerId: string;
  fromPlayerName: string;
  toPlayerId: string;
  toPlayerName: string;
  toPlayerEmail?: string;
  status: 'pending' | 'accepted' | 'rejected';
  createdAt: string;
  respondedAt?: string;
  // Public schedule-card image URL (rounds × courts), for fixed-pairs Juegos
  // Rápidos whose pairing/schedule is already known — embedded in the invite
  // email so the invitee sees who/where/when without opening the app.
  scheduleCardUrl?: string;
}

const _store = createLocalStore<Invitation[]>('padelmgt_invitations_v2', [], { seedOnFirstLoad: false });

function generateId(): string {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) return crypto.randomUUID();
  return `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

// ── Supabase sync (best-effort, fire-and-forget) ──────────────────────────────
// Writes push to the service-role /api/invitations endpoint; the local cache is
// kept authoritative by syncMyInvitations() (pull + reconcile) on page load, so
// an invitation sent on one device reaches the invitee on any device.

async function pushInvitation(inv: Invitation): Promise<void> {
  if (typeof window === 'undefined') return;
  try {
    await fetch('/api/invitations', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ op: 'create', invitation: inv }),
    });
  } catch { /* fire-and-forget */ }
}

async function pushResponse(invitationId: string, status: 'accepted' | 'rejected'): Promise<void> {
  if (typeof window === 'undefined') return;
  try {
    await fetch('/api/invitations', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ op: 'respond', invitationId, status }),
    });
  } catch { /* fire-and-forget */ }
}

/**
 * Pull the caller's invitations (incoming + sent) from Supabase and reconcile
 * the local cache: rows involving this player are REPLACED by the server set,
 * so responses/removals made on another device propagate. Call on page load.
 */
export async function syncMyInvitations(playerId: string, email?: string): Promise<void> {
  if (typeof window === 'undefined') return;
  try {
    const res = await fetch('/api/invitations');
    if (!res.ok) return;
    const json = await res.json();
    const server = (json.invitations ?? []) as Invitation[];
    const mineEmail = (email ?? '').toLowerCase();
    const involvesMe = (i: Invitation) =>
      i.toPlayerId === playerId || i.fromPlayerId === playerId ||
      (!!mineEmail && (i.toPlayerEmail ?? '').toLowerCase() === mineEmail);
    const others = _store.load().filter(i => !involvesMe(i));
    _store.persist([...others, ...server]);
  } catch { /* keep local cache on failure */ }
}

export function getAllInvitations(): Invitation[] {
  return _store.load();
}

export function getInvitationsForPlayer(playerId: string): Invitation[] {
  return _store.load().filter((i) => i.toPlayerId === playerId);
}

export function getPendingInvitationsForPlayer(playerId: string): Invitation[] {
  return _store.load().filter((i) => i.toPlayerId === playerId && i.status === 'pending');
}

export function getInvitationsSentByPlayer(playerId: string): Invitation[] {
  return _store.load().filter((i) => i.fromPlayerId === playerId);
}

export function getInvitationsForGame(gameId: string): Invitation[] {
  return _store.load().filter((i) => i.gameId === gameId);
}

export function createInvitation(params: Omit<Invitation, 'id' | 'status' | 'createdAt'>): Invitation {
  const inv: Invitation = {
    ...params,
    id: generateId(),
    status: 'pending',
    createdAt: new Date().toISOString(),
  };
  const all = _store.load();
  all.push(inv);
  _store.persist(all);
  pushInvitation(inv).catch(() => {});

  // Fire-and-forget invite email if the invitee has an email address
  if (inv.toPlayerEmail) {
    const appUrl = typeof window !== 'undefined' ? window.location.origin : 'https://padelmgt.com';
    sendInviteEmail({
      to:       inv.toPlayerEmail,
      toName:   inv.toPlayerName,
      fromName: inv.fromPlayerName,
      gameName: inv.gameName,
      gameDate: `${inv.gameDate} ${inv.gameTime ?? ''}`.trim(),
      gameCity: inv.gameCity,
      joinUrl:  `${appUrl}/dashboard/player`,
      scheduleCardUrl: inv.scheduleCardUrl,
    }).catch(() => {});
  }

  return inv;
}

export function respondToInvitation(
  invitationId: string,
  response: 'accepted' | 'rejected',
): Invitation | null {
  const all = _store.load();
  const idx = all.findIndex((i) => i.id === invitationId);
  if (idx < 0) return null;
  all[idx] = {
    ...all[idx],
    status: response,
    respondedAt: new Date().toISOString(),
  };
  _store.persist(all);
  pushResponse(invitationId, response).catch(() => {});
  return all[idx];
}

export function deleteInvitationsForGame(gameId: string): void {
  _store.persist(_store.load().filter((i) => i.gameId !== gameId));
  if (typeof window !== 'undefined') {
    fetch('/api/invitations', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ op: 'delete-game', gameId }),
    }).catch(() => {});
  }
}
