// club-membership-store.ts — Tracks which players belong to which clubs

import { createLocalStore } from './local-store';

export interface ClubMembership {
  playerId: string;
  clubId: string;
  clubName: string;
  clubCity: string;
  clubCountry: string;
  joinedAt: string;
}

const _store = createLocalStore<ClubMembership[]>('padelmgt_club_memberships', [], { seedOnFirstLoad: false });
const load    = () => _store.load();
const persist = (data: ClubMembership[]) => _store.persist(data);

// ── Supabase sync (best-effort) ───────────────────────────────────────────────
// Writes push to the service-role /api/club-memberships endpoint; the local
// cache is kept authoritative by syncMyClubs() (pull + reconcile) on load.

function pushMembership(op: 'join' | 'leave', m: Partial<ClubMembership> & { playerId: string; clubId: string }): void {
  if (typeof window === 'undefined') return;
  fetch('/api/club-memberships', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ op, ...m }),
  }).catch(() => {});
}

/** Pull the player's club memberships from Supabase and replace the local set. */
export async function syncMyClubs(playerId: string): Promise<void> {
  if (typeof window === 'undefined') return;
  try {
    const res = await fetch('/api/club-memberships');
    if (!res.ok) return;
    const json = await res.json();
    const server = (json.memberships ?? []) as ClubMembership[];
    const others = load().filter(m => m.playerId !== playerId);
    persist([...others, ...server]);
  } catch { /* keep local cache */ }
}

export function joinClub(
  playerId: string,
  club: { id: string; name: string; city: string; country: string },
): void {
  const all = load();
  const exists = all.some(m => m.playerId === playerId && m.clubId === club.id);
  if (exists) return;
  const joinedAt = new Date().toISOString().split('T')[0];
  persist([...all, {
    playerId,
    clubId: club.id,
    clubName: club.name,
    clubCity: club.city,
    clubCountry: club.country,
    joinedAt,
  }]);
  pushMembership('join', { playerId, clubId: club.id, clubName: club.name, clubCity: club.city, clubCountry: club.country, joinedAt });
}

export function leaveClub(playerId: string, clubId: string): void {
  persist(load().filter(m => !(m.playerId === playerId && m.clubId === clubId)));
  pushMembership('leave', { playerId, clubId });
}

export function isClubMember(playerId: string, clubId: string): boolean {
  return load().some(m => m.playerId === playerId && m.clubId === clubId);
}

export function getPlayerClubs(playerId: string): ClubMembership[] {
  return load().filter(m => m.playerId === playerId);
}

export function getClubMembers(clubId: string): ClubMembership[] {
  return load().filter(m => m.clubId === clubId);
}

export function getClubMembersByName(clubName: string): ClubMembership[] {
  return load().filter(m => m.clubName === clubName);
}
