// plan-config.ts — Central plan limits, usage tracking, and gate helpers

export type PlanId =
  | 'free'
  | 'player_pro'
  | 'liga_free' | 'liga_basic' | 'liga_pro' | 'liga_unlimited'
  | 'club_starter' | 'club_pro' | 'club_liga'
  | 'fed_basic' | 'fed_pro';

// ── Stripe plan ID → PlanId mapping ───────────────────────────────────────────

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

// ── Player-level limits (applied to individual player accounts) ───────────────

interface PlayerLimits {
  maxPlayersPerGame: number;       // -1 = unlimited
  maxGamesPerMonth: number;        // -1 = unlimited
  maxPlayersPerTournament: number;
  maxTournamentsPerMonth: number;
}

const PLAYER_LIMITS: Record<string, PlayerLimits> = {
  free: {
    maxPlayersPerGame: 8,
    maxGamesPerMonth: 3,
    maxPlayersPerTournament: 16,
    maxTournamentsPerMonth: 1,
  },
  player_pro: {
    maxPlayersPerGame: 32,
    maxGamesPerMonth: -1,
    maxPlayersPerTournament: 64,
    maxTournamentsPerMonth: -1,
  },
};

// Club/league/federation roles bypass player limits entirely
const BYPASS_ROLES = new Set(['club_manager', 'league_organizer', 'federation', 'super_admin']);

// ── Monthly usage tracking ─────────────────────────────────────────────────────

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

// ── Plan resolution ────────────────────────────────────────────────────────────

export function getUserPlan(): PlanId {
  if (typeof window === 'undefined') return 'free';
  try {
    const raw = localStorage.getItem('padelmgt_user');
    if (!raw) return 'free';
    const s = JSON.parse(raw) as { plan?: string; role?: string };
    if (s.role && BYPASS_ROLES.has(s.role)) return 'fed_pro'; // demo accounts are unrestricted
    return (s.plan as PlanId) ?? 'free';
  } catch { return 'free'; }
}

export function getPlayerLimits(): PlayerLimits {
  const plan = getUserPlan();
  return PLAYER_LIMITS[plan] ?? PLAYER_LIMITS.free;
}

// ── Gate check functions ───────────────────────────────────────────────────────

export type GateResult =
  | { allowed: true }
  | { allowed: false; reason: 'players_per_game'; limit: number }
  | { allowed: false; reason: 'games_per_month'; limit: number; used: number }
  | { allowed: false; reason: 'players_per_tournament'; limit: number }
  | { allowed: false; reason: 'tournaments_per_month'; limit: number; used: number };

export function checkGameGate(maxPlayers: number): GateResult {
  const plan = getUserPlan();
  if (BYPASS_ROLES.has(plan) || plan === 'fed_pro') return { allowed: true };
  const lim = PLAYER_LIMITS[plan] ?? PLAYER_LIMITS.free;

  if (lim.maxPlayersPerGame !== -1 && maxPlayers > lim.maxPlayersPerGame) {
    return { allowed: false, reason: 'players_per_game', limit: lim.maxPlayersPerGame };
  }
  if (lim.maxGamesPerMonth !== -1) {
    const used = readUsage().games;
    if (used >= lim.maxGamesPerMonth) {
      return { allowed: false, reason: 'games_per_month', limit: lim.maxGamesPerMonth, used };
    }
  }
  return { allowed: true };
}

export function checkTournamentGate(maxPlayers: number): GateResult {
  const plan = getUserPlan();
  if (BYPASS_ROLES.has(plan) || plan === 'fed_pro') return { allowed: true };
  const lim = PLAYER_LIMITS[plan] ?? PLAYER_LIMITS.free;

  if (lim.maxPlayersPerTournament !== -1 && maxPlayers > lim.maxPlayersPerTournament) {
    return { allowed: false, reason: 'players_per_tournament', limit: lim.maxPlayersPerTournament };
  }
  if (lim.maxTournamentsPerMonth !== -1) {
    const used = readUsage().tournaments;
    if (used >= lim.maxTournamentsPerMonth) {
      return { allowed: false, reason: 'tournaments_per_month', limit: lim.maxTournamentsPerMonth, used };
    }
  }
  return { allowed: true };
}

export function isPlayerProOrAbove(): boolean {
  const plan = getUserPlan();
  return plan !== 'free';
}
