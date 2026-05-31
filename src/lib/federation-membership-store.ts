// federation-membership-store.ts — Tracks which players belong to which federations

const KEY = 'padelmgt_federation_memberships';

export interface FederationMembership {
  playerId: string;
  playerName: string;
  playerEmail: string;
  federationId: string;
  federationName: string;
  joinedAt: string;
}

function load(): FederationMembership[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as FederationMembership[]) : [];
  } catch { return []; }
}

function persist(data: FederationMembership[]): void {
  if (typeof window === 'undefined') return;
  try { localStorage.setItem(KEY, JSON.stringify(data)); } catch {}
}

export function joinFederation(
  player: { id: string; name: string; email: string },
  federation: { id: string; name: string },
): void {
  const all = load();
  if (all.some(m => m.playerId === player.id && m.federationId === federation.id)) return;
  persist([...all, {
    playerId: player.id,
    playerName: player.name,
    playerEmail: player.email,
    federationId: federation.id,
    federationName: federation.name,
    joinedAt: new Date().toISOString().split('T')[0],
  }]);
}

export function leaveFederation(playerId: string, federationId: string): void {
  persist(load().filter(m => !(m.playerId === playerId && m.federationId === federationId)));
}

export function getAllFederationMemberships(): FederationMembership[] {
  return load();
}

export function getFederationMembers(fedId: string): FederationMembership[] {
  return load().filter(m => m.federationId === fedId);
}

export function getPlayerFederations(playerId: string): FederationMembership[] {
  return load().filter(m => m.playerId === playerId);
}
