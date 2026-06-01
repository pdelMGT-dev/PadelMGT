// federation-membership-store.ts — Tracks which players belong to which federations

import { createLocalStore } from './local-store';

export interface FederationMembership {
  playerId: string;
  playerName: string;
  playerEmail: string;
  federationId: string;
  federationName: string;
  joinedAt: string;
}

const _store = createLocalStore<FederationMembership[]>('padelmgt_federation_memberships', [], { seedOnFirstLoad: false });

export function joinFederation(
  player: { id: string; name: string; email: string },
  federation: { id: string; name: string },
): void {
  const all = _store.load();
  if (all.some(m => m.playerId === player.id && m.federationId === federation.id)) return;
  _store.persist([...all, {
    playerId: player.id,
    playerName: player.name,
    playerEmail: player.email,
    federationId: federation.id,
    federationName: federation.name,
    joinedAt: new Date().toISOString().split('T')[0],
  }]);
}

export function leaveFederation(playerId: string, federationId: string): void {
  _store.persist(_store.load().filter(m => !(m.playerId === playerId && m.federationId === federationId)));
}

export function getAllFederationMemberships(): FederationMembership[] {
  return _store.load();
}

export function getFederationMembers(fedId: string): FederationMembership[] {
  return _store.load().filter(m => m.federationId === fedId);
}

export function getPlayerFederations(playerId: string): FederationMembership[] {
  return _store.load().filter(m => m.playerId === playerId);
}
