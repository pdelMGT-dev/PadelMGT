// plan-config.ts — Central plan limits, usage tracking, and gate helpers
import { getAllPlayers } from './player-store';

export type PlanId =
  | 'free'
  | 'player_pro'
  | 'liga_free' | 'liga_basic' | 'liga_pro' | 'liga_unlimited'
  | 'club_starter' | 'club_pro' | 'club_liga'
  | 'fed_basic' | 'fed_pro'
  | 'infinity';

// ── Stripe plan ID → PlanId mapping ─────────────────────────────────────────
export const STRIPE_PLAN_MAP: Record<string, PlanId> = {
  player_pro:       'player_pro',
  player_pro_year:  'player_pro',
  liga_basic:       'liga_basic',
  liga_pro:         'liga_pro',
  liga_unlimited:   'liga_unlimited',
  club_starter:     'club_starter',
  club_pro:         'club_pro',
  club_liga:        'club_liga',
  fed_basic:        'fed_basic',
  fed_pro:          'fed_pro',
};

// ── Plan limits interface ────────────────────────────────────────────────────
export interface PlanLimits {
  // Player-level (enforced in game/tournament creation)
  maxPlayersPerGame: number;
  maxGamesPerMonth: number;
  maxPlayersPerTournament: number;
  maxTournamentsPerMonth: number;
  // Liga-level
  maxLeaguePlayers: number;
  maxActiveTournaments: number;
  rankingTier: 'none' | 'basic' | 'advanced' | 'full';
  hasCategories: boolean;
  maxSeasonHistory: number;
  // Club-level
  maxCourts: number;
  canCustomizePage: boolean;
  clubMaxTournamentsPerMonth: number;
}

