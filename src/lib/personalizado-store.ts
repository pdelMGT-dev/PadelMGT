// Personalizado tournament store — multi-category tournaments with registration flow

import { createLocalStore } from './local-store';

export interface PersonalizadoCategory {
  id: string;
  name: string;
  gender: 'masculino' | 'femenino' | 'mixto' | 'libre';
  format: 'americano' | 'mexicano' | 'round_robin' | 'knockout';
  modalidad: 'individual' | 'parejas';
  maxTeams: number;
  registrationFee: number; // in USD, 0 = free
}

export interface PersonalizadoTeam {
  id: string;
  categoryId: string;
  player1Name: string;
  player1Email?: string;
  player1Id?: string;
  player2Name?: string;
  player2Email?: string;
  player2Id?: string;
  registeredAt: string;
  status: 'pending' | 'confirmed' | 'rejected';
  paymentStatus: 'unpaid' | 'paid' | 'free';
}

export interface PersonalizadoTournament {
  id: string;
  code: string;
  name: string;
  date: string;
  time: string;
  locationName: string;
  city: string;
  country: string;
  courts: number;
  categories: PersonalizadoCategory[];
  teams: PersonalizadoTeam[];
  status: 'draft' | 'registration_open' | 'live' | 'finished';
  creatorId: string;
  creatorName: string;
  createdAt: string;
  openedAt?: string;
}

function generateId(): string {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) return crypto.randomUUID();
  return `p-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

function generateCode(): string {
  const alpha = 'ABCDEFGHJKLMNPQRSTUVWXYZ';
  const num = '23456789';
  let code = 'P-';
  for (let i = 0; i < 4; i++) code += alpha[Math.floor(Math.random() * alpha.length)];
  for (let i = 0; i < 4; i++) code += num[Math.floor(Math.random() * num.length)];
  return code;
}

const _store = createLocalStore<PersonalizadoTournament[]>('padelmgt_personalizado', [], { seedOnFirstLoad: false });

export function getAllPersonalizado(): PersonalizadoTournament[] {
  return _store.load();
}

export function getPersonalizado(id: string): PersonalizadoTournament | null {
  return _store.load().find(t => t.id === id) ?? null;
}

export function getPersonalizadoByCode(code: string): PersonalizadoTournament | null {
  return _store.load().find(t => t.code === code) ?? null;
}

export function savePersonalizado(tournament: PersonalizadoTournament): void {
  const all = _store.load();
  const idx = all.findIndex(t => t.id === tournament.id);
  if (idx >= 0) { all[idx] = tournament; } else { all.push(tournament); }
  _store.persist(all);
}

export function createPersonalizado(params: {
  name: string;
  date: string;
  time: string;
  locationName: string;
  city: string;
  country: string;
  courts: number;
  categories: PersonalizadoCategory[];
  creatorId: string;
  creatorName: string;
}): PersonalizadoTournament {
  const tournament: PersonalizadoTournament = {
    id: generateId(),
    code: generateCode(),
    name: params.name,
    date: params.date,
    time: params.time,
    locationName: params.locationName,
    city: params.city,
    country: params.country,
    courts: params.courts,
    categories: params.categories,
    teams: [],
    status: 'draft',
    creatorId: params.creatorId,
    creatorName: params.creatorName,
    createdAt: new Date().toISOString(),
  };
  savePersonalizado(tournament);
  return tournament;
}

export function calcOpeningPrice(tournament: PersonalizadoTournament): number {
  const totalSlots = tournament.categories.reduce((s, c) => s + c.maxTeams, 0);
  if (totalSlots <= 16) return 9;
  if (totalSlots <= 32) return 19;
  if (totalSlots <= 64) return 29;
  return 49;
}
