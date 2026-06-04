import { createLocalStore } from './local-store';

export interface LeagueSeason {
  id: string;
  leagueId: string;
  year: string;
  status: 'active' | 'upcoming' | 'completed';
  rounds: number;
  startDate: string;
  endDate: string;
  champion: string | null;
}

const _store = createLocalStore<LeagueSeason[]>('padelmgt_league_seasons', [], { seedOnFirstLoad: false });

function generateId(): string {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) return crypto.randomUUID();
  return `season-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

export function getSeasonsByLeague(leagueId: string): LeagueSeason[] {
  return _store.load()
    .filter(s => s.leagueId === leagueId)
    .sort((a, b) => b.year.localeCompare(a.year));
}

export function getActiveSeason(leagueId: string): LeagueSeason | null {
  return _store.load().find(s => s.leagueId === leagueId && s.status === 'active') ?? null;
}

export function saveSeason(season: LeagueSeason): void {
  const all = _store.load();
  const idx = all.findIndex(s => s.id === season.id);
  if (idx >= 0) all[idx] = season; else all.push(season);
  _store.persist(all);
}

export function createSeason(params: Omit<LeagueSeason, 'id'>): LeagueSeason {
  const season: LeagueSeason = { ...params, id: generateId() };
  saveSeason(season);
  return season;
}

export function activateSeason(id: string, leagueId: string): void {
  const all = _store.load().map(s =>
    s.leagueId === leagueId
      ? { ...s, status: (s.id === id ? 'active' : s.status === 'active' ? 'completed' : s.status) as LeagueSeason['status'] }
      : s,
  );
  _store.persist(all);
}
