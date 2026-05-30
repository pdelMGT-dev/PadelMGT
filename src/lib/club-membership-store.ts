// club-membership-store.ts — Tracks which players belong to which clubs

const KEY = 'padelmgt_club_memberships';

export interface ClubMembership {
  playerId: string;
  clubId: string;
  clubName: string;
  clubCity: string;
  clubCountry: string;
  joinedAt: string;
}

function load(): ClubMembership[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as ClubMembership[]) : [];
  } catch { return []; }
}

function persist(data: ClubMembership[]): void {
  if (typeof window === 'undefined') return;
  try { localStorage.setItem(KEY, JSON.stringify(data)); } catch {}
}

export function joinClub(
  playerId: string,
  club: { id: string; name: string; city: string; country: string },
): void {
  const all = load();
  const exists = all.some(m => m.playerId === playerId && m.clubId === club.id);
  if (exists) return;
  persist([...all, {
    playerId,
    clubId: club.id,
    clubName: club.name,
    clubCity: club.city,
    clubCountry: club.country,
    joinedAt: new Date().toISOString().split('T')[0],
  }]);
}

export function leaveClub(playerId: string, clubId: string): void {
  persist(load().filter(m => !(m.playerId === playerId && m.clubId === clubId)));
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
