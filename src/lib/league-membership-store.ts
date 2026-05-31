// league-membership-store.ts — Tracks which players belong to which leagues

const KEY = 'padelmgt_league_memberships';

export interface LeagueMembership {
  playerId: string;
  playerName: string;
  playerEmail: string;
  leagueId: string;
  leagueName: string;
  joinedAt: string;
}

function load(): LeagueMembership[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as LeagueMembership[]) : [];
  } catch { return []; }
}

function persist(data: LeagueMembership[]): void {
  if (typeof window === 'undefined') return;
  try { localStorage.setItem(KEY, JSON.stringify(data)); } catch {}
}

export function joinLeague(
  player: { id: string; name: string; email: string },
  league: { id: string; name: string },
): void {
  const all = load();
  if (all.some(m => m.playerId === player.id && m.leagueId === league.id)) return;
  persist([...all, {
    playerId: player.id,
    playerName: player.name,
    playerEmail: player.email,
    leagueId: league.id,
    leagueName: league.name,
    joinedAt: new Date().toISOString().split('T')[0],
  }]);
}

export function leaveLeague(playerId: string, leagueId: string): void {
  persist(load().filter(m => !(m.playerId === playerId && m.leagueId === leagueId)));
}

export function getAllLeagueMemberships(): LeagueMembership[] {
  return load();
}

export function getLeagueMembers(leagueId: string): LeagueMembership[] {
  return load().filter(m => m.leagueId === leagueId);
}

export function getPlayerLeagues(playerId: string): LeagueMembership[] {
  return load().filter(m => m.playerId === playerId);
}
