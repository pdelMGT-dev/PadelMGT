// player-league-store.ts — Player-created leagues with seasons, members, standings

import { createLocalStore } from './local-store';
import type { ActiveGame } from './game-engine';

export interface PlayerLeague {
  id: string;
  name: string;
  description?: string;
  createdBy: string;
  createdByName: string;
  createdAt: string;
  isOpen: boolean;
  isPublic: boolean;
  code: string;
  defaultPointsWin: number;
  defaultPointsDraw: number;
  defaultPointsLoss: number;
}

export interface LeagueSeason {
  id: string;
  leagueId: string;
  name: string;
  startDate: string;
  endDate: string;
  pointsWin: number;
  pointsDraw: number;
  pointsLoss: number;
  status: 'upcoming' | 'active' | 'completed';
}

export interface LeagueMember {
  id: string;
  leagueId: string;
  playerId: string;
  playerName: string;
  role: 'admin' | 'member';
  joinedAt: string;
}

export interface LeagueJoinRequest {
  id: string;
  leagueId: string;
  playerId: string;
  playerName: string;
  playerEmail?: string;
  message?: string;
  status: 'pending' | 'approved' | 'rejected';
  createdAt: string;
  reviewedAt?: string;
  reviewedBy?: string;
}

export interface LeagueStandingEntry {
  playerId: string;
  playerName: string;
  points: number;
  wins: number;
  draws: number;
  losses: number;
  played: number;
}

const leagueStore  = createLocalStore<PlayerLeague[]>('padelmgt_player_leagues', [], { seedOnFirstLoad: false });
const seasonStore  = createLocalStore<LeagueSeason[]>('padelmgt_player_league_seasons', [], { seedOnFirstLoad: false });
const memberStore  = createLocalStore<LeagueMember[]>('padelmgt_player_league_members', [], { seedOnFirstLoad: false });
const requestStore = createLocalStore<LeagueJoinRequest[]>('padelmgt_league_join_requests', [], { seedOnFirstLoad: false });

