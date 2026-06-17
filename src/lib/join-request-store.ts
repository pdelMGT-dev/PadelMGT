'use client';

import { createLocalStore } from './local-store';
import {
  submitJoinRequestToSupabase,
  fetchJoinRequestsForEntity,
  fetchMyJoinRequestFromSupabase,
  updateJoinRequestInSupabase,
  deleteJoinRequestFromSupabase,
} from './supabase';

export type JoinRequest = {
  id: string;
  entityId: string;      // game.id or tournament.id
  entityType: 'game' | 'tournament';
  playerId: string;
  playerName: string;
  playerEmail?: string;
  status: 'pending' | 'approved' | 'rejected';
  createdAt: string;
  // Family-member inscription (Flow A: guardian registers a minor without an account)
  isFamilyMember?: boolean;
  guardianId?: string;
  guardianName?: string;
  familyMemberId?: string;
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

/** Save a list of requests locally, deduplicating by id (Supabase wins on conflicts). */
function mergeIntoLocal(incoming: JoinRequest[]): void {
  const existing = _store.load();
  const byId = new Map(existing.map(r => [r.id, r]));
  for (const r of incoming) byId.set(r.id, r);
  _store.persist(Array.from(byId.values()));
}

/**
 * Submit a join request — saves locally immediately and also pushes to Supabase
 * so the creator sees it on any device (fire-and-forget, no await needed in UI).
 */
export function submitJoinRequest(
  entityId: string,
  entityType: 'game' | 'tournament',
  playerId: string,
  playerName: string,
  playerEmail?: string,
  opts?: { isFamilyMember?: boolean; guardianId?: string; guardianName?: string; familyMemberId?: string },
): JoinRequest {
  const req: JoinRequest = {
    id: crypto.randomUUID(),
    entityId, entityType, playerId, playerName, playerEmail,
    status: 'pending',
    createdAt: new Date().toISOString(),
    ...opts,
  };
  _store.persist([..._store.load(), req]);
  // Fire-and-forget to Supabase — creator will see it via syncJoinRequests()
  submitJoinRequestToSupabase(req).catch(() => {});
  return req;
}

export function approveJoinRequest(requestId: string): void {
  _store.persist(_store.load().map(r => r.id === requestId ? { ...r, status: 'approved' as const } : r));
  updateJoinRequestInSupabase(requestId, 'approved').catch(() => {});
}

export function rejectJoinRequest(requestId: string): void {
  _store.persist(_store.load().map(r => r.id === requestId ? { ...r, status: 'rejected' as const } : r));
  updateJoinRequestInSupabase(requestId, 'rejected').catch(() => {});
}

export function cancelJoinRequest(requestId: string): void {
  _store.persist(_store.load().filter(r => r.id !== requestId));
  deleteJoinRequestFromSupabase(requestId).catch(() => {});
}

/**
 * Pull pending join requests for an entity from Supabase and merge into local store.
 * Call this from the creator's management page on a polling interval.
 * Returns the merged list of pending requests for the entity.
 */
export async function syncJoinRequestsFromSupabase(entityId: string): Promise<JoinRequest[]> {
  const remote = await fetchJoinRequestsForEntity(entityId);
  if (remote) mergeIntoLocal(remote);
  return _store.load().filter(r => r.entityId === entityId && r.status === 'pending');
}

/**
 * Fetch a single player's request status from Supabase and update local store.
 * Call from the public join page so the submitter sees approval/rejection cross-device.
 */
export async function syncMyJoinRequestFromSupabase(entityId: string, playerId: string): Promise<JoinRequest | null> {
  const remote = await fetchMyJoinRequestFromSupabase(entityId, playerId);
  if (!remote) return getMyJoinRequest(entityId, playerId);
  mergeIntoLocal([remote]);
  return remote;
}
