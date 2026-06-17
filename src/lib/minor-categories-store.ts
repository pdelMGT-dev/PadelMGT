// minor-categories-store.ts — SA-configurable base age categories for child tournaments.
//
// Mirrors the ranking-config-store pattern: a single localStorage-backed global
// list, seeded with the standard padel age brackets. Age categories are defined
// by MAX AGE only ("menores de X años"); validation uses the official Jan-1 rule.

import { createLocalStore } from './local-store';

export interface MinorCategory {
  id: string;       // stable slug, e.g. 'benjamin'
  name: string;     // 'Benjamín'
  maxAge: number;   // 10  → "menores de 10 años"
}

export const DEFAULT_MINOR_CATEGORIES: MinorCategory[] = [
  { id: 'benjamin', name: 'Benjamín', maxAge: 10 },
  { id: 'alevin',   name: 'Alevín',   maxAge: 12 },
  { id: 'infantil', name: 'Infantil', maxAge: 14 },
  { id: 'cadete',   name: 'Cadete',   maxAge: 16 },
  { id: 'junior',   name: 'Junior',   maxAge: 18 },
];

const _store = createLocalStore<MinorCategory[]>('padelmgt_minor_categories', DEFAULT_MINOR_CATEGORIES);

export function getMinorCategories(): MinorCategory[] {
  const all = _store.load();
  return all.length > 0 ? all : DEFAULT_MINOR_CATEGORIES;
}

export function saveMinorCategories(cats: MinorCategory[]): void {
  _store.persist(cats);
}

// ── Age helpers (Jan-1 official rule) ─────────────────────────────────────────

/** Age the player turns during the tournament year, measured at Jan 1 of that year (official rule). */
export function ageOnJan1(birthDate: string, tournamentDate: string): number {
  const birthYear = new Date(birthDate).getFullYear();
  const tournamentYear = new Date(tournamentDate).getFullYear();
  return tournamentYear - birthYear;
}

/**
 * True if the player (by birthDate) is eligible for a category with the given maxAge,
 * at the tournament's Jan-1 rule. undefined maxAge → always eligible.
 */
export function isEligibleForMaxAge(birthDate: string, tournamentDate: string, maxAge?: number): boolean {
  if (maxAge === undefined) return true;
  return ageOnJan1(birthDate, tournamentDate) <= maxAge;
}
