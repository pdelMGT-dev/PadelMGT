// plan-config.ts — Central plan limits, usage tracking, and gate helpers
import { getAllPlayers } from './player-store';

export type PlanId =
  | 'free'
  | 'player_basic' | 'player_pro' | 'player_unlimited'
  | 'liga_free' | 'liga_basic' | 'liga_pro' | 'liga_unlimited'
  | 'club_starter' | 'club_pro' | 'club_liga'
  | 'fed_basic' | 'fed_pro'
  | 'infinity';

// ── Stripe plan ID → PlanId mapping ─────────────────────────────────────────
// Unified player ladder: one plan governs games, tournaments AND leagues.
export const STRIPE_PLAN_MAP: Record<string, PlanId> = {
  player_basic:          'player_basic',
  player_basic_year:     'player_basic',
  player_pro:            'player_pro',
  player_pro_year:       'player_pro',
  player_unlimited:      'player_unlimited',
  player_unlimited_year: 'player_unlimited',
  // Legacy liga_* plans kept for backward compat with any existing records.
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
  // Liga-level — a player's plan governs the leagues THEY create ("dueño gobierna")
  maxActiveLeagues: number;
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
// The player ladder (free/basic/pro/unlimited) governs games, tournaments AND
// leagues in a single plan. rankingTier drives the standings classification the
// league shows: basic → básica, advanced → completa, full → avanzada.
export const DEFAULT_LIMITS: Record<string, PlanLimits> = {
  free: {
    maxPlayersPerGame: 8, maxGamesPerMonth: 3, maxPlayersPerTournament: 8, maxTournamentsPerMonth: 1,
    maxActiveLeagues: 1, maxLeaguePlayers: 8, maxActiveTournaments: 1, rankingTier: 'basic', hasCategories: false, maxSeasonHistory: 0,
    maxCourts: 0, canCustomizePage: false, clubMaxTournamentsPerMonth: 0,
  },
  player_basic: {
    maxPlayersPerGame: 12, maxGamesPerMonth: 10, maxPlayersPerTournament: 16, maxTournamentsPerMonth: 3,
    maxActiveLeagues: 3, maxLeaguePlayers: 16, maxActiveTournaments: 3, rankingTier: 'advanced', hasCategories: false, maxSeasonHistory: 1,
    maxCourts: 0, canCustomizePage: false, clubMaxTournamentsPerMonth: 0,
  },
  player_pro: {
    maxPlayersPerGame: 24, maxGamesPerMonth: -1, maxPlayersPerTournament: 64, maxTournamentsPerMonth: 5,
    maxActiveLeagues: 10, maxLeaguePlayers: 32, maxActiveTournaments: 5, rankingTier: 'full', hasCategories: true, maxSeasonHistory: 3,
    maxCourts: 0, canCustomizePage: false, clubMaxTournamentsPerMonth: 0,
  },
  player_unlimited: {
    maxPlayersPerGame: 32, maxGamesPerMonth: -1, maxPlayersPerTournament: -1, maxTournamentsPerMonth: -1,
    maxActiveLeagues: -1, maxLeaguePlayers: -1, maxActiveTournaments: -1, rankingTier: 'full', hasCategories: true, maxSeasonHistory: -1,
    maxCourts: 0, canCustomizePage: false, clubMaxTournamentsPerMonth: 0,
  },
  // Legacy liga_* plans — retained for backward compat only (no longer sold).
  liga_free: {
    maxPlayersPerGame: 8, maxGamesPerMonth: 3, maxPlayersPerTournament: 16, maxTournamentsPerMonth: 1,
    maxActiveLeagues: 1, maxLeaguePlayers: 20, maxActiveTournaments: 1, rankingTier: 'basic', hasCategories: false, maxSeasonHistory: 0,
    maxCourts: 0, canCustomizePage: false, clubMaxTournamentsPerMonth: 0,
  },
  liga_basic: {
    maxPlayersPerGame: 32, maxGamesPerMonth: -1, maxPlayersPerTournament: 64, maxTournamentsPerMonth: -1,
    maxActiveLeagues: 3, maxLeaguePlayers: 50, maxActiveTournaments: 3, rankingTier: 'advanced', hasCategories: false, maxSeasonHistory: 1,
    maxCourts: 0, canCustomizePage: false, clubMaxTournamentsPerMonth: 0,
  },
  liga_pro: {
    maxPlayersPerGame: 32, maxGamesPerMonth: -1, maxPlayersPerTournament: 64, maxTournamentsPerMonth: -1,
    maxActiveLeagues: 10, maxLeaguePlayers: 200, maxActiveTournaments: 10, rankingTier: 'full', hasCategories: true, maxSeasonHistory: 3,
    maxCourts: 0, canCustomizePage: false, clubMaxTournamentsPerMonth: 0,
  },
  liga_unlimited: {
    maxPlayersPerGame: -1, maxGamesPerMonth: -1, maxPlayersPerTournament: -1, maxTournamentsPerMonth: -1,
    maxActiveLeagues: -1, maxLeaguePlayers: -1, maxActiveTournaments: -1, rankingTier: 'full', hasCategories: true, maxSeasonHistory: -1,
    maxCourts: 0, canCustomizePage: false, clubMaxTournamentsPerMonth: 0,
  },
  club_starter: {
    maxPlayersPerGame: 32, maxGamesPerMonth: -1, maxPlayersPerTournament: 64, maxTournamentsPerMonth: -1,
    maxActiveLeagues: 0, maxLeaguePlayers: 0, maxActiveTournaments: 0, rankingTier: 'none', hasCategories: false, maxSeasonHistory: 0,
    maxCourts: 3, canCustomizePage: false, clubMaxTournamentsPerMonth: 1,
  },
  club_pro: {
    maxPlayersPerGame: 32, maxGamesPerMonth: -1, maxPlayersPerTournament: 64, maxTournamentsPerMonth: -1,
    maxActiveLeagues: 0, maxLeaguePlayers: 0, maxActiveTournaments: 0, rankingTier: 'none', hasCategories: false, maxSeasonHistory: 0,
    maxCourts: 10, canCustomizePage: true, clubMaxTournamentsPerMonth: 5,
  },
  club_liga: {
    maxPlayersPerGame: -1, maxGamesPerMonth: -1, maxPlayersPerTournament: -1, maxTournamentsPerMonth: -1,
    maxActiveLeagues: -1, maxLeaguePlayers: 200, maxActiveTournaments: 10, rankingTier: 'full', hasCategories: true, maxSeasonHistory: 3,
    maxCourts: -1, canCustomizePage: true, clubMaxTournamentsPerMonth: -1,
  },
  fed_basic: {
    maxPlayersPerGame: -1, maxGamesPerMonth: -1, maxPlayersPerTournament: -1, maxTournamentsPerMonth: -1,
    maxActiveLeagues: -1, maxLeaguePlayers: -1, maxActiveTournaments: -1, rankingTier: 'full', hasCategories: true, maxSeasonHistory: -1,
    maxCourts: -1, canCustomizePage: true, clubMaxTournamentsPerMonth: -1,
  },
  fed_pro: {
    maxPlayersPerGame: -1, maxGamesPerMonth: -1, maxPlayersPerTournament: -1, maxTournamentsPerMonth: -1,
    maxActiveLeagues: -1, maxLeaguePlayers: -1, maxActiveTournaments: -1, rankingTier: 'full', hasCategories: true, maxSeasonHistory: -1,
    maxCourts: -1, canCustomizePage: true, clubMaxTournamentsPerMonth: -1,
  },
  infinity: {
    maxPlayersPerGame: -1, maxGamesPerMonth: -1, maxPlayersPerTournament: -1, maxTournamentsPerMonth: -1,
    maxActiveLeagues: -1, maxLeaguePlayers: -1, maxActiveTournaments: -1, rankingTier: 'full', hasCategories: true, maxSeasonHistory: -1,
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

// ── Club/super-admin roles bypass player limits entirely ─────────────────────
const BYPASS_ROLES = new Set(['club_manager', 'super_admin']);

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

// ── Server-verified usage (real counts, not a client-resettable counter) ─────
// A localStorage counter can be reset just by clearing storage or switching
// device/browser, silently bypassing the plan's monthly limits. /api/me/usage
// counts the caller's real quick_games/tournaments rows in Supabase instead.
const VERIFIED_USAGE_KEY = 'padelmgt_verified_usage_v1';
const VERIFIED_USAGE_TTL = 60 * 1000;

interface VerifiedUsageCache { games: number; tournaments: number; fetchedAt: number; }

function getCachedServerUsage(): VerifiedUsageCache | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = sessionStorage.getItem(VERIFIED_USAGE_KEY);
    if (!raw) return null;
    const cache = JSON.parse(raw) as VerifiedUsageCache;
    if (Date.now() - cache.fetchedAt > VERIFIED_USAGE_TTL) return null;
    return cache;
  } catch { return null; }
}

/** Fetch real usage counts from Supabase. Falls back to the local counter
 * (best-effort only) when the fetch fails, e.g. offline. */
async function fetchServerUsage(): Promise<{ games: number; tournaments: number }> {
  const cached = getCachedServerUsage();
  if (cached) return { games: cached.games, tournaments: cached.tournaments };
  try {
    const res = await fetch('/api/me/usage', { credentials: 'include' });
    if (!res.ok) return readUsage();
    const data = await res.json() as { games: number; tournaments: number };
    try {
      sessionStorage.setItem(VERIFIED_USAGE_KEY, JSON.stringify({ ...data, fetchedAt: Date.now() }));
    } catch { /* ignore */ }
    return data;
  } catch {
    return readUsage();
  }
}

// ── Server-verified plan cache ────────────────────────────────────────────────
// /api/me/plan derives the plan from the verified Supabase session (Stripe
// webhook + SA are the sources of truth). When available, this OVERRIDES any
// client-stored plan so editing localStorage no longer unlocks features.
const VERIFIED_PLAN_KEY = 'padelmgt_verified_plan_v1';
const VERIFIED_PLAN_TTL = 5 * 60 * 1000;

interface VerifiedPlanCache { plan: string; verified: boolean; fetchedAt: number; }

function getVerifiedPlan(): VerifiedPlanCache | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = sessionStorage.getItem(VERIFIED_PLAN_KEY);
    if (!raw) return null;
    const cache = JSON.parse(raw) as VerifiedPlanCache;
    if (Date.now() - cache.fetchedAt > VERIFIED_PLAN_TTL) return null;
    return cache;
  } catch { return null; }
}

