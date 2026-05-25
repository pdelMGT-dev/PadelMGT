'use client';

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

const KEY = 'padelmgt_join_requests';

export function loadJoinRequests(): JoinRequest[] {
  if (typeof window === 'undefined') return [];
  try { return JSON.parse(localStorage.getItem(KEY) || '[]'); } catch { return []; }
}

function save(reqs: JoinRequest[]) {
  try { localStorage.setItem(KEY, JSON.stringify(reqs)); } catch {}
}

export function getJoinRequestsForEntity(entityId: string): JoinRequest[] {
  return loadJoinRequests().filter(r => r.entityId === entityId);
}

export function getMyJoinRequest(entityId: string, playerId: string): JoinRequest | null {
  return loadJoinRequests().find(r => r.entityId === entityId && r.playerId === playerId) ?? null;
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
  save([...loadJoinRequests(), req]);
  return req;
}

export function approveJoinRequest(requestId: string): void {
  save(loadJoinRequests().map(r => r.id === requestId ? { ...r, status: 'approved' as const } : r));
}

export function rejectJoinRequest(requestId: string): void {
  save(loadJoinRequests().map(r => r.id === requestId ? { ...r, status: 'rejected' as const } : r));
}

export function cancelJoinRequest(requestId: string): void {
  save(loadJoinRequests().filter(r => r.id !== requestId));
}
