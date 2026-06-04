import { createLocalStore } from './local-store';

export interface ManagedLeague {
  id: string;
  ownerId: string;
  name: string;
  country: string;
  city: string;
  category: string;
  promotionZone: number;
  relegationZone: number;
}

const _store = createLocalStore<ManagedLeague[]>('padelmgt_managed_leagues', [], { seedOnFirstLoad: false });

function generateId(): string {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) return crypto.randomUUID();
  return `league-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

export function getAllLeagues(): ManagedLeague[] {
  return _store.load();
}

export function getLeagueByOwner(ownerId: string): ManagedLeague | null {
  return _store.load().find(l => l.ownerId === ownerId) ?? null;
}

export function saveLeague(league: ManagedLeague): void {
  const all = _store.load();
  const idx = all.findIndex(l => l.id === league.id);
  if (idx >= 0) all[idx] = league; else all.push(league);
  _store.persist(all);
}

export function createLeague(params: Omit<ManagedLeague, 'id'>): ManagedLeague {
  const league: ManagedLeague = { ...params, id: generateId() };
  saveLeague(league);
  return league;
}

export function deleteLeague(id: string): void {
  _store.persist(_store.load().filter(l => l.id !== id));
}