export async function initVerifiedPlan(): Promise<void> {
  if (typeof window === 'undefined') return;
  if (getVerifiedPlan()) return;
  try {
    const res = await fetch('/api/me/plan');
    if (!res.ok) return;
    const data = await res.json() as { plan?: string; verified?: boolean };
    sessionStorage.setItem(VERIFIED_PLAN_KEY, JSON.stringify({
      plan: data.plan ?? 'free', verified: !!data.verified, fetchedAt: Date.now(),
    }));
  } catch { /* offline — fall back to local resolution */ }
}

/** Always fetches fresh plan from server (bypasses TTL). Use on dashboard mount
 *  so SA changes are reflected immediately without waiting for cache expiry. */
export async function refreshVerifiedPlan(): Promise<PlanId> {
  if (typeof window === 'undefined') return 'free';
  try {
    const res = await fetch('/api/me/plan');
    if (!res.ok) return getUserPlan();
    const data = await res.json() as { plan?: string; verified?: boolean };
    const plan = (data.plan ?? 'free') as PlanId;
    sessionStorage.setItem(VERIFIED_PLAN_KEY, JSON.stringify({
      plan, verified: !!data.verified, fetchedAt: Date.now(),
    }));
    // Also keep localStorage user record in sync so role/plan checks stay accurate
    try {
      const raw = localStorage.getItem('padelmgt_user');
      if (raw) {
        const u = JSON.parse(raw) as Record<string, unknown>;
        u.plan = plan;
        localStorage.setItem('padelmgt_user', JSON.stringify(u));
      }
    } catch { /* ignore */ }
    return plan;
  } catch { return getUserPlan(); }
}

