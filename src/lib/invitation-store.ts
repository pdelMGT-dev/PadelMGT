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
}

const _store = createLocalStore<Invitation[]>('padelmgt_invitations_v2', [], { seedOnFirstLoad: false });

function generateId(): string {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) return crypto.randomUUID();
  return `${Date.now()}-${Math.random().toString(36).slice(2)}`;
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
  return all[idx];
}

export function deleteInvitationsForGame(gameId: string): void {
  _store.persist(_store.load().filter((i) => i.gameId !== gameId));
}