function genId(): string {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) return crypto.randomUUID();
  return `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

function generateLeagueCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let suffix = '';
  for (let i = 0; i < 6; i++) suffix += chars[Math.floor(Math.random() * chars.length)];
  return `LIGA-${new Date().getFullYear()}-${suffix}`;
}

// Leagues

export function getAllPlayerLeagues(): PlayerLeague[] {
  return leagueStore.load();
}

export function getPlayerLeague(id: string): PlayerLeague | null {
  return leagueStore.load().find(l => l.id === id) ?? null;
}

export function getPlayerLeagueByCode(code: string): PlayerLeague | null {
  return leagueStore.load().find(l => l.code === code) ?? null;
}

export function getMyLeagues(playerId: string): PlayerLeague[] {
  const memberLeagueIds = new Set(
    memberStore.load().filter(m => m.playerId === playerId).map(m => m.leagueId)
  );
  return leagueStore.load().filter(l => memberLeagueIds.has(l.id) || l.createdBy === playerId);
}

export function createPlayerLeague(params: {
  name: string;
  description?: string;
  createdBy: string;
  createdByName: string;
  isOpen?: boolean;
  isPublic?: boolean;
  defaultPointsWin?: number;
  defaultPointsDraw?: number;
  defaultPointsLoss?: number;
}): PlayerLeague {
  const existingCodes = new Set(leagueStore.load().map(l => l.code));
  let code = generateLeagueCode();
  while (existingCodes.has(code)) code = generateLeagueCode();

  const league: PlayerLeague = {
    id: genId(),
    code,
    name: params.name,
    description: params.description,
    createdBy: params.createdBy,
    createdByName: params.createdByName,
    createdAt: new Date().toISOString(),
    isOpen: params.isOpen ?? false,
    isPublic: params.isPublic ?? true,
    defaultPointsWin: params.defaultPointsWin ?? 3,
    defaultPointsDraw: params.defaultPointsDraw ?? 1,
    defaultPointsLoss: params.defaultPointsLoss ?? 0,
  };
  const all = leagueStore.load();
  all.push(league);
  leagueStore.persist(all);
  addLeagueMember({ leagueId: league.id, playerId: params.createdBy, playerName: params.createdByName, role: 'admin' });
  return league;
}

export function savePlayerLeague(league: PlayerLeague): void {
  const all = leagueStore.load();
  const idx = all.findIndex(l => l.id === league.id);
  if (idx >= 0) all[idx] = league; else all.push(league);
  leagueStore.persist(all);
}

export function deletePlayerLeague(id: string): void {
  leagueStore.persist(leagueStore.load().filter(l => l.id !== id));
  seasonStore.persist(seasonStore.load().filter(s => s.leagueId !== id));
  memberStore.persist(memberStore.load().filter(m => m.leagueId !== id));
  requestStore.persist(requestStore.load().filter(r => r.leagueId !== id));
}

// Seasons

export function getLeagueSeasons(leagueId: string): LeagueSeason[] {
  return seasonStore.load().filter(s => s.leagueId === leagueId);
}

export function getLeagueSeason(id: string): LeagueSeason | null {
  return seasonStore.load().find(s => s.id === id) ?? null;
}

export function getActiveSeason(leagueId: string): LeagueSeason | null {
  return seasonStore.load().find(s => s.leagueId === leagueId && s.status === 'active') ?? null;
}

export function createLeagueSeason(params: {
  leagueId: string;
  name: string;
  startDate: string;
  endDate: string;
  pointsWin?: number;
  pointsDraw?: number;
  pointsLoss?: number;
}): LeagueSeason {
  const league = getPlayerLeague(params.leagueId);
  const season: LeagueSeason = {
    id: genId(),
    leagueId: params.leagueId,
    name: params.name,
    startDate: params.startDate,
    endDate: params.endDate,
    pointsWin: params.pointsWin ?? league?.defaultPointsWin ?? 3,
    pointsDraw: params.pointsDraw ?? league?.defaultPointsDraw ?? 1,
    pointsLoss: params.pointsLoss ?? league?.defaultPointsLoss ?? 0,
    status: 'upcoming',
  };
  const all = seasonStore.load();
  all.push(season);
  seasonStore.persist(all);
  return season;
}

export function saveLeagueSeason(season: LeagueSeason): void {
  const all = seasonStore.load();
  const idx = all.findIndex(s => s.id === season.id);
  if (idx >= 0) all[idx] = season; else all.push(season);
  seasonStore.persist(all);
}

// Members

export function getLeagueMembers(leagueId: string): LeagueMember[] {
  return memberStore.load().filter(m => m.leagueId === leagueId);
}

export function isLeagueMember(leagueId: string, playerId: string): boolean {
  const league = getPlayerLeague(leagueId);
  if (league?.createdBy === playerId) return true;
  return memberStore.load().some(m => m.leagueId === leagueId && m.playerId === playerId);
}

export function isLeagueAdmin(leagueId: string, playerId: string): boolean {
  const league = getPlayerLeague(leagueId);
  if (league?.createdBy === playerId) return true;
  return memberStore.load().some(m => m.leagueId === leagueId && m.playerId === playerId && m.role === 'admin');
}

export function addLeagueMember(params: {
  leagueId: string;
  playerId: string;
  playerName: string;
  role?: 'admin' | 'member';
}): LeagueMember {
  const all = memberStore.load();
  const existing = all.find(m => m.leagueId === params.leagueId && m.playerId === params.playerId);
  if (existing) return existing;
  const member: LeagueMember = {
    id: genId(),
    leagueId: params.leagueId,
    playerId: params.playerId,
    playerName: params.playerName,
    role: params.role ?? 'member',
    joinedAt: new Date().toISOString(),
  };
  all.push(member);
  memberStore.persist(all);
  return member;
}

export function removeLeagueMember(leagueId: string, playerId: string): void {
  memberStore.persist(memberStore.load().filter(m => !(m.leagueId === leagueId && m.playerId === playerId)));
}

export function updateMemberRole(leagueId: string, playerId: string, role: 'admin' | 'member'): void {
  const all = memberStore.load();
  const idx = all.findIndex(m => m.leagueId === leagueId && m.playerId === playerId);
  if (idx >= 0) { all[idx] = { ...all[idx], role }; memberStore.persist(all); }
}

// Join Requests

export function getLeagueJoinRequests(leagueId: string): LeagueJoinRequest[] {
  return requestStore.load().filter(r => r.leagueId === leagueId);
}

export function getLeaguePendingRequests(leagueId: string): LeagueJoinRequest[] {
  return requestStore.load().filter(r => r.leagueId === leagueId && r.status === 'pending');
}

export function getLeagueJoinRequestForPlayer(leagueId: string, playerId: string): LeagueJoinRequest | null {
  return requestStore.load().find(r => r.leagueId === leagueId && r.playerId === playerId) ?? null;
}

export function createLeagueJoinRequest(params: {
  leagueId: string;
  playerId: string;
  playerName: string;
  playerEmail?: string;
  message?: string;
}): LeagueJoinRequest {
  const all = requestStore.load();
  const existing = all.find(r => r.leagueId === params.leagueId && r.playerId === params.playerId);
  if (existing) return existing;
  const req: LeagueJoinRequest = {
    id: genId(),
    leagueId: params.leagueId,
    playerId: params.playerId,
    playerName: params.playerName,
    playerEmail: params.playerEmail,
    message: params.message,
    status: 'pending',
    createdAt: new Date().toISOString(),
  };
  all.push(req);
  requestStore.persist(all);
  return req;
}

export function reviewJoinRequest(
  requestId: string,
  status: 'approved' | 'rejected',
  reviewedBy: string,
): void {
  const all = requestStore.load();
  const idx = all.findIndex(r => r.id === requestId);
  if (idx < 0) return;
  all[idx] = { ...all[idx], status, reviewedAt: new Date().toISOString(), reviewedBy };
  requestStore.persist(all);
  if (status === 'approved') {
    addLeagueMember({ leagueId: all[idx].leagueId, playerId: all[idx].playerId, playerName: all[idx].playerName });
  }
}

export function getAdminPendingRequestsCount(playerId: string): number {
  const adminLeagueIds = new Set<string>();
  memberStore.load().filter(m => m.playerId === playerId && m.role === 'admin').forEach(m => adminLeagueIds.add(m.leagueId));
  leagueStore.load().filter(l => l.createdBy === playerId).forEach(l => adminLeagueIds.add(l.id));
  return requestStore.load().filter(r => adminLeagueIds.has(r.leagueId) && r.status === 'pending').length;
}

// Standings

export function computeLeagueStandings(
  leagueId: string,
  seasonId: string | null,
  games: ActiveGame[],
): LeagueStandingEntry[] {
  const season = seasonId ? getLeagueSeason(seasonId) : getActiveSeason(leagueId);
  const league = getPlayerLeague(leagueId);
  const cfg = {
    pointsWin:  league?.defaultPointsWin  ?? 3,
    pointsDraw: league?.defaultPointsDraw ?? 1,
    pointsLoss: league?.defaultPointsLoss ?? 0,
    ...(season ?? {}),
  };

  const leagueGames = games.filter(g => {
    if (g.leagueId !== leagueId) return false;
    if (seasonId && g.seasonId !== seasonId) return false;
    return g.status === 'finished';
  });

  const byPlayer = new Map<string, LeagueStandingEntry>();

  for (const game of leagueGames) {
    for (const st of game.standings) {
      let entry = byPlayer.get(st.playerId);
      if (!entry) {
        entry = { playerId: st.playerId, playerName: st.playerName, points: 0, wins: 0, draws: 0, losses: 0, played: 0 };
        byPlayer.set(st.playerId, entry);
      }
      const draws  = st.draws ?? 0;
      const losses = st.losses ?? (st.played - st.wins - draws);
      entry.wins   += st.wins;
      entry.draws  += draws;
      entry.losses += losses;
      entry.played += st.played;
      entry.points += st.wins * cfg.pointsWin + draws * cfg.pointsDraw + losses * cfg.pointsLoss;
    }
  }

  return Array.from(byPlayer.values()).sort((a, b) => b.points - a.points || b.wins - a.wins);
}