// ── Plan resolution ──────────────────────────────────────────────────────────
export function getUserPlan(): PlanId {
  if (typeof window === 'undefined') return 'free';
  try {
    const raw = localStorage.getItem('padelmgt_user');
    if (!raw) return 'free';
    const s = JSON.parse(raw) as { id?: string; plan?: string; role?: string };
    if (s.role && BYPASS_ROLES.has(s.role)) return 'fed_pro';

    // Server-verified plan wins over anything stored client-side
    const verified = getVerifiedPlan();
    if (verified?.verified) return (verified.plan as PlanId) ?? 'free';

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
  | { allowed: false; reason: 'tournaments_per_month'; limit: number; used: number }
  | { allowed: false; reason: 'active_leagues'; limit: number; used: number }
  | { allowed: false; reason: 'players_per_league'; limit: number };

export async function checkGameGate(maxPlayers: number): Promise<GateResult> {
  const plan = getUserPlan();
  if (BYPASS_ROLES.has(plan) || plan === 'fed_pro' || plan === 'infinity') return { allowed: true };
  const lim = getLimitsForPlan(plan);
  if (lim.maxPlayersPerGame !== -1 && maxPlayers > lim.maxPlayersPerGame)
    return { allowed: false, reason: 'players_per_game', limit: lim.maxPlayersPerGame };
  if (lim.maxGamesPerMonth !== -1) {
    const used = (await fetchServerUsage()).games;
    if (used >= lim.maxGamesPerMonth) return { allowed: false, reason: 'games_per_month', limit: lim.maxGamesPerMonth, used };
  }
  return { allowed: true };
}

export async function checkTournamentGate(maxPlayers: number): Promise<GateResult> {
  const plan = getUserPlan();
  if (BYPASS_ROLES.has(plan) || plan === 'fed_pro' || plan === 'infinity') return { allowed: true };
  const lim = getLimitsForPlan(plan);
  if (lim.maxPlayersPerTournament !== -1 && maxPlayers > lim.maxPlayersPerTournament)
    return { allowed: false, reason: 'players_per_tournament', limit: lim.maxPlayersPerTournament };
  if (lim.maxTournamentsPerMonth !== -1) {
    const used = (await fetchServerUsage()).tournaments;
    if (used >= lim.maxTournamentsPerMonth) return { allowed: false, reason: 'tournaments_per_month', limit: lim.maxTournamentsPerMonth, used };
  }
  return { allowed: true };
}

// ── League gates ("dueño gobierna": a league's caps come from its CREATOR) ────

/** Resolve a specific player's plan (used for the league creator, who may not
 *  be the current user — e.g. a co-admin approving a join request). */
export function getPlanForPlayerId(playerId: string): PlanId {
  try {
    const p = getAllPlayers().find(pl => pl.id === playerId);
    return (p?.plan as PlanId) ?? 'free';
  } catch { return 'free'; }
}

/** Full limits for a given plan id (public wrapper over the internal resolver). */
export function getLimitsForPlanId(planId: string): PlanLimits {
  return getLimitsForPlan(planId);
}

/** Limits that govern a league, taken from its creator's plan. */
export function getLimitsForLeagueOwner(creatorId: string): PlanLimits {
  return getLimitsForPlan(getPlanForPlayerId(creatorId));
}

/** Can `creatorId` open one more league given how many they already run? */
export function checkLeagueCreateGate(creatorId: string, currentActiveLeagues: number): GateResult {
  const plan = getPlanForPlayerId(creatorId);
  if (plan === 'fed_pro' || plan === 'fed_basic' || plan === 'infinity') return { allowed: true };
  const lim = getLimitsForPlan(plan);
  if (lim.maxActiveLeagues !== -1 && currentActiveLeagues >= lim.maxActiveLeagues)
    return { allowed: false, reason: 'active_leagues', limit: lim.maxActiveLeagues, used: currentActiveLeagues };
  return { allowed: true };
}

/** Can one more member join a league whose creator is `creatorId`? */
export function checkLeagueMemberGate(creatorId: string, currentMemberCount: number): GateResult {
  const plan = getPlanForPlayerId(creatorId);
  if (plan === 'fed_pro' || plan === 'fed_basic' || plan === 'infinity') return { allowed: true };
  const lim = getLimitsForPlan(plan);
  if (lim.maxLeaguePlayers !== -1 && currentMemberCount >= lim.maxLeaguePlayers)
    return { allowed: false, reason: 'players_per_league', limit: lim.maxLeaguePlayers };
  return { allowed: true };
}

export function isPlayerProOrAbove(): boolean { return getUserPlan() !== 'free'; }

export function getMonthlyUsage(): { games: number; tournaments: number } { return readUsage(); }

// ── Multi-plan helpers ─────────────────────────────────────────────────────────

const PLAYER_PLAN_STORAGE = 'padelmgt_active_plans';

interface ActivePlanEntry {
  planId: PlanId;
  startedAt: string;
  expiresAt?: string;
}

/** Returns all currently active plan entries for the logged-in user. */
export function getActivePlans(): ActivePlanEntry[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(PLAYER_PLAN_STORAGE);
    if (!raw) {
      const freePlan: ActivePlanEntry = { planId: 'free', startedAt: new Date().toISOString() };
      localStorage.setItem(PLAYER_PLAN_STORAGE, JSON.stringify([freePlan]));
      return [freePlan];
    }
    return JSON.parse(raw) as ActivePlanEntry[];
  } catch { return []; }
}

/** Check whether the user currently has a specific plan active. */
export function hasActivePlan(planId: PlanId): boolean {
  return getActivePlans().some(p => p.planId === planId);
}

/** Add a plan to the active-plans list (idempotent). Liga Pro/Unlimited auto-adds player_pro. */
export function addActivePlan(planId: PlanId, expiresAt?: string): void {
  if (typeof window === 'undefined') return;
  const plans = getActivePlans();
  if (plans.some(p => p.planId === planId)) return;
  plans.push({ planId, startedAt: new Date().toISOString(), expiresAt });
  if ((planId === 'liga_pro' || planId === 'liga_unlimited') && !plans.some(p => p.planId === 'player_pro')) {
    plans.push({ planId: 'player_pro', startedAt: new Date().toISOString(), expiresAt });
  }
  localStorage.setItem(PLAYER_PLAN_STORAGE, JSON.stringify(plans));
}

/** Remove a plan from the active-plans list. Always keeps 'free'. */
export function removeActivePlan(planId: PlanId): void {
  if (typeof window === 'undefined') return;
  const plans = getActivePlans().filter(p => p.planId !== planId);
  if (!plans.some(p => p.planId === 'free')) {
    plans.push({ planId: 'free', startedAt: new Date().toISOString() });
  }
  localStorage.setItem(PLAYER_PLAN_STORAGE, JSON.stringify(plans));
}