// ── Default limits (hardcoded fallback when Supabase unavailable) ─────────────
export const DEFAULT_LIMITS: Record<string, PlanLimits> = {
  free: {
    maxPlayersPerGame: 8, maxGamesPerMonth: 3, maxPlayersPerTournament: 16, maxTournamentsPerMonth: 1,
    maxLeaguePlayers: 20, maxActiveTournaments: 1, rankingTier: 'none', hasCategories: false, maxSeasonHistory: 0,
    maxCourts: 0, canCustomizePage: false, clubMaxTournamentsPerMonth: 0,
  },
  player_pro: {
    maxPlayersPerGame: 32, maxGamesPerMonth: -1, maxPlayersPerTournament: 64, maxTournamentsPerMonth: -1,
    maxLeaguePlayers: 50, maxActiveTournaments: 3, rankingTier: 'basic', hasCategories: false, maxSeasonHistory: 1,
    maxCourts: 0, canCustomizePage: false, clubMaxTournamentsPerMonth: 0,
  },
  liga_free: {
    maxPlayersPerGame: 8, maxGamesPerMonth: 3, maxPlayersPerTournament: 16, maxTournamentsPerMonth: 1,
    maxLeaguePlayers: 20, maxActiveTournaments: 1, rankingTier: 'none', hasCategories: false, maxSeasonHistory: 0,
    maxCourts: 0, canCustomizePage: false, clubMaxTournamentsPerMonth: 0,
  },
  liga_basic: {
    maxPlayersPerGame: 32, maxGamesPerMonth: -1, maxPlayersPerTournament: 64, maxTournamentsPerMonth: -1,
    maxLeaguePlayers: 50, maxActiveTournaments: 3, rankingTier: 'basic', hasCategories: false, maxSeasonHistory: 1,
    maxCourts: 0, canCustomizePage: false, clubMaxTournamentsPerMonth: 0,
  },
  liga_pro: {
    maxPlayersPerGame: 32, maxGamesPerMonth: -1, maxPlayersPerTournament: 64, maxTournamentsPerMonth: -1,
    maxLeaguePlayers: 200, maxActiveTournaments: 10, rankingTier: 'advanced', hasCategories: true, maxSeasonHistory: 3,
    maxCourts: 0, canCustomizePage: false, clubMaxTournamentsPerMonth: 0,
  },
  liga_unlimited: {
    maxPlayersPerGame: -1, maxGamesPerMonth: -1, maxPlayersPerTournament: -1, maxTournamentsPerMonth: -1,
    maxLeaguePlayers: -1, maxActiveTournaments: -1, rankingTier: 'full', hasCategories: true, maxSeasonHistory: -1,
    maxCourts: 0, canCustomizePage: false, clubMaxTournamentsPerMonth: 0,
  },
  club_starter: {
    maxPlayersPerGame: 32, maxGamesPerMonth: -1, maxPlayersPerTournament: 64, maxTournamentsPerMonth: -1,
    maxLeaguePlayers: 0, maxActiveTournaments: 0, rankingTier: 'none', hasCategories: false, maxSeasonHistory: 0,
    maxCourts: 3, canCustomizePage: false, clubMaxTournamentsPerMonth: 1,
  },
  club_pro: {
    maxPlayersPerGame: 32, maxGamesPerMonth: -1, maxPlayersPerTournament: 64, maxTournamentsPerMonth: -1,
    maxLeaguePlayers: 0, maxActiveTournaments: 0, rankingTier: 'none', hasCategories: false, maxSeasonHistory: 0,
    maxCourts: 10, canCustomizePage: true, clubMaxTournamentsPerMonth: 5,
  },
  club_liga: {
    maxPlayersPerGame: -1, maxGamesPerMonth: -1, maxPlayersPerTournament: -1, maxTournamentsPerMonth: -1,
    maxLeaguePlayers: 200, maxActiveTournaments: 10, rankingTier: 'advanced', hasCategories: true, maxSeasonHistory: 3,
    maxCourts: -1, canCustomizePage: true, clubMaxTournamentsPerMonth: -1,
  },
  fed_basic: {
    maxPlayersPerGame: -1, maxGamesPerMonth: -1, maxPlayersPerTournament: -1, maxTournamentsPerMonth: -1,
    maxLeaguePlayers: -1, maxActiveTournaments: -1, rankingTier: 'full', hasCategories: true, maxSeasonHistory: -1,
    maxCourts: -1, canCustomizePage: true, clubMaxTournamentsPerMonth: -1,
  },
  fed_pro: {
    maxPlayersPerGame: -1, maxGamesPerMonth: -1, maxPlayersPerTournament: -1, maxTournamentsPerMonth: -1,
    maxLeaguePlayers: -1, maxActiveTournaments: -1, rankingTier: 'full', hasCategories: true, maxSeasonHistory: -1,
    maxCourts: -1, canCustomizePage: true, clubMaxTournamentsPerMonth: -1,
  },
  infinity: {
    maxPlayersPerGame: -1, maxGamesPerMonth: -1, maxPlayersPerTournament: -1, maxTournamentsPerMonth: -1,
    maxLeaguePlayers: -1, maxActiveTournaments: -1, rankingTier: 'full', hasCategories: true, maxSeasonHistory: -1,
    maxCourts: -1, canCustomizePage: true, clubMaxTournamentsPerMonth: -1,
  },
};

// ── Dynamic limits cache (server-fetched, stored in sessionStorage) ───────────
// Using sessionStorage means limits come from the server on each new session,
// so users cannot bypass plan restrictions by editing localStorage.
const LIMITS_CACHE_KEY = 'padelmgt_plan_limits_v1';
const LIMITS_CACHE_TTL = 5 * 60 * 1000; // 5 minutes

interface LimitsCache { limits: Record<string, PlanLimits>; fetchedAt: number; }

function getCachedLimits(): Record<string, PlanLimits> | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = sessionStorage.getItem(LIMITS_CACHE_KEY);
    if (!raw) return null;
    const cache = JSON.parse(raw) as LimitsCache;
    if (Date.now() - cache.fetchedAt > LIMITS_CACHE_TTL) { sessionStorage.removeItem(LIMITS_CACHE_KEY); return null; }
    return cache.limits;
  } catch { return null; }
}

export function setPlanLimitsCache(limits: Record<string, PlanLimits>): void {
  if (typeof window === 'undefined') return;
  try { sessionStorage.setItem(LIMITS_CACHE_KEY, JSON.stringify({ limits, fetchedAt: Date.now() })); } catch { /* ignore */ }
}

export async function initPlanLimits(): Promise<void> {
  if (typeof window === 'undefined') return;
  if (getCachedLimits()) return;
  try {
    const res = await fetch('/api/plan-limits');
    if (!res.ok) return;
    const data = await res.json() as { limits?: Record<string, PlanLimits> };
    if (data.limits && Object.keys(data.limits).length > 0) setPlanLimitsCache(data.limits);
  } catch { /* fall back to defaults */ }
}

