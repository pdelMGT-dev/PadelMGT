// league-membership-store.ts — Tracks which players belong to which leagues

import { createLocalStore } from './local-store';

export interface LeagueMembership {
  playerId: string;
  playerName: string;
  playerEmail: string;
  leagueId: string;
  leagueName: string;
  joinedAt: string;
}

const _store = createLocalStore<LeagueMembership[]>('padelmgt_league_memberships', [], { seedOnFirstLoad: false });

export function joinLeague(
  player: { id: string; name: string; email: string },
  league: { id: string; name: string },
): void {
  const all = _store.load();
  if (all.some(m => m.playerId === player.id && m.leagueId === league.id)) return;
  _store.persist([...all, {
    playerId: player.id,
    playerName: player.name,
    playerEmail: player.email,
    leagueId: league.id,
    leagueName: league.name,
    joinedAt: new Date().toISOString().split('T')[0],
  }]);
}

export function leaveLeague(playerId: string, leagueId: string): void {
  _store.persist(_store.load().filter(m => !(m.playerId === playerId && m.leagueId === leagueId)));
}

export function getAllLeagueMemberships(): LeagueMembership[] {
  return _store.load();
}

export function getLeagueMembers(leagueId: string): LeagueMembership[] {
  return _store.load().filter(m => m.leagueId === leagueId);
}

export function getPlayerLeagues(playerId: string): LeagueMembership[] {
  return _store.load().filter(m => m.playerId === playerId);
}
