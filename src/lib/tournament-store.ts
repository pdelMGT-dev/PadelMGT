// tournament-store.ts — Separate storage for Tournaments (padelmgt_tournaments)
// Re-uses the ActiveGame shape from game-engine so all engine functions work.

import type { ActiveGame, GameFormat, PairType, ScoreConfig, GamePlayer, InvitedPlayer } from './game-engine';
import { upsertTournamentToSupabase } from './superadmin-data';

export type Tournament = ActiveGame;

const STORAGE_KEY = 'padelmgt_tournaments';

function isServer(): boolean {
  return typeof window === 'undefined';
}

function load(): Tournament[] {
  if (isServer()) return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as Tournament[]) : [];
  } catch {
    return [];
  }
}

function persist(items: Tournament[]): void {
  if (isServer()) return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
  } catch {}
}

function generateId(): string {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) return crypto.randomUUID();
  return `t-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

function generateCode(): string {
  const alpha = 'ABCDEFGHJKLMNPQRSTUVWXYZ';
  const num   = '23456789';
  let code = 'T-';
  for (let i = 0; i < 4; i++) code += alpha[Math.floor(Math.random() * alpha.length)];
  for (let i = 0; i < 4; i++) code += num[Math.floor(Math.random() * num.length)];
  return code;
}

export function getAllTournaments(): Tournament[] {
  return load();
}

export function getTournament(id: string): Tournament | null {
  return load().find(t => t.id === id) ?? null;
}

export function getTournamentByCode(code: string): Tournament | null {
  return load().find(t => t.code === code) ?? null;
}

export function saveTournament(tournament: Tournament): void {
  const all = load();
  const idx = all.findIndex(t => t.id === tournament.id);
  if (idx >= 0) { all[idx] = tournament; } else { all.push(tournament); }
  persist(all);
  upsertTournamentToSupabase(tournament as unknown as Record<string, unknown>).catch(() => {});
}

export function createTournament(params: {
  name: string;
  date: string;
  time: string;
  club: string;
  city: string;
  country: string;
  format: GameFormat;
  pairType: PairType;
  mixto: boolean;
  scoreConfig: ScoreConfig;
  maxPlayers: number;
  courts: number;
  players: GamePlayer[];
  invitedPlayers: InvitedPlayer[];
  creatorId: string;
  levelLabel?: string;
  pjTarget?: number;
}): Tournament {
  const t: Tournament = {
    id: generateId(),
    code: generateCode(),
    name: params.name,
    format: params.format,
    status: 'created',
    date: params.date,
    time: params.time,
    club: params.club,
    city: params.city,
    country: params.country,
    pairType: params.pairType,
    mixto: params.mixto,
    scoreConfig: params.scoreConfig,
    maxPlayers: params.maxPlayers,
    courts: params.courts,
    players: params.players,
    invitedPlayers: params.invitedPlayers,
    rounds: [],
    currentRound: 0,
    standings: [],
    creatorId: params.creatorId,
    coCreatorIds: [],
    levelLabel: params.levelLabel,
    pjTarget: params.pjTarget,
  };
  saveTournament(t);
  return t;
}