function getLimitsForPlan(planId: string): PlanLimits {
  const cached = getCachedLimits();
  if (cached?.[planId]) return cached[planId];
  return DEFAULT_LIMITS[planId] ?? DEFAULT_LIMITS.free;
}

// ── Club/league/federation roles bypass player limits entirely ───────────────
const BYPASS_ROLES = new Set(['club_manager', 'league_organizer', 'federation', 'super_admin']);

// ── Monthly usage tracking ────────────────────────────────────────────────────
const USAGE_PREFIX = 'padelmgt_usage_';

function monthKey(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

function readUsage(): { games: number; tournaments: number } {
  if (typeof window === 'undefined') return { games: 0, tournaments: 0 };
  try {
    const raw = localStorage.getItem(USAGE_PREFIX + monthKey());
    if (!raw) return { games: 0, tournaments: 0 };
    return JSON.parse(raw) as { games: number; tournaments: number };
  } catch { return { games: 0, tournaments: 0 }; }
}

export function incrementUsage(type: 'games' | 'tournaments'): void {
  if (typeof window === 'undefined') return;
  const usage = readUsage();
  usage[type]++;
  try { localStorage.setItem(USAGE_PREFIX + monthKey(), JSON.stringify(usage)); } catch { /* ignore */ }
}

// ── Plan resolution ──────────────────────────────────────────────────────────
export function getUserPlan(): PlanId {
  if (typeof window === 'undefined') return 'free';
  try {
    const raw = localStorage.getItem('padelmgt_user');
    if (!raw) return 'free';
    const s = JSON.parse(raw) as { id?: string; plan?: string; role?: string };
    if (s.role && BYPASS_ROLES.has(s.role)) return 'fed_pro';
    if (s.id) {
      const allPlayers = getAllPlayers();
      const playerRecord = allPlayers.find(p => p.id === s.id);
      if (playerRecord?.plan) return playerRecord.plan as PlanId;
    }
    return (s.plan as PlanId) ?? 'free';
  } catch { return 'free'; }
}

export function getPlayerLimits(): PlanLimits {
  return getLimitsForPlan(getUserPlan());
}

// ── Gate check functions ─────────────────────────────────────────────────────
export type GateResult =
  | { allowed: true }
  | { allowed: false; reason: 'players_per_game'; limit: number }
  | { allowed: false; reason: 'games_per_month'; limit: number; used: number }
  | { allowed: false; reason: 'players_per_tournament'; limit: number }
  | { allowed: false; reason: 'tournaments_per_month'; limit: number; used: number };

export function checkGameGate(maxPlayers: number): GateResult {
  const plan = getUserPlan();
  if (BYPASS_ROLES.has(plan) || plan === 'fed_pro' || plan === 'infinity') return { allowed: true };
  const lim = getLimitsForPlan(plan);
  if (lim.maxPlayersPerGame !== -1 && maxPlayers > lim.maxPlayersPerGame)
    return { allowed: false, reason: 'players_per_game', limit: lim.maxPlayersPerGame };
  if (lim.maxGamesPerMonth !== -1) {
    const used = readUsage().games;
    if (used >= lim.maxGamesPerMonth) return { allowed: false, reason: 'games_per_month', limit: lim.maxGamesPerMonth, used };
  }
  return { allowed: true };
}

export function checkTournamentGate(maxPlayers: number): GateResult {
  const plan = getUserPlan();
  if (BYPASS_ROLES.has(plan) || plan === 'fed_pro' || plan === 'infinity') return { allowed: true };
  const lim = getLimitsForPlan(plan);
  if (lim.maxPlayersPerTournament !== -1 && maxPlayers > lim.maxPlayersPerTournament)
    return { allowed: false, reason: 'players_per_tournament', limit: lim.maxPlayersPerTournament };
  if (lim.maxTournamentsPerMonth !== -1) {
    const used = readUsage().tournaments;
    if (used >= lim.maxTournamentsPerMonth) return { allowed: false, reason: 'tournaments_per_month', limit: lim.maxTournamentsPerMonth, used };
  }
  return { allowed: true };
}

export function isPlayerProOrAbove(): boolean { return getUserPlan() !== 'free'; }

export function getMonthlyUsage(): { games: number; tournaments: number } { return readUsage(); }
