import { createLocalStore } from './local-store';

export interface TeamPlayer {
  name: string;
  ranking?: string;
}

export interface LeagueTeam {
  id: string;
  leagueId: string;
  name: string;
  club: string;
  city: string;
  players: TeamPlayer[];
  createdAt: string;
}

const _store = createLocalStore<LeagueTeam[]>('padelmgt_league_teams', [], { seedOnFirstLoad: false });

function generateId(): string {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) return crypto.randomUUID();
  return `team-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

export function getTeamsByLeague(leagueId: string): LeagueTeam[] {
  return _store.load().filter(t => t.leagueId === leagueId);
}

export function getTeam(id: string): LeagueTeam | null {
  return _store.load().find(t => t.id === id) ?? null;
}

export function saveTeam(team: LeagueTeam): void {
  const all = _store.load();
  const idx = all.findIndex(t => t.id === team.id);
  if (idx >= 0) all[idx] = team; else all.push(team);
  _store.persist(all);
}

export function createTeam(params: Omit<LeagueTeam, 'id' | 'createdAt'>): LeagueTeam {
  const team: LeagueTeam = { ...params, id: generateId(), createdAt: new Date().toISOString() };
  saveTeam(team);
  return team;
}

export function deleteTeam(id: string): void {
  _store.persist(_store.load().filter(t => t.id !== id));
}
