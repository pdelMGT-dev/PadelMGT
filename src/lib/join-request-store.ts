'use client';

import { createLocalStore } from './local-store';

export type JoinRequest = {
  id: string;
  entityId: string;      // game.id or tournament.id
  entityType: 'game' | 'tournament';
  playerId: string;
  playerName: string;
  playerEmail?: string;
  status: 'pending' | 'approved' | 'rejected';
  createdAt: string;
};

const _store = createLocalStore<JoinRequest[]>('padelmgt_join_requests', [], { seedOnFirstLoad: false });

export function loadJoinRequests(): JoinRequest[] {
  return _store.load();
}

export function getJoinRequestsForEntity(entityId: string): JoinRequest[] {
  return _store.load().filter(r => r.entityId === entityId);
}

export function getMyJoinRequest(entityId: string, playerId: string): JoinRequest | null {
  return _store.load().find(r => r.entityId === entityId && r.playerId === playerId) ?? null;
}

export function submitJoinRequest(
  entityId: string,
  entityType: 'game' | 'tournament',
  playerId: string,
  playerName: string,
  playerEmail?: string,
): JoinRequest {
  const req: JoinRequest = {
    id: crypto.randomUUID(),
    entityId, entityType, playerId, playerName, playerEmail,
    status: 'pending',
    createdAt: new Date().toISOString(),
  };
  _store.persist([..._store.load(), req]);
  return req;
}

export function approveJoinRequest(requestId: string): void {
  _store.persist(_store.load().map(r => r.id === requestId ? { ...r, status: 'approved' as const } : r));
}

export function rejectJoinRequest(requestId: string): void {
  _store.persist(_store.load().map(r => r.id === requestId ? { ...r, status: 'rejected' as const } : r));
}

export function cancelJoinRequest(requestId: string): void {
  _store.persist(_store.load().filter(r => r.id !== requestId));
}
