// tournament-store.ts — Separate storage for Tournaments (padelmgt_tournaments)
// Re-uses the ActiveGame shape from game-engine so all engine functions work.

import type { ActiveGame, GameFormat, PairType, ScoreConfig, GamePlayer, InvitedPlayer, KnockoutConfig } from './game-engine';
export type { GamePlayer, InvitedPlayer } from './game-engine';
import { upsertTournamentToSupabase } from './superadmin-data';
import { createLocalStore } from './local-store';
import { sanitizeGameRecords } from './store-sanitize';

export type Tournament = ActiveGame;

const _store  = createLocalStore<Tournament[]>('padelmgt_tournaments', [], { seedOnFirstLoad: false });
// Sanitize on load: Supabase-synced rows can contain null entries in
// players/standings/rounds which crash pages that iterate them in render.
const load    = () => sanitizeGameRecords<Tournament>(_store.load());
const persist = (items: Tournament[]) => _store.persist(items);

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
  upsertTournamentToSupabase(tournament as unknown as Record<string, unknown>).catch(err => console.warn('[Supabase] saveTournament failed:', err));
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
  knockoutConfig?: KnockoutConfig;
  groupScoreConfig?: ScoreConfig;
  acceptsFamilyMembers?: boolean;
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
    knockoutConfig: params.knockoutConfig,
    groupScoreConfig: params.groupScoreConfig,
    acceptsFamilyMembers: params.acceptsFamilyMembers,
    createdAt: new Date().toISOString(),
  };
  saveTournament(t);
  return t;
}

// ---------------------------------------------------------------------------
// Clone — re-create a finished/past tournament with the same configuration.
// Only name/date/time are supplied fresh; everything else (format, scoring,
// knockout config, courts, level, location…) is copied. All live/result state
// is reset so the clone starts clean.
// ---------------------------------------------------------------------------
export function cloneTournament(
  source: Tournament,
  opts: {
    name: string;
    date: string;
    time: string;
    creatorId: string;
    creatorName?: string;
    copyRoster: boolean;
  },
): Tournament {
  // Roster: either copy the original players/invites/pairs, or start with just
  // the creator. Invitations are reset to 'pending' so each clone re-confirms.
  let players: GamePlayer[];
  let invitedPlayers: InvitedPlayer[];
  let fixedPairs = source.fixedPairs;

  if (opts.copyRoster) {
    players = (source.players ?? []).map(p => ({ ...p, isCreator: p.id === opts.creatorId }));
    invitedPlayers = (source.invitedPlayers ?? []).map(p => ({
      ...p,
      status: 'pending' as const,
      invitedAt: new Date().toISOString(),
    }));
  } else {
    players = opts.creatorName
      ? [{ id: opts.creatorId, name: opts.creatorName, ranking: 100, isCreator: true }]
      : [];
    invitedPlayers = [];
    fixedPairs = undefined;
  }

  const t: Tournament = {
    id: generateId(),
    code: generateCode(),
    name: opts.name,
    format: source.format,
    status: 'created',
    date: opts.date,
    time: opts.time,
    club: source.club,
    city: source.city,
    country: source.country,
    locationName: source.locationName,
    pairType: source.pairType,
    mixto: source.mixto,
    scoreConfig: source.scoreConfig,
    maxPlayers: source.maxPlayers,
    courts: source.courts,
    players,
    invitedPlayers,
    fixedPairs,
    rounds: [],
    currentRound: 0,
    standings: [],
    creatorId: opts.creatorId,
    coCreatorIds: [],
    levelLabel: source.levelLabel,
    pjTarget: source.pjTarget,
    knockoutConfig: source.knockoutConfig
      ? {
          ...source.knockoutConfig,
          currentPhase: source.knockoutConfig.hasGroups ? 'group_stage' : 'bracket',
        }
      : undefined,
    groupScoreConfig: source.groupScoreConfig,
    leagueId: source.leagueId,
    seasonId: source.seasonId,
    createdAt: new Date().toISOString(),
  };
  saveTournament(t);
  return t;
}
