// Personalizado tournament store — multi-category tournaments for organizers.
//
// Source of truth is Supabase (so registration slot counts are correct across
// devices). localStorage is kept as a synchronous cache/fallback for the
// creator's own views and for dev environments where Supabase isn't configured.
//
// Reads use the browser anon client; the registration write and team-status
// changes go through service-role API routes (atomic COUNT-then-INSERT), so two
// players on different devices can't both claim the last slot.

import { createLocalStore } from './local-store';
import { supabase, isSupabaseConfigured } from './supabase';

// ── Types ────────────────────────────────────────────────────────────────────

export interface PersonalizadoCategory {
  id: string;
  name: string;
  gender: 'masculino' | 'femenino' | 'mixto' | 'libre';
  maxTeams: number; // editable in the control panel before the tournament starts
  level?: number; // skill order for scheduling — lower = more novice, plays earlier in the day
  maxAge?: number; // child tournaments: "menores de X años" (Jan-1 rule)
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
  groupId?: string; // assigned via control-panel drag & drop
  registeredAt: string;
  status: 'pending' | 'confirmed' | 'rejected' | 'waitlisted' | 'partial_review' | 'unassigned';
  paymentStatus: 'unpaid' | 'paid' | 'free';
  reviewPlayer?: 'player1' | 'player2'; // which player is flagged for review
  partnerInviteToken?: string;          // token for "buscar compañero" invite link
}

// ── Control-panel configuration ──────────────────────────────────────────────

export interface CategoryGroupConfig {
  categoryId: string;
  groupCount: number;      // number of groups — editable; teamsPerGroup recalculates
  teamsPerGroup: number;   // teams that play in each group — editable; groupCount recalculates
  qualifyPerGroup: number; // teams that advance from each group to the bracket
}

export interface PersonalizadoSchedule {
  startTime: string;        // "09:00" — first match of the day
  endTime?: string;         // "21:00" — daily cutoff, used to compute rounds/days
  lunchEnabled: boolean;
  lunchStart?: string;      // "13:00"
  lunchDurationMin?: number;
  expectedEndTime?: string; // computed, stored for reference
  matchDurationMin: number; // estimated minutes per match (for end-time calc)
  endDate?: string;         // "YYYY-MM-DD" — estimated/confirmed last day of the tournament
}

export interface SetScore {
  a: number;
  b: number;
}

export interface MatchResult {
  sets: SetScore[];
  winnerId: string;   // teamAId or teamBId
  walkover: boolean;  // true → forfeit rules applied; sets[] may be empty
}

/** Partial, in-progress score broadcast while a match is 'playing' (no winner required yet).
 *  Cleared once the final `result` is recorded. Each cell is null until a number is entered. */
export interface LiveScore {
  sets: { a: number | null; b: number | null }[];
}

export interface PersonalizadoMatch {
  id: string;
  categoryId: string;
  groupId: string;
  groupLabel: string;       // "A", "B"…
  phase: 'group';
  day: string;              // "YYYY-MM-DD" — calendar day this match is scheduled on
  slot: number;             // ordinal time slot within the day (0-based)
  time: string;             // "09:00"
  courtName: string;
  teamAId: string;
  teamBId: string;
  status: 'scheduled' | 'playing' | 'done';
  result?: MatchResult;     // filled once an organizer enters the score
  liveScore?: LiveScore;    // partial score shown live while status === 'playing'
}

export const BRACKET_ROUND_LABELS: Record<number, string> = {
  32: 'Dieciseisavos de Final',
  16: 'Octavos de Final',
  8: 'Cuartos de Final',
  4: 'Semifinal',
  2: 'Final',
};

export interface BracketMatch {
  id: string;
  categoryId: string;
  round: number;             // 0 = first bracket round, increasing toward the final
  roundLabel: string;        // "Octavos de Final", "Cuartos de Final"… or "3er Puesto"
  slotIndex: number;         // position within the round (left to right)
  teamAId?: string;          // known once seeded (round 0) or once the previous round finishes
  teamBId?: string;
  placeholderA?: string;     // position label shown until a real team fills the slot ("1ero Grupo A")
  placeholderB?: string;
  wildcardA?: boolean;       // true if teamA filled a balancing slot (not a direct group qualifier)
  wildcardB?: boolean;
  day?: string;              // "YYYY-MM-DD" — scheduled day, once placed on the calendar
  time?: string;
  slot?: number;             // calendar time slot within the day (0-based, day-relative)
  courtName?: string;
  status: 'pending' | 'scheduled' | 'playing' | 'done';
  result?: MatchResult;
  liveScore?: LiveScore;     // partial score shown live while status === 'playing'
}

export interface TeamStanding {
  teamId: string;
  pj: number;    // played
  pg: number;    // wins
  pe: number;    // draws
  pp: number;    // losses
  jf: number;    // games in favour
  jc: number;    // games against
  diff: number;  // +/−
  pts: number;   // standing points
}

export type DeuceRule = 'ventaja' | 'oro' | 'plata' | 'ipf';

/**
 * Per-phase scoring parameters. The score *type* (traditional vs points) is shared across both
 * phases (ControlPanelConfig.scoreType); only these parameters differ between the classification
 * phase and the elimination phase — like a World Cup (group stage vs knockout).
 */
export interface ScorePhaseConfig {
  // traditional (sets) parameters — used when scoreType === 'traditional'
  sets: number;          // 1 | 2 | 3
  gamesPerSet: number;   // 4 | 5 | 6
  tiebreak: number;      // 7 | 10
  deuce: DeuceRule;
  // points parameter — used when scoreType === 'points'
  target: number;        // 16 | 24 | 32
}

export const DEFAULT_SCORE_PHASE: ScorePhaseConfig = {
  sets: 1, gamesPerSet: 6, tiebreak: 7, deuce: 'oro', target: 24,
};

export interface ControlPanelConfig {
  substitutionEnabled: boolean;
  // organizer allows guardians to register a family member (minor, no account) in this tournament
  acceptsFamilyMembers?: boolean;
  // score type, shared across phases; parameters below differ per phase (editable any time before that phase starts)
  scoreType: 'traditional' | 'points';
  scoreQualification: ScorePhaseConfig;
  scoreElimination: ScorePhaseConfig;
  // standings points for group stage
  standingsPoints: { win: number; draw: number; loss: number };
  // forfeit / injury withdrawal: points + games credited to the surviving team
  forfeit: { winnerPoints: number; winnerGamesFor: number };
  // per-category group structure
  groups: CategoryGroupConfig[];
  // court names (length is the effective court count; editable during play)
  courtNames: string[];
  schedule: PersonalizadoSchedule;
  // generated group-stage schedule (filled by generateGroupSchedule)
  matches?: PersonalizadoMatch[];
  // generated elimination bracket, per category (filled by generateBracket)
  bracketMatches?: BracketMatch[];
  // Published schedule snapshot. The working schedule (matches/bracketMatches above) is the
  // organizer's private draft; only `published` is shown on the public live page and search.
  // The organizer edits + "Guarda" the draft freely, then "Publica" to copy positions here and
  // notify players. Results/status are read live (merged by id) on top of these positions.
  published?: {
    matches: PersonalizadoMatch[];
    bracketMatches: BracketMatch[];
    signature: string;     // signature of the published positions (see scheduleSignature)
    publishedAt: string;   // ISO timestamp of the last publish
  };
  // child tournament: enables per-category age validation at inscription
  isChildTournament?: boolean;
  // player ids that can co-manage the tournament (everything except delete + co-creator mgmt)
  coCreatorIds?: string[];
  // per-category stage: 'inscripcion' (default) or 'grupos' (group formation). A full
  // category can be switched to 'grupos' by the organizer; reversible at any time.
  categoryStages?: Record<string, 'inscripcion' | 'grupos'>;
  // groups whose classification has been confirmed by the creator/co-creators, releasing their
  // qualified teams into the bracket. Keys are `${categoryId}:${groupId}`. Once a group is here,
  // its results are read-only for co-creators (only the creator/SA may still adjust them, and
  // only before that team's elimination match starts).
  confirmedGroups?: string[];
}

export const DEFAULT_CONTROL_CONFIG: ControlPanelConfig = {
  substitutionEnabled: false,
  acceptsFamilyMembers: false,
  isChildTournament: false,
  scoreType: 'traditional',
  scoreQualification: { ...DEFAULT_SCORE_PHASE },
  scoreElimination: { ...DEFAULT_SCORE_PHASE },
  standingsPoints: { win: 3, draw: 1, loss: 0 },
  forfeit: { winnerPoints: 3, winnerGamesFor: 0 },
  groups: [],
  courtNames: [],
  schedule: {
    startTime: '09:00',
    endTime: '21:00',
    lunchEnabled: false,
    lunchStart: '13:00',
    lunchDurationMin: 60,
    // 60 min per match → matches land on whole hours, aligning cleanly with the 15-min
    // calendar grid (a match block spans 4 fifteen-minute cells).
    matchDurationMin: 60,
  },
};

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
  config?: ControlPanelConfig;
  status: 'draft' | 'registration_open' | 'configured' | 'live' | 'finished' | 'cancelled';
  previousStatus?: string;
  creatorId: string;
  creatorName: string;
  createdAt: string;
  openedAt?: string;
}

// ── ID / code helpers ────────────────────────────────────────────────────────

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

// ── Supabase row mappers (pure — safe to import server-side) ──────────────────

export function teamToRow(tournamentId: string, t: PersonalizadoTeam): Record<string, unknown> {
  return {
    id: t.id,
    tournament_id: tournamentId,
    category_id: t.categoryId || null,
    player1_name: t.player1Name,
    player1_email: t.player1Email ?? null,
    player1_id: t.player1Id ?? null,
    player2_name: t.player2Name ?? null,
    player2_email: t.player2Email ?? null,
    player2_id: t.player2Id ?? null,
    group_id: t.groupId ?? null,
    status: t.status,
    payment_status: t.paymentStatus,
    registered_at: t.registeredAt,
    review_player: t.reviewPlayer ?? null,
    partner_invite_token: t.partnerInviteToken ?? null,
  };
}

export function rowToTeam(r: Record<string, unknown>): PersonalizadoTeam {
  return {
    id: r.id as string,
    categoryId: (r.category_id as string) ?? '',
    player1Name: r.player1_name as string,
    player1Email: (r.player1_email as string) ?? undefined,
    player1Id: (r.player1_id as string) ?? undefined,
    player2Name: (r.player2_name as string) ?? undefined,
    player2Email: (r.player2_email as string) ?? undefined,
    player2Id: (r.player2_id as string) ?? undefined,
    groupId: (r.group_id as string) ?? undefined,
    registeredAt: (r.registered_at as string) ?? new Date().toISOString(),
    status: r.status as PersonalizadoTeam['status'],
    paymentStatus: r.payment_status as PersonalizadoTeam['paymentStatus'],
    reviewPlayer: (r.review_player as 'player1' | 'player2') ?? undefined,
    partnerInviteToken: (r.partner_invite_token as string) ?? undefined,
  };
}

export function tournamentToRow(t: PersonalizadoTournament): Record<string, unknown> {
  return {
    id: t.id,
    code: t.code,
    name: t.name,
    date: t.date ?? null,
    time: t.time ?? null,
    location_name: t.locationName ?? null,
    city: t.city ?? null,
    country: t.country ?? 'ES',
    courts: t.courts ?? 2,
    categories: t.categories,
    config: t.config ?? {},
    status: t.status,
    previous_status: t.previousStatus ?? null,
    creator_player_id: t.creatorId ?? null,
    creator_name: t.creatorName ?? '',
    created_at: t.createdAt,
    opened_at: t.openedAt ?? null,
    updated_at: new Date().toISOString(),
  };
}

export function rowToTournament(
  r: Record<string, unknown>,
  teams: PersonalizadoTeam[] = [],
): PersonalizadoTournament {
  return {
    id: r.id as string,
    code: r.code as string,
    name: r.name as string,
    date: (r.date as string) ?? '',
    time: (r.time as string) ?? '',
    locationName: (r.location_name as string) ?? '',
    city: (r.city as string) ?? '',
    country: (r.country as string) ?? 'ES',
    courts: (r.courts as number) ?? 2,
    categories: (r.categories as PersonalizadoCategory[]) ?? [],
    teams,
    config: (r.config as ControlPanelConfig) ?? undefined,
    status: r.status as PersonalizadoTournament['status'],
    previousStatus: (r.previous_status as string) ?? undefined,
    creatorId: (r.creator_player_id as string) ?? '',
    creatorName: (r.creator_name as string) ?? '',
    createdAt: (r.created_at as string) ?? new Date().toISOString(),
    openedAt: (r.opened_at as string) ?? undefined,
  };
}

// ── localStorage cache (synchronous fallback) ─────────────────────────────────

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

// ── Player review notifications ──────────────────────────────────────────────

export interface PlayerReviewTeam {
  teamId: string;
  tournamentId: string;
  tournamentName: string;
  tournamentCode: string;
  categoryName?: string;
  status: 'partial_review' | 'unassigned';
  iAmReviewed: boolean;      // true if *this* player is the one flagged
  reviewedName?: string;     // name of the flagged player (for the "buscar compañero" case)
}

/**
 * Find all teams where the given player is in review (partial_review or
 * unassigned), across every tournament. Used for the Dashboard notification.
 */
export async function loadPlayerReviewTeams(playerId: string): Promise<PlayerReviewTeam[]> {
  if (!playerId) return [];

  const build = (
    row: PersonalizadoTeam,
    t: { name: string; code: string; categories: PersonalizadoCategory[] },
  ): PlayerReviewTeam => {
    const iAmP1 = row.player1Id === playerId;
    const reviewedIsP1 = row.reviewPlayer === 'player1';
    const iAmReviewed = row.status === 'unassigned'
      ? true
      : (iAmP1 ? reviewedIsP1 : !reviewedIsP1);
    const reviewedName = reviewedIsP1 ? row.player1Name : row.player2Name;
    return {
      teamId: row.id,
      tournamentId: '', // filled by caller
      tournamentName: t.name,
      tournamentCode: t.code,
      categoryName: t.categories.find(c => c.id === row.categoryId)?.name,
      status: row.status as 'partial_review' | 'unassigned',
      iAmReviewed,
      reviewedName,
    };
  };

  if (isSupabaseConfigured && supabase) {
    const { data, error } = await supabase
      .from('personalizado_teams')
      .select('*')
      .or(`player1_id.eq.${playerId},player2_id.eq.${playerId}`)
      .in('status', ['partial_review', 'unassigned']);
    if (error || !data || data.length === 0) return [];
    const tids = [...new Set(data.map(r => (r as Record<string, unknown>).tournament_id as string))];
    const { data: trows } = await supabase
      .from('personalizado_tournaments')
      .select('id, name, code, categories')
      .in('id', tids);
    const tmap = new Map<string, { name: string; code: string; categories: PersonalizadoCategory[] }>();
    for (const tr of (trows ?? []) as Record<string, unknown>[]) {
      tmap.set(tr.id as string, { name: tr.name as string, code: tr.code as string, categories: (tr.categories as PersonalizadoCategory[]) ?? [] });
    }
    const out: PlayerReviewTeam[] = [];
    for (const r of data as Record<string, unknown>[]) {
      const tid = r.tournament_id as string;
      const t = tmap.get(tid);
      if (!t) continue;
      out.push({ ...build(rowToTeam(r), t), tournamentId: tid });
    }
    return out;
  }

  // localStorage fallback
  const out: PlayerReviewTeam[] = [];
  for (const t of _store.load()) {
    for (const tm of t.teams) {
      if ((tm.status === 'partial_review' || tm.status === 'unassigned') &&
          (tm.player1Id === playerId || tm.player2Id === playerId)) {
        out.push({ ...build(tm, t), tournamentId: t.id });
      }
    }
  }
  return out;
}

/**
 * Whether a user may co-manage a tournament: the creator always can, and any
 * listed co-creator can. Co-creators have almost-full access (groups, schedule,
 * results, bracket) but NOT delete and NOT co-creator management — those checks
 * stay creator-only at the call sites.
 */
export function canManagePersonalizado(t: PersonalizadoTournament | null, userId?: string): boolean {
  if (!t || !userId) return false;
  if (t.creatorId === userId) return true;
  return (t.config?.coCreatorIds ?? []).includes(userId);
}

/** Write to the localStorage cache and fire-and-forget sync to Supabase. */
export function savePersonalizado(tournament: PersonalizadoTournament): void {
  const all = _store.load();
  const idx = all.findIndex(t => t.id === tournament.id);
  if (idx >= 0) { all[idx] = tournament; } else { all.push(tournament); }
  _store.persist(all);
  void syncTournamentToSupabase(tournament);
}

/** Upsert the tournament metadata + config to Supabase (no team rows here). */
export async function syncTournamentToSupabase(tournament: PersonalizadoTournament): Promise<void> {
  if (!isSupabaseConfigured || !supabase) return;
  try {
    const { error } = await supabase
      .from('personalizado_tournaments')
      .upsert(tournamentToRow(tournament), { onConflict: 'id' });
    if (error) console.warn('[Personalizado] syncTournament:', error.message);
  } catch (e) {
    console.warn('[Personalizado] syncTournament threw:', e);
  }
}

// ── Async reads (Supabase source of truth, localStorage fallback) ─────────────

/** Load a tournament + its teams by code, preferring Supabase. */
export async function loadPersonalizadoByCode(code: string): Promise<PersonalizadoTournament | null> {
  if (isSupabaseConfigured && supabase) {
    try {
      const { data: trow, error } = await supabase
        .from('personalizado_tournaments')
        .select('*')
        .eq('code', code)
        .maybeSingle();
      if (error) console.warn('[Personalizado] loadByCode:', error.message);
      if (trow) {
        const { data: teamRows } = await supabase
          .from('personalizado_teams')
          .select('*')
          .eq('tournament_id', (trow as Record<string, unknown>).id as string)
          .order('registered_at', { ascending: true });
        const teams = (teamRows ?? []).map(r => rowToTeam(r as Record<string, unknown>));
        return rowToTournament(trow as Record<string, unknown>, teams);
      }
    } catch (e) {
      console.warn('[Personalizado] loadByCode threw:', e);
    }
  }
  return getPersonalizadoByCode(code);
}

/** Load a tournament + its teams by id, preferring Supabase. */
export async function loadPersonalizadoById(id: string): Promise<PersonalizadoTournament | null> {
  if (isSupabaseConfigured && supabase) {
    try {
      const { data: trow, error } = await supabase
        .from('personalizado_tournaments')
        .select('*')
        .eq('id', id)
        .maybeSingle();
      if (error) console.warn('[Personalizado] loadById:', error.message);
      if (trow) {
        const [{ data: teamRows }, { data: resultRows }] = await Promise.all([
          supabase.from('personalizado_teams').select('*').eq('tournament_id', id).order('registered_at', { ascending: true }),
          supabase.from('personalizado_matches').select('*').eq('tournament_id', id),
        ]);
        const teams = (teamRows ?? []).map(r => rowToTeam(r as Record<string, unknown>));
        const t = rowToTournament(trow as Record<string, unknown>, teams);
        // Merge results into config.matches
        if (resultRows && resultRows.length > 0 && t.config?.matches) {
          const resultMap = new Map<string, MatchResult>();
          for (const r of resultRows as Array<Record<string, unknown>>) {
            if (r.winner_id) {
              resultMap.set(r.id as string, {
                sets: (r.result_sets as SetScore[]) ?? [],
                winnerId: r.winner_id as string,
                walkover: Boolean(r.walkover),
              });
            }
          }
          t.config.matches = t.config.matches.map(m =>
            resultMap.has(m.id) ? { ...m, result: resultMap.get(m.id), status: 'done' as const } : m
          );
        }
        return t;
      }
    } catch (e) {
      console.warn('[Personalizado] loadById threw:', e);
    }
  }
  return getPersonalizado(id);
}

// ── Create ───────────────────────────────────────────────────────────────────

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
  isChildTournament?: boolean;
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
    config: { ...DEFAULT_CONTROL_CONFIG, isChildTournament: params.isChildTournament ?? false },
    status: 'draft',
    creatorId: params.creatorId,
    creatorName: params.creatorName,
    createdAt: new Date().toISOString(),
  };
  savePersonalizado(tournament);
  return tournament;
}

/** Organizer pricing tiers based on total category capacity. */
export function calcOpeningPrice(tournament: PersonalizadoTournament): number {
  const totalSlots = tournament.categories.reduce((s, c) => s + c.maxTeams, 0);
  if (totalSlots <= 16) return 9;
  if (totalSlots <= 32) return 19;
  if (totalSlots <= 64) return 29;
  return 49;
}

// ── Slot counting ─────────────────────────────────────────────────────────────

export function enrolledCount(t: PersonalizadoTournament, categoryId: string): number {
  return t.teams.filter(tm => tm.categoryId === categoryId && (tm.status === 'pending' || tm.status === 'confirmed' || tm.status === 'partial_review')).length;
}

export function waitlistCount(t: PersonalizadoTournament, categoryId: string): number {
  return t.teams.filter(tm => tm.categoryId === categoryId && tm.status === 'waitlisted').length;
}

// ── Registration (atomic via API route, localStorage fallback) ────────────────

export interface RegisterResult {
  ok: boolean;
  error?: string;
  waitlisted?: boolean;
  team?: PersonalizadoTeam;
}

export interface RegisterInput {
  categoryId: string;
  player1Name: string;
  player1Email?: string;
  player1Id?: string;
  player2Name?: string;
  player2Email?: string;
  player2Id?: string;
  // child tournaments: birth dates of any minor (family-member) participants, so the
  // server can re-validate the Jan-1 age rule even if the client form is bypassed
  player1BirthDate?: string;
  player2BirthDate?: string;
}

/**
 * Register a team. Prefers the atomic service-role API route so concurrent
 * registrations on different devices can't both grab the last slot. Falls back
 * to a synchronous localStorage write when Supabase isn't configured.
 */
export async function registerTeam(code: string, team: RegisterInput): Promise<RegisterResult> {
  if (isSupabaseConfigured) {
    try {
      const res = await fetch('/api/personalizado/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code, ...team }),
      });
      if (res.ok) return (await res.json()) as RegisterResult;
      const json = await res.json().catch(() => ({})) as { error?: string };
      if (res.status < 500) return { ok: false, error: json.error ?? 'No se pudo completar la inscripción' };
    } catch {
      // network error — fall through to localStorage
    }
  }
  return addTeamToPersonalizadoLocal(code, team);
}

/** Synchronous localStorage registration (dev fallback / offline). */
export function addTeamToPersonalizadoLocal(code: string, team: RegisterInput): RegisterResult {
  const t = getPersonalizadoByCode(code);
  if (!t) return { ok: false, error: 'Torneo no encontrado' };
  if (t.status !== 'registration_open') return { ok: false, error: 'La inscripción no está abierta' };
  const cat = t.categories.find(c => c.id === team.categoryId);
  if (!cat) return { ok: false, error: 'Categoría no encontrada' };

  if (team.player1Email) {
    const email = team.player1Email.trim().toLowerCase();
    const dup = t.teams.some(tm =>
      tm.categoryId === team.categoryId &&
      tm.status !== 'rejected' &&
      (tm.player1Email?.trim().toLowerCase() === email || tm.player2Email?.trim().toLowerCase() === email)
    );
    if (dup) return { ok: false, error: 'Ese correo ya está inscrito en esta categoría' };
  }

  const waitlisted = enrolledCount(t, team.categoryId) >= cat.maxTeams;
  const newTeam: PersonalizadoTeam = {
    id: generateId(),
    categoryId: team.categoryId,
    player1Name: team.player1Name,
    player1Email: team.player1Email,
    player1Id: team.player1Id,
    player2Name: team.player2Name,
    player2Email: team.player2Email,
    player2Id: team.player2Id,
    registeredAt: new Date().toISOString(),
    status: waitlisted ? 'waitlisted' : 'pending',
    paymentStatus: 'free',
  };
  savePersonalizado({ ...t, teams: [...t.teams, newTeam] });
  return { ok: true, waitlisted, team: newTeam };
}

// ── Team status change (atomic via API route, localStorage fallback) ──────────

export interface StatusChangeResult {
  ok: boolean;
  error?: string;
  promoted?: PersonalizadoTeam;
}

/**
 * Change a team's status (confirm / reject). On rejection the oldest waitlisted
 * team in the same category is auto-promoted. Prefers the API route.
 */
export async function changeTeamStatus(
  tournamentId: string,
  teamId: string,
  status: PersonalizadoTeam['status'],
): Promise<StatusChangeResult> {
  if (isSupabaseConfigured) {
    try {
      const res = await fetch('/api/personalizado/team-status', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tournamentId, teamId, status }),
      });
      if (res.ok) return (await res.json()) as StatusChangeResult;
      const json = await res.json().catch(() => ({})) as { error?: string };
      if (res.status < 500) return { ok: false, error: json.error ?? 'No se pudo actualizar' };
    } catch {
      // network error — fall through to localStorage
    }
  }
  return setTeamStatusLocal(tournamentId, teamId, status);
}

/** Permanently delete a team registration from the tournament. */
export async function removeTeam(
  tournamentId: string,
  teamId: string,
  requesterId?: string,
): Promise<{ ok: boolean; error?: string }> {
  if (isSupabaseConfigured && supabase) {
    // personalizado_teams has RLS with no DELETE policy for anon/authenticated, so a direct
    // anon-client delete is silently dropped (0 rows) and the team reappears on the next poll.
    // Route through the service-role API so the row is actually removed.
    try {
      const res = await fetch('/api/personalizado/team-delete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tournamentId, teamId, requesterId }),
      });
      const data = (await res.json().catch(() => ({}))) as { ok?: boolean; error?: string };
      if (!res.ok || !data.ok) {
        return { ok: false, error: data.error ?? 'No se pudo eliminar el registro' };
      }
    } catch {
      return { ok: false, error: 'Error de red al eliminar el registro' };
    }
  }
  const all = _store.load();
  _store.persist(all.map(t =>
    t.id === tournamentId ? { ...t, teams: t.teams.filter(tm => tm.id !== teamId) } : t,
  ));
  return { ok: true };
}

/**
 * Flag a team for review. target='both' moves it to the unassigned pool
 * (category_id = null). target='player1'|'player2' keeps it in the category
 * but marks partial_review.
 */
export async function setTeamReview(
  tournamentId: string,
  teamId: string,
  target: 'player1' | 'player2' | 'both',
): Promise<{ ok: boolean; error?: string }> {
  if (isSupabaseConfigured && supabase) {
    const update: Record<string, unknown> =
      target === 'both'
        ? { status: 'unassigned', category_id: null, review_player: null }
        : { status: 'partial_review', review_player: target };
    const { error } = await supabase
      .from('personalizado_teams')
      .update(update)
      .eq('id', teamId)
      .eq('tournament_id', tournamentId);
    if (error) return { ok: false, error: error.message };
    return { ok: true };
  }
  // localStorage fallback
  const all = _store.load();
  const tidx = all.findIndex(t => t.id === tournamentId);
  if (tidx === -1) return { ok: false, error: 'Torneo no encontrado' };
  const t = all[tidx];
  const teams = t.teams.map(tm => {
    if (tm.id !== teamId) return tm;
    if (target === 'both') return { ...tm, status: 'unassigned' as const, categoryId: '', reviewPlayer: undefined };
    return { ...tm, status: 'partial_review' as const, reviewPlayer: target };
  });
  _store.persist(all.map((t2, i) => i === tidx ? { ...t2, teams } : t2));
  return { ok: true };
}

/**
 * Resolve a team's review status back to 'confirmed'.
 * If the team was unassigned, pass the new categoryId to reassign it.
 */
export async function resolveTeamReview(
  tournamentId: string,
  teamId: string,
  categoryId?: string,
): Promise<{ ok: boolean; error?: string }> {
  if (isSupabaseConfigured && supabase) {
    const update: Record<string, unknown> = { status: 'confirmed', review_player: null };
    if (categoryId) update.category_id = categoryId;
    const { error } = await supabase
      .from('personalizado_teams')
      .update(update)
      .eq('id', teamId)
      .eq('tournament_id', tournamentId);
    if (error) return { ok: false, error: error.message };
    return { ok: true };
  }
  // localStorage fallback
  const all = _store.load();
  const tidx = all.findIndex(t => t.id === tournamentId);
  if (tidx === -1) return { ok: false, error: 'Torneo no encontrado' };
  const t = all[tidx];
  const teams = t.teams.map(tm => {
    if (tm.id !== teamId) return tm;
    return { ...tm, status: 'confirmed' as const, reviewPlayer: undefined, categoryId: categoryId ?? tm.categoryId };
  });
  _store.persist(all.map((t2, i) => i === tidx ? { ...t2, teams } : t2));
  return { ok: true };
}

/**
 * Replace a team's reviewed player with a new one, restoring the team to
 * 'confirmed' status and clearing the review flag.
 */
export async function replaceTeamPartner(
  tournamentId: string,
  teamId: string,
  reviewPlayer: 'player1' | 'player2',
  newPlayer: { name: string; email?: string; id?: string },
): Promise<{ ok: boolean; error?: string }> {
  const update: Record<string, unknown> = {
    status: 'confirmed',
    review_player: null,
  };
  if (reviewPlayer === 'player1') {
    update.player1_name = newPlayer.name;
    update.player1_email = newPlayer.email ?? null;
    update.player1_id = newPlayer.id ?? null;
  } else {
    update.player2_name = newPlayer.name;
    update.player2_email = newPlayer.email ?? null;
    update.player2_id = newPlayer.id ?? null;
  }

  if (isSupabaseConfigured && supabase) {
    const { error } = await supabase
      .from('personalizado_teams')
      .update(update)
      .eq('id', teamId)
      .eq('tournament_id', tournamentId);
    if (error) return { ok: false, error: error.message };
    return { ok: true };
  }
  // localStorage fallback
  const all = _store.load();
  const tidx = all.findIndex(t => t.id === tournamentId);
  if (tidx === -1) return { ok: false, error: 'Torneo no encontrado' };
  const t = all[tidx];
  const teams = t.teams.map(tm => {
    if (tm.id !== teamId) return tm;
    const base = { ...tm, status: 'confirmed' as const, reviewPlayer: undefined };
    if (reviewPlayer === 'player1') return { ...base, player1Name: newPlayer.name, player1Email: newPlayer.email, player1Id: newPlayer.id };
    return { ...base, player2Name: newPlayer.name, player2Email: newPlayer.email, player2Id: newPlayer.id };
  });
  _store.persist(all.map((t2, i) => i === tidx ? { ...t2, teams } : t2));
  return { ok: true };
}

/**
 * Move a team to a different category (or to the unassigned pool when
 * newCategoryId is null). Automatically adjusts status:
 *   - to null  → 'unassigned'
 *   - from null → 'confirmed' (clears review flags)
 *   - otherwise → keeps existing status (partial_review stays partial_review)
 */
export async function moveTeamToCategory(
  tournamentId: string,
  teamId: string,
  newCategoryId: string | null,
  currentStatus?: PersonalizadoTeam['status'],
): Promise<{ ok: boolean; error?: string }> {
  const update: Record<string, unknown> = { category_id: newCategoryId };
  if (newCategoryId === null) {
    update.status = 'unassigned';
    update.review_player = null;
  } else if (currentStatus === 'unassigned') {
    update.status = 'confirmed';
    update.review_player = null;
  }

  if (isSupabaseConfigured && supabase) {
    const { error } = await supabase
      .from('personalizado_teams')
      .update(update)
      .eq('id', teamId)
      .eq('tournament_id', tournamentId);
    if (error) return { ok: false, error: error.message };
    return { ok: true };
  }
  // localStorage fallback
  const all = _store.load();
  const tidx = all.findIndex(t => t.id === tournamentId);
  if (tidx === -1) return { ok: false, error: 'Torneo no encontrado' };
  const t = all[tidx];
  const teams = t.teams.map(tm => {
    if (tm.id !== teamId) return tm;
    const newStatus = newCategoryId === null
      ? 'unassigned' as const
      : currentStatus === 'unassigned' ? 'confirmed' as const : tm.status;
    return { ...tm, categoryId: newCategoryId ?? '', status: newStatus, reviewPlayer: update.review_player === null ? undefined : tm.reviewPlayer };
  });
  _store.persist(all.map((t2, i) => i === tidx ? { ...t2, teams } : t2));
  return { ok: true };
}

// ── Remove from local cache ────────────────────────────────────────────────────

export function removePersonalizado(id: string): void {
  _store.persist(_store.load().filter(t => t.id !== id));
}

// ── Calendar generation (multi-day group-stage schedule + bracket) ────────────

const GROUP_LETTERS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';

// Calendar grid step and the mandatory rest between consecutive matches on the same court.
// A match occupies its play span (rounded up to the grid step); the next match on that court
// starts one full "pitch" later (play span + gap), so games never overlap and always keep ≥15min.
export const SCHEDULE_GRID_MIN = 15;
export const SCHEDULE_GAP_MIN = 15;
/** Minutes a match visually occupies: its duration rounded up to the 15-min grid. */
export function matchPlaySpan(matchDurationMin: number): number {
  return Math.ceil(Math.max(SCHEDULE_GRID_MIN, matchDurationMin) / SCHEDULE_GRID_MIN) * SCHEDULE_GRID_MIN;
}
/** Minutes between the start of one match and the next on the same court (play span + rest gap). */
export function matchPitch(matchDurationMin: number): number {
  return matchPlaySpan(matchDurationMin) + SCHEDULE_GAP_MIN;
}

function fmtMinutes(total: number): string {
  const capped = Math.min(Math.max(total, 0), 23 * 60 + 59);
  const h = Math.floor(capped / 60), m = capped % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

function parseMinutes(hhmm: string): number {
  const [h, m] = (hhmm || '0:0').split(':').map(Number);
  return (h || 0) * 60 + (m || 0);
}

function enumerateDates(start: string, end?: string): string[] {
  const startStr = start || new Date().toISOString().slice(0, 10);
  const endStr = end || startStr;
  const s = new Date(`${startStr}T00:00:00`);
  const e = new Date(`${endStr}T00:00:00`);
  if (Number.isNaN(s.getTime())) return [startStr];
  const last = !Number.isNaN(e.getTime()) && e.getTime() >= s.getTime() ? e : s;
  const out: string[] = [];
  for (const d = new Date(s); d.getTime() <= last.getTime(); d.setDate(d.getDate() + 1)) {
    out.push(d.toISOString().slice(0, 10));
  }
  return out.length > 0 ? out : [startStr];
}

/** Smallest power of two ≥ n (so the elimination bracket is always balanced). */
export function nextPowerOfTwo(n: number): number {
  if (n <= 1) return n <= 0 ? 0 : 1;
  return Math.pow(2, Math.ceil(Math.log2(n)));
}

/** New groupCount → recalculated teamsPerGroup, keeping maxTeams fixed. */
export function teamsPerGroupFromCount(maxTeams: number, groupCount: number): number {
  return Math.max(2, Math.ceil(maxTeams / Math.max(1, groupCount)));
}

/** New teamsPerGroup → recalculated groupCount, keeping maxTeams fixed. */
export function groupCountFromTeamsPerGroup(maxTeams: number, teamsPerGroup: number): number {
  return Math.max(1, Math.ceil(maxTeams / Math.max(2, teamsPerGroup)));
}

function categoryBracketMatchCount(qualifiers: number): number {
  if (qualifiers < 2) return 0;
  const size = nextPowerOfTwo(qualifiers);
  return (size - 1) + (size >= 4 ? 1 : 0); // knockout matches + 3rd-place game
}

/** Round-robin pairings (circle method). Returns rounds of [a, b] pairs. */
function roundRobinRounds(ids: string[]): [string, string][][] {
  const teams = [...ids];
  if (teams.length < 2) return [];
  if (teams.length % 2 === 1) teams.push('__BYE__');
  const n = teams.length;
  const rounds: [string, string][][] = [];
  for (let r = 0; r < n - 1; r++) {
    const round: [string, string][] = [];
    for (let i = 0; i < n / 2; i++) {
      const a = teams[i], b = teams[n - 1 - i];
      if (a !== '__BYE__' && b !== '__BYE__') round.push([a, b]);
    }
    rounds.push(round);
    // rotate, keeping the first team fixed
    teams.splice(1, 0, teams.pop()!);
  }
  return rounds;
}

export interface TournamentDayEstimate {
  totalMatches: number;
  matchesPerDay: number;
  days: number;
  suggestedEndDate: string;
}

/**
 * Estimate how many days the tournament needs (group stage + elimination bracket, all
 * categories) given the current courts/hours/match-duration config, and suggest an end date
 * starting from the tournament's start date. Purely a planning aid — the organizer can
 * override `schedule.endDate` freely.
 */
export function estimateTournamentDays(
  tournament: PersonalizadoTournament,
  config: ControlPanelConfig,
): TournamentDayEstimate {
  const courts = Math.max(1, config.courtNames.length || tournament.courts || 1);
  const start = parseMinutes(config.schedule.startTime || '09:00');
  const end = parseMinutes(config.schedule.endTime || '21:00');
  const lunch = config.schedule.lunchEnabled ? (config.schedule.lunchDurationMin ?? 0) : 0;
  const matchDur = Math.max(10, config.schedule.matchDurationMin || 50);
  const dailyMinutes = Math.max(0, end - start - lunch);
  const slotsPerDay = Math.max(1, Math.floor(dailyMinutes / matchDur));
  const matchesPerDay = slotsPerDay * courts;

  let totalMatches = 0;
  for (const cat of tournament.categories) {
    const g = config.groups.find(x => x.categoryId === cat.id);
    const groups = Math.max(1, g?.groupCount ?? 1);
    const perGroup = Math.max(2, g?.teamsPerGroup ?? cat.maxTeams);
    totalMatches += groups * (perGroup * (perGroup - 1)) / 2;
    totalMatches += categoryBracketMatchCount(groups * (g?.qualifyPerGroup ?? 0));
  }

  const days = Math.max(1, Math.ceil(totalMatches / matchesPerDay));
  const startDate = tournament.date || new Date().toISOString().slice(0, 10);
  const endDateObj = new Date(`${startDate}T00:00:00`);
  endDateObj.setDate(endDateObj.getDate() + (days - 1));
  return { totalMatches, matchesPerDay, days, suggestedEndDate: endDateObj.toISOString().slice(0, 10) };
}

// ── Tournament-wide analysis (planning aid shown before generating the calendar) ──

export interface CategoryAnalysis {
  categoryId: string;
  categoryName: string;
  groups: number;
  teams: number;
  groupMatches: number;       // round-robin matches across all groups
  bracketMatches: number;     // knockout matches (+ 3rd place)
  totalMatches: number;
  qualifiers: number;         // teams advancing to the bracket
  bracketSize: number;        // padded to next power of two
}

export interface TournamentAnalysis {
  perCategory: CategoryAnalysis[];
  groupMatches: number;
  bracketMatches: number;
  totalMatches: number;
  courts: number;
  slotsPerDay: number;
  matchesPerDay: number;
  matchDurationMin: number;
  days: number;
  startDate: string;
  endDate: string;
  feasible: boolean;          // does it fit within the configured days?
  capacityMatches: number;    // total slots × courts across the configured days
  allGroupsReady: boolean;    // every category has its teams assigned to groups
}

/** Are all enrolled teams in a category assigned to a group? (needed before generating.) */
export function categoryGroupsReady(tournament: PersonalizadoTournament, categoryId: string): boolean {
  const teams = tournament.teams.filter(
    tm => tm.categoryId === categoryId && (tm.status === 'pending' || tm.status === 'confirmed'),
  );
  if (teams.length < 2) return false;
  return teams.every(tm => !!tm.groupId);
}

/**
 * Full tournament breakdown: per-category group/bracket match counts, total games, estimated
 * duration in days, and a feasibility flag against the configured courts/hours. Drives the
 * analysis card the organizer sees before pressing "Generar Calendario".
 */
export function analyzeTournament(
  tournament: PersonalizadoTournament,
  config: ControlPanelConfig,
): TournamentAnalysis {
  const courts = Math.max(1, config.courtNames.length || tournament.courts || 1);
  const start = parseMinutes(config.schedule.startTime || '09:00');
  const end = parseMinutes(config.schedule.endTime || '21:00');
  const lunch = config.schedule.lunchEnabled ? (config.schedule.lunchDurationMin ?? 0) : 0;
  const matchDur = Math.max(10, config.schedule.matchDurationMin || 50);
  const slotsPerDay = Math.max(1, Math.floor(Math.max(0, end - start - lunch) / matchDur));
  const matchesPerDay = slotsPerDay * courts;

  const perCategory: CategoryAnalysis[] = [];
  let groupMatchesTotal = 0;
  let bracketMatchesTotal = 0;

  for (const cat of tournament.categories) {
    const g = config.groups.find(x => x.categoryId === cat.id);
    const groups = Math.max(1, g?.groupCount ?? 1);
    const teams = tournament.teams.filter(
      tm => tm.categoryId === cat.id && (tm.status === 'pending' || tm.status === 'confirmed'),
    ).length;
    // round-robin matches per group, summed (uses actual teams per group when available)
    const byGroup = new Map<string, number>();
    for (const tm of tournament.teams) {
      if (tm.categoryId !== cat.id || !tm.groupId) continue;
      if (tm.status !== 'pending' && tm.status !== 'confirmed') continue;
      byGroup.set(tm.groupId, (byGroup.get(tm.groupId) ?? 0) + 1);
    }
    let groupMatches = 0;
    if (byGroup.size > 0) {
      for (const n of byGroup.values()) groupMatches += (n * (n - 1)) / 2;
    } else {
      const perGroup = Math.max(2, g?.teamsPerGroup ?? cat.maxTeams);
      groupMatches = groups * (perGroup * (perGroup - 1)) / 2;
    }
    const qualifiers = groups * (g?.qualifyPerGroup ?? 2);
    const bracketSize = nextPowerOfTwo(qualifiers);
    const bracketMatches = categoryBracketMatchCount(qualifiers);
    const totalMatches = groupMatches + bracketMatches;
    groupMatchesTotal += groupMatches;
    bracketMatchesTotal += bracketMatches;
    perCategory.push({
      categoryId: cat.id, categoryName: cat.name, groups, teams,
      groupMatches, bracketMatches, totalMatches, qualifiers, bracketSize,
    });
  }

  const totalMatches = groupMatchesTotal + bracketMatchesTotal;
  const days = enumerateDates(tournament.date, config.schedule.endDate || tournament.date);
  const capacityMatches = matchesPerDay * days.length;
  return {
    perCategory,
    groupMatches: groupMatchesTotal,
    bracketMatches: bracketMatchesTotal,
    totalMatches,
    courts, slotsPerDay, matchesPerDay, matchDurationMin: matchDur,
    days: days.length,
    startDate: days[0],
    endDate: days[days.length - 1],
    feasible: totalMatches <= capacityMatches,
    capacityMatches,
    allGroupsReady: tournament.categories.every(c => categoryGroupsReady(tournament, c.id)),
  };
}

// ── Qualified-teams consolidated table (group label + position) ───────────────

export interface QualifiedRow {
  teamId: string;
  seed: number;          // 1 = best overall
  groupLabel: string;    // "A", "B"…
  groupPosition: number; // 1 = winner of the group, 2 = runner-up…
  wildcard: boolean;     // filled a balancing slot (best third, etc.)
  positionLabel: string; // "1ero Grupo A", "2do Grupo B", "Mejor 3ro Grupo C"
}

const ORDINAL_ES = ['', '1ero', '2do', '3ro', '4to', '5to', '6to', '7mo', '8vo'];
function ordinalEs(n: number): string { return ORDINAL_ES[n] ?? `${n}º`; }

function groupLabelFromId(groupId: string): string {
  const n = parseInt(groupId.split('-G')[1] ?? '1', 10);
  return GROUP_LETTERS[(n - 1) % GROUP_LETTERS.length] ?? String(n);
}

/**
 * The consolidated list of teams that advance to the elimination phase for a category, each
 * annotated with its group, its position within that group, and whether it qualified directly
 * or as a balancing "best third". Sorted by overall seed (best first).
 */
export function computeQualifiedTable(tournament: PersonalizadoTournament, categoryId: string): QualifiedRow[] {
  const qualifiers = computeQualifiers(tournament, categoryId);
  if (qualifiers.length === 0) return [];

  // Map each team → { groupLabel, positionWithinGroup }
  const groupIds = [...new Set(
    tournament.teams.filter(tm => tm.categoryId === categoryId && tm.groupId).map(tm => tm.groupId!),
  )];
  const posInGroup = new Map<string, { label: string; pos: number }>();
  for (const gid of groupIds) {
    const standings = calculateGroupStandings(tournament, categoryId, gid);
    standings.forEach((s, i) => posInGroup.set(s.teamId, { label: groupLabelFromId(gid), pos: i + 1 }));
  }

  return qualifiers.map(q => {
    const info = posInGroup.get(q.teamId) ?? { label: '?', pos: 0 };
    const positionLabel = q.wildcard
      ? `Mejor ${ordinalEs(info.pos)} Grupo ${info.label}`
      : `${ordinalEs(info.pos)} Grupo ${info.label}`;
    return {
      teamId: q.teamId, seed: q.seed, groupLabel: info.label, groupPosition: info.pos,
      wildcard: q.wildcard, positionLabel,
    };
  });
}

/** Target bracket size for a category from config (groups × qualifyPerGroup, padded to 2^n). */
export function bracketSizeForCategory(tournament: PersonalizadoTournament, categoryId: string): number {
  const g = tournament.config?.groups.find(x => x.categoryId === categoryId);
  const groupIds = [...new Set(
    tournament.teams.filter(tm => tm.categoryId === categoryId && tm.groupId).map(tm => tm.groupId!),
  )];
  const groups = groupIds.length || Math.max(1, g?.groupCount ?? 1);
  const qualifiers = groups * (g?.qualifyPerGroup ?? 2);
  return nextPowerOfTwo(qualifiers);
}

/**
 * Build the bracket *structure* with position-label placeholders ("1ero Grupo A", "2do Grupo B")
 * so it can be shown before any group game is played. No team ids are assigned — those fill in via
 * generateBracket once results exist. Round 0 is seeded so group winners meet runners-up from a
 * different group (1A v 2B style). Returns [] if the category has fewer than 2 qualifiers.
 */
export function generateBracketSkeleton(tournament: PersonalizadoTournament, categoryId: string): BracketMatch[] {
  const g = tournament.config?.groups.find(x => x.categoryId === categoryId);
  const groupIds = [...new Set(
    tournament.teams.filter(tm => tm.categoryId === categoryId && tm.groupId).map(tm => tm.groupId!),
  )].sort((a, b) => (parseInt(a.split('-G')[1] ?? '0') - parseInt(b.split('-G')[1] ?? '0')));
  const groups = groupIds.length || Math.max(1, g?.groupCount ?? 1);
  const Q = Math.max(1, g?.qualifyPerGroup ?? 2);

  // Seed labels ordered by position then group: all 1st places, then all 2nd places, …
  const labels: string[] = [];
  for (let pos = 1; pos <= Q; pos++) {
    for (let gi = 0; gi < groups; gi++) {
      const label = GROUP_LETTERS[gi % GROUP_LETTERS.length];
      labels.push(`${ordinalEs(pos)} Grupo ${label}`);
    }
  }
  const size = nextPowerOfTwo(labels.length);
  if (size < 2) return [];
  while (labels.length < size) labels.push('—');

  const out: BracketMatch[] = [];
  let matchesInRound = size / 2;
  for (let i = 0; i < matchesInRound; i++) {
    out.push({
      id: `b-${categoryId}-r0-${i}`, categoryId, round: 0,
      roundLabel: BRACKET_ROUND_LABELS[size] ?? `Ronda de ${size}`,
      slotIndex: i, placeholderA: labels[i], placeholderB: labels[size - 1 - i], status: 'pending',
    });
  }
  let round = 1; matchesInRound = matchesInRound / 2; let finalRound = 0;
  while (matchesInRound >= 1) {
    const roundSize = matchesInRound * 2;
    const label = roundSize === 2 ? 'Final' : (BRACKET_ROUND_LABELS[roundSize] ?? `Ronda de ${roundSize}`);
    for (let i = 0; i < matchesInRound; i++) {
      out.push({ id: `b-${categoryId}-r${round}-${i}`, categoryId, round, roundLabel: label, slotIndex: i, status: 'pending' });
    }
    finalRound = round; round++; matchesInRound = matchesInRound / 2;
  }
  if (size >= 4) out.push({ id: `b-${categoryId}-3rd`, categoryId, round: finalRound, roundLabel: '3er Puesto', slotIndex: 1, status: 'pending' });
  return out;
}

// ── Live bracket resolution (positions → teams as groups are confirmed) ─────────

interface BracketSlotSource {
  groupId?: string;
  pos?: number;     // 1-based finishing position within the group
  label: string;    // placeholder label shown until the team is revealed ("1ero Grupo A")
  bye?: boolean;
}

/**
 * Deterministic round-0 seeding sources for a category, in the SAME order as
 * generateBracketSkeleton's labels (all 1st places by group, then all 2nd places, …), padded
 * with byes up to the next power of two. Round-0 match `i` draws side A from `sources[i]` and
 * side B from `sources[size - 1 - i]`.
 */
function bracketSlotSources(
  tournament: PersonalizadoTournament,
  categoryId: string,
): { sources: BracketSlotSource[]; size: number } | null {
  const g = tournament.config?.groups.find(x => x.categoryId === categoryId);
  const groupIds = [...new Set(
    tournament.teams.filter(tm => tm.categoryId === categoryId && tm.groupId).map(tm => tm.groupId!),
  )].sort((a, b) => (parseInt(a.split('-G')[1] ?? '0') - parseInt(b.split('-G')[1] ?? '0')));
  const groups = groupIds.length || Math.max(1, g?.groupCount ?? 1);
  const Q = Math.max(1, g?.qualifyPerGroup ?? 2);

  const sources: BracketSlotSource[] = [];
  for (let pos = 1; pos <= Q; pos++) {
    for (let gi = 0; gi < groups; gi++) {
      const groupId = groupIds[gi];
      const label = GROUP_LETTERS[gi % GROUP_LETTERS.length];
      sources.push({ groupId, pos, label: `${ordinalEs(pos)} Grupo ${label}` });
    }
  }
  const size = nextPowerOfTwo(sources.length);
  if (size < 2) return null;
  while (sources.length < size) sources.push({ label: '—', bye: true });
  return { sources, size };
}

/** True when this group's classification has been confirmed (its qualifiers released to bracket). */
export function isGroupConfirmed(
  config: ControlPanelConfig | undefined,
  categoryId: string,
  groupId: string,
): boolean {
  return (config?.confirmedGroups ?? []).includes(`${categoryId}:${groupId}`);
}

/**
 * Fill round-0 bracket slots with the real qualified teams for every group that has been
 * confirmed; slots whose source group is not yet confirmed keep their position placeholder
 * ("1ero Grupo A") and no team id. Pure: returns a new bracketMatches array. Later rounds are
 * left untouched (they are filled by saveBracketResult as earlier rounds finish).
 */
export function resolveBracketTeams(
  tournament: PersonalizadoTournament,
  confirmedGroups: string[],
  bracketMatches: BracketMatch[],
): BracketMatch[] {
  const confirmed = new Set(confirmedGroups);
  const srcCache = new Map<string, ReturnType<typeof bracketSlotSources>>();
  const standCache = new Map<string, TeamStanding[]>();

  const reveal = (categoryId: string, src: BracketSlotSource | undefined): { teamId?: string; label: string } => {
    if (!src || src.bye || !src.groupId || src.pos === undefined) return { teamId: undefined, label: src?.label ?? '—' };
    if (!confirmed.has(`${categoryId}:${src.groupId}`)) return { teamId: undefined, label: src.label };
    const ck = `${categoryId}:${src.groupId}`;
    let st = standCache.get(ck);
    if (!st) { st = calculateGroupStandings(tournament, categoryId, src.groupId); standCache.set(ck, st); }
    return { teamId: st[src.pos - 1]?.teamId, label: src.label };
  };

  return bracketMatches.map(m => {
    if (m.round !== 0) return m;
    let info = srcCache.get(m.categoryId);
    if (info === undefined) { info = bracketSlotSources(tournament, m.categoryId); srcCache.set(m.categoryId, info); }
    if (!info) return m;
    const a = reveal(m.categoryId, info.sources[m.slotIndex]);
    const b = reveal(m.categoryId, info.sources[info.size - 1 - m.slotIndex]);
    return { ...m, teamAId: a.teamId, teamBId: b.teamId, placeholderA: a.label, placeholderB: b.label };
  });
}

/**
 * Generate the group-stage match schedule from the control-panel config and the teams' group
 * assignments, spread across every day of the tournament (start date → schedule.endDate).
 * Within a category, round-robin rounds across its groups are mapped proportionally onto the
 * available days — this keeps every category progressing in lockstep day to day (so none
 * reaches the elimination phase far ahead of another) and leaves the later days free for the
 * bracket. Within each day, categories are ordered by `level` (novices first); matches are
 * list-scheduled across courts and time slots honoring the lunch break and the daily cutoff
 * (schedule.endTime) — anything that doesn't fit spills into the next day.
 */
export function generateGroupSchedule(t: PersonalizadoTournament): PersonalizadoMatch[] {
  const cfg = t.config;
  if (!cfg) return [];
  const courts = (cfg.courtNames && cfg.courtNames.length > 0)
    ? cfg.courtNames
    : Array.from({ length: Math.max(1, t.courts || 1) }, (_, i) => `Cancha ${i + 1}`);

  const assignable = t.teams.filter(tm => tm.status === 'pending' || tm.status === 'confirmed');
  const days = enumerateDates(t.date, cfg.schedule.endDate || t.date);
  const categoriesByLevel = [...t.categories].sort((a, b) => (a.level ?? 0) - (b.level ?? 0));

  type Pair = { categoryId: string; groupId: string; groupLabel: string; a: string; b: string };

  // Build all category rounds first so we can compute the minimum classification days needed.
  interface CatRoundList { catId: string; rounds: Pair[][] }
  const allCatRounds: CatRoundList[] = [];
  let totalPairs = 0;

  for (const cat of categoriesByLevel) {
    const byGroup = new Map<string, string[]>();
    for (const tm of assignable) {
      if (tm.categoryId !== cat.id || !tm.groupId) continue;
      const arr = byGroup.get(tm.groupId) ?? [];
      arr.push(tm.id);
      byGroup.set(tm.groupId, arr);
    }
    const perGroupRounds = new Map<string, [string, string][][]>();
    let maxRounds = 0;
    for (const [gid, ids] of byGroup) {
      const r = roundRobinRounds(ids);
      perGroupRounds.set(gid, r);
      maxRounds = Math.max(maxRounds, r.length);
    }
    if (maxRounds === 0) continue;

    const catRounds: Pair[][] = [];
    for (let r = 0; r < maxRounds; r++) {
      const roundPairs: Pair[] = [];
      for (const [gid, rounds] of perGroupRounds) {
        const n = parseInt(gid.split('-G')[1] ?? '1', 10);
        const label = GROUP_LETTERS[(n - 1) % GROUP_LETTERS.length] ?? String(n);
        for (const [a, b] of rounds[r] ?? []) roundPairs.push({ categoryId: cat.id, groupId: gid, groupLabel: label, a, b });
      }
      if (roundPairs.length > 0) { catRounds.push(roundPairs); totalPairs += roundPairs.length; }
    }
    allCatRounds.push({ catId: cat.id, rounds: catRounds });
  }

  // Schedule parameters
  const matchDur = Math.max(10, cfg.schedule.matchDurationMin || 50);
  // Consecutive matches on a court start one "pitch" apart (play span + 15-min rest) so they
  // never overlap on the grid and always keep a ≥15-min gap between games.
  const pitch = matchPitch(matchDur);
  const lunchEnabled = cfg.schedule.lunchEnabled;
  const lunchStart = parseMinutes(cfg.schedule.lunchStart ?? '13:00');
  const lunchDur = cfg.schedule.lunchDurationMin ?? 0;
  const dayStartMinutes = parseMinutes(cfg.schedule.startTime || '09:00');
  const dayEndMinutes = parseMinutes(cfg.schedule.endTime || '23:59');

  // Compute minimum days to fit all classification matches, reserving ≥1 day for elimination.
  // This prevents classification and elimination from sharing the same day.
  const effectiveMinutesPerDay = Math.max(pitch,
    (dayEndMinutes - dayStartMinutes) - (lunchEnabled ? lunchDur : 0));
  // The last slot of a day needs no trailing gap, so add one gap back before dividing by pitch.
  const slotsPerDay = Math.max(1, Math.floor((effectiveMinutesPerDay + SCHEDULE_GAP_MIN) / pitch));
  const slotsNeeded = Math.ceil(totalPairs / Math.max(1, courts.length));
  const minDaysForCapacity = Math.max(1, Math.ceil(slotsNeeded / slotsPerDay));
  const minClassDays = days.length > 1
    ? Math.min(minDaysForCapacity, days.length - 1)
    : 1;
  const classDays = days.slice(0, minClassDays);

  // Map each category's rounds proportionally onto classDays.
  // Because allCatRounds is already in level-ascending order, lower-level (novice) categories'
  // matches get added to byDay first and fill morning slots during list-scheduling.
  const byDay = new Map<string, Pair[]>();
  for (const day of classDays) byDay.set(day, []);

  const levelMap = new Map(categoriesByLevel.map((c, i) => [c.id, i]));
  for (const { rounds: catRounds } of allCatRounds) {
    const R = catRounds.length;
    catRounds.forEach((pairs, r) => {
      const dayIdx = Math.min(classDays.length - 1, Math.floor((r * classDays.length) / R));
      byDay.get(classDays[dayIdx])!.push(...pairs);
    });
  }

  // List-schedule each classification day's pending pairs into slots × courts.
  const out: PersonalizadoMatch[] = [];
  let carry: Pair[] = [];

  for (let di = 0; di < classDays.length; di++) {
    const day = classDays[di];
    // Sort: novice categories (lower level index) fill morning slots first.
    const remaining = [
      ...carry,
      ...(byDay.get(day) ?? []),
    ].sort((a, b) => (levelMap.get(a.categoryId) ?? 0) - (levelMap.get(b.categoryId) ?? 0));
    carry = [];
    let slotTime = dayStartMinutes;
    let lunchTaken = !lunchEnabled;
    const isLastClassDay = di === classDays.length - 1;
    let daySlotIndex = 0;

    while (remaining.length > 0) {
      if (!lunchTaken && slotTime >= lunchStart) { slotTime += lunchDur; lunchTaken = true; }
      if (!isLastClassDay && slotTime > dayEndMinutes) { carry.push(...remaining.splice(0)); break; }
      const busy = new Set<string>();
      let courtsUsed = 0;
      for (let i = 0; i < remaining.length && courtsUsed < courts.length; ) {
        const m = remaining[i];
        if (!busy.has(m.a) && !busy.has(m.b)) {
          out.push({
            id: `m-${day}-${m.groupId}-${m.a}-${m.b}`,
            categoryId: m.categoryId, groupId: m.groupId, groupLabel: m.groupLabel, phase: 'group',
            day, slot: daySlotIndex, time: fmtMinutes(slotTime), courtName: courts[courtsUsed],
            teamAId: m.a, teamBId: m.b, status: 'scheduled',
          });
          busy.add(m.a); busy.add(m.b);
          courtsUsed++;
          remaining.splice(i, 1);
        } else {
          i++;
        }
      }
      slotTime += pitch;
      daySlotIndex++;
      if (daySlotIndex > 200) break; // safety
    }
  }
  return out;
}

// ── Control panel save (config + maxTeams + group assignments) ────────────────

export interface SaveControlPanelInput {
  id: string;
  categories: PersonalizadoCategory[];
  config: ControlPanelConfig;
  status?: PersonalizadoTournament['status'];
  groupAssignments?: Record<string, string | null>;
  date?: string;
  time?: string;
  // id of the user requesting the save — verified server-side against creator/co-creators
  requesterId?: string;
}

export interface SaveControlPanelResult {
  ok: boolean;
  error?: string;
  teams?: PersonalizadoTeam[];
}

/**
 * Persist control-panel state. Prefers the API route (so the waitlist is
 * reconciled server-side when maxTeams changes). Falls back to a synchronous
 * localStorage write when Supabase isn't configured.
 */
export async function saveControlPanel(input: SaveControlPanelInput): Promise<SaveControlPanelResult> {
  if (isSupabaseConfigured) {
    try {
      const res = await fetch('/api/personalizado/save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(input),
      });
      if (res.ok) return (await res.json()) as SaveControlPanelResult;
      const json = await res.json().catch(() => ({})) as { error?: string };
      // 4xx = input problem, surface the error; 5xx = connectivity, fall back
      if (res.status < 500) return { ok: false, error: json.error ?? 'No se pudo guardar' };
    } catch {
      // network error — fall through to localStorage
    }
  }
  return saveControlPanelLocal(input);
}

/** Synchronous localStorage control-panel save with waitlist reconciliation. */
export function saveControlPanelLocal(input: SaveControlPanelInput): SaveControlPanelResult {
  const t = getPersonalizado(input.id);
  if (!t) return { ok: false, error: 'Torneo no encontrado' };

  let teams = t.teams.map(tm =>
    input.groupAssignments && tm.id in input.groupAssignments
      ? { ...tm, groupId: input.groupAssignments[tm.id] ?? undefined }
      : tm
  );

  // Reconcile waitlist per category against (possibly new) maxTeams.
  for (const cat of input.categories) {
    let enrolled = teams.filter(tm => tm.categoryId === cat.id && (tm.status === 'pending' || tm.status === 'confirmed')).length;
    if (enrolled >= cat.maxTeams) continue;
    const waiting = teams
      .filter(tm => tm.categoryId === cat.id && tm.status === 'waitlisted')
      .sort((a, b) => a.registeredAt.localeCompare(b.registeredAt));
    for (const w of waiting) {
      if (enrolled >= cat.maxTeams) break;
      teams = teams.map(tm => tm.id === w.id ? { ...tm, status: 'pending' as const } : tm);
      enrolled++;
    }
  }

  savePersonalizado({
    ...t,
    categories: input.categories,
    config: input.config,
    status: input.status ?? t.status,
    date: input.date ?? t.date,
    time: input.time ?? t.time,
    teams,
  });
  return { ok: true, teams };
}

// ── Match result save (atomic via API route, localStorage fallback) ───────────

export interface SaveMatchResultInput {
  tournamentId: string;
  matchId: string;
  result: MatchResult;
}

export async function saveMatchResult(input: SaveMatchResultInput): Promise<{ ok: boolean; error?: string }> {
  if (isSupabaseConfigured) {
    try {
      const res = await fetch('/api/personalizado/match-result', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(input),
      });
      if (res.ok) return { ok: true };
      // Fall through to localStorage on any API failure (tournament may not exist
      // in Supabase yet when working in local/dev mode)
    } catch {
      // network error — fall through to localStorage
    }
  }
  return saveMatchResultLocal(input);
}

export function saveMatchResultLocal(input: SaveMatchResultInput): { ok: boolean; error?: string } {
  const t = getPersonalizado(input.tournamentId);
  if (!t || !t.config?.matches) return { ok: false, error: 'Torneo no encontrado' };
  const matches = t.config.matches.map(m =>
    m.id === input.matchId ? { ...m, result: input.result, status: 'done' as const } : m
  );
  savePersonalizado({ ...t, config: { ...t.config, matches } });
  return { ok: true };
}

// ── Standings calculation ─────────────────────────────────────────────────────

/**
 * Compute standings for one group within one category.
 * Tiebreaker order: Pts → +/− → JF (games in favour).
 */
export function calculateGroupStandings(
  tournament: PersonalizadoTournament,
  categoryId: string,
  groupId: string,
): TeamStanding[] {
  const cfg = tournament.config;
  const sp = cfg?.standingsPoints ?? { win: 3, draw: 1, loss: 0 };
  const ff = cfg?.forfeit ?? { winnerPoints: 3, winnerGamesFor: 0 };

  const groupTeams = tournament.teams.filter(
    tm => tm.categoryId === categoryId && tm.groupId === groupId &&
          (tm.status === 'pending' || tm.status === 'confirmed')
  );
  const standings = new Map<string, TeamStanding>();
  for (const tm of groupTeams) {
    standings.set(tm.id, { teamId: tm.id, pj: 0, pg: 0, pe: 0, pp: 0, jf: 0, jc: 0, diff: 0, pts: 0 });
  }

  const matches = (cfg?.matches ?? []).filter(
    m => m.categoryId === categoryId && m.groupId === groupId && m.result
  );

  for (const match of matches) {
    const res = match.result!;
    const rowA = standings.get(match.teamAId);
    const rowB = standings.get(match.teamBId);
    if (!rowA || !rowB) continue;

    rowA.pj++; rowB.pj++;

    if (res.walkover) {
      const winner = res.winnerId === match.teamAId ? rowA : rowB;
      const loser  = res.winnerId === match.teamAId ? rowB : rowA;
      winner.pg++; winner.pts += ff.winnerPoints; winner.jf += ff.winnerGamesFor;
      loser.pp++;
    } else {
      let sA = 0, sB = 0, gA = 0, gB = 0;
      for (const s of res.sets) {
        gA += s.a; gB += s.b;
        if (s.a > s.b) sA++; else if (s.b > s.a) sB++;
      }
      rowA.jf += gA; rowA.jc += gB; rowA.diff = rowA.jf - rowA.jc;
      rowB.jf += gB; rowB.jc += gA; rowB.diff = rowB.jf - rowB.jc;
      if (sA > sB) {
        rowA.pg++; rowA.pts += sp.win; rowB.pp++; rowB.pts += sp.loss;
      } else if (sB > sA) {
        rowB.pg++; rowB.pts += sp.win; rowA.pp++; rowA.pts += sp.loss;
      } else {
        rowA.pe++; rowA.pts += sp.draw; rowB.pe++; rowB.pts += sp.draw;
      }
    }
  }

  return [...standings.values()].sort((a, b) => {
    if (b.pts !== a.pts) return b.pts - a.pts;
    if (b.diff !== a.diff) return b.diff - a.diff;
    return b.jf - a.jf;
  });
}

/** Rank every team in a category across all of its groups (for cross-group wildcard fill). */
function rankTeamsInCategory(tournament: PersonalizadoTournament, categoryId: string): TeamStanding[] {
  const groupIds = [...new Set(
    tournament.teams.filter(tm => tm.categoryId === categoryId && tm.groupId).map(tm => tm.groupId!)
  )];
  const all = groupIds.flatMap(gid => calculateGroupStandings(tournament, categoryId, gid));
  return all.sort((a, b) => {
    if (b.pts !== a.pts) return b.pts - a.pts;
    if (b.diff !== a.diff) return b.diff - a.diff;
    return b.jf - a.jf;
  });
}

export interface QualifiedTeam {
  teamId: string;
  seed: number;       // 1 = best seed
  wildcard: boolean;  // filled a balancing slot rather than qualifying directly from its group
}

/**
 * Direct qualifiers = top N per group (config.groups[].qualifyPerGroup). If the total isn't a
 * power of two, the best-ranked non-qualified teams (by overall classification across the
 * category's groups) fill the remaining slots up to the next power of two, so the bracket is
 * always balanced (32 → 16 → 8 → 4 → 2).
 */
export function computeQualifiers(tournament: PersonalizadoTournament, categoryId: string): QualifiedTeam[] {
  const g = tournament.config?.groups.find(x => x.categoryId === categoryId);
  if (!g) return [];
  const groupIds = [...new Set(
    tournament.teams.filter(tm => tm.categoryId === categoryId && tm.groupId).map(tm => tm.groupId!)
  )];
  if (groupIds.length === 0) return [];

  const direct = new Set<string>();
  for (const gid of groupIds) {
    const standings = calculateGroupStandings(tournament, categoryId, gid);
    for (const s of standings.slice(0, g.qualifyPerGroup)) direct.add(s.teamId);
  }

  const target = nextPowerOfTwo(direct.size);
  const ranked = rankTeamsInCategory(tournament, categoryId);
  const wildcards = ranked.filter(s => !direct.has(s.teamId)).slice(0, Math.max(0, target - direct.size)).map(s => s.teamId);
  const wildcardSet = new Set(wildcards);

  const ordered = ranked.filter(s => direct.has(s.teamId) || wildcardSet.has(s.teamId)).map(s => s.teamId);
  return ordered.map((teamId, i) => ({ teamId, seed: i + 1, wildcard: wildcardSet.has(teamId) }));
}

/**
 * Build the full single-elimination bracket (+ 3rd-place match) for a category from its
 * qualified teams. Round 0 is seeded 1 vs N, 2 vs N−1, …; later rounds (including the 3rd-place
 * match, played alongside the final) are filled in as previous rounds are completed.
 */
export function generateBracket(tournament: PersonalizadoTournament, categoryId: string): BracketMatch[] {
  const qualifiers = computeQualifiers(tournament, categoryId);
  const size = qualifiers.length;
  if (size < 2) return [];

  const out: BracketMatch[] = [];
  let matchesInRound = size / 2;
  for (let i = 0; i < matchesInRound; i++) {
    const a = qualifiers[i];
    const b = qualifiers[size - 1 - i];
    out.push({
      id: `b-${categoryId}-r0-${i}`, categoryId, round: 0,
      roundLabel: BRACKET_ROUND_LABELS[size] ?? `Ronda de ${size}`,
      slotIndex: i, teamAId: a.teamId, teamBId: b.teamId,
      wildcardA: a.wildcard, wildcardB: b.wildcard, status: 'pending',
    });
  }

  let round = 1;
  matchesInRound = matchesInRound / 2;
  let finalRound = 0;
  while (matchesInRound >= 1) {
    const roundSize = matchesInRound * 2;
    const label = roundSize === 2 ? 'Final' : (BRACKET_ROUND_LABELS[roundSize] ?? `Ronda de ${roundSize}`);
    for (let i = 0; i < matchesInRound; i++) {
      out.push({ id: `b-${categoryId}-r${round}-${i}`, categoryId, round, roundLabel: label, slotIndex: i, status: 'pending' });
    }
    finalRound = round;
    round++;
    matchesInRound = matchesInRound / 2;
  }

  if (size >= 4) {
    out.push({ id: `b-${categoryId}-3rd`, categoryId, round: finalRound, roundLabel: '3er Puesto', slotIndex: 1, status: 'pending' });
  }
  return out;
}

/**
 * Place the (already generated) bracket rounds onto the calendar, starting the day after this
 * category's last group-stage match, biasing later rounds toward later times — so the final and
 * 3rd-place match land as close as possible to the tournament's closing date/time.
 */
export function scheduleBracket(tournament: PersonalizadoTournament, bracketMatches: BracketMatch[]): BracketMatch[] {
  const cfg = tournament.config;
  if (!cfg || bracketMatches.length === 0) return bracketMatches;
  const courts = (cfg.courtNames && cfg.courtNames.length > 0)
    ? cfg.courtNames
    : Array.from({ length: Math.max(1, tournament.courts || 1) }, (_, i) => `Cancha ${i + 1}`);
  const days = enumerateDates(tournament.date, cfg.schedule.endDate || tournament.date);
  const categoryId = bracketMatches[0].categoryId;

  const ownGroupDayIdxs = (cfg.matches ?? [])
    .filter(m => m.categoryId === categoryId)
    .map(m => days.indexOf(m.day))
    .filter(i => i >= 0);
  const lastGroupDayIdx = ownGroupDayIdxs.length > 0 ? Math.max(...ownGroupDayIdxs) : -1;
  const availableDays = days.slice(Math.min(days.length - 1, Math.max(0, lastGroupDayIdx + 1)));

  const totalRounds = Math.max(...bracketMatches.map(m => m.round)) + 1;
  const matchDur = Math.max(10, cfg.schedule.matchDurationMin || 50);
  const lunchEnabled = cfg.schedule.lunchEnabled;
  const lunchStart = parseMinutes(cfg.schedule.lunchStart ?? '13:00');
  const lunchDur = cfg.schedule.lunchDurationMin ?? 0;
  const dayStart = parseMinutes(cfg.schedule.startTime || '09:00');
  const dayEnd = parseMinutes(cfg.schedule.endTime || '21:00');

  return bracketMatches.map(m => {
    const dayIdx = Math.min(availableDays.length - 1, Math.floor((m.round * availableDays.length) / totalRounds));
    const day = availableDays[Math.max(0, dayIdx)] ?? days[days.length - 1];
    const fraction = totalRounds <= 1 ? 0 : m.round / (totalRounds - 1);
    let minutes = dayStart + Math.round(fraction * Math.max(0, dayEnd - matchDur - dayStart));
    if (lunchEnabled && minutes >= lunchStart) minutes += lunchDur;
    return {
      ...m, day, time: fmtMinutes(minutes), courtName: courts[m.slotIndex % courts.length],
      status: (m.status === 'pending' ? 'scheduled' : m.status) as BracketMatch['status'],
    };
  });
}

/**
 * Schedule ALL bracket matches for ALL categories together so that:
 * - Novice categories (ascending level) play earlier in the day; experienced categories play later
 * - All categories' matches in the same bracket round are grouped in level order
 * - Finals round: 3rd-place matches scheduled first (novice→experienced), Finals after
 * - The highest-level category's Final is the absolute last match of the tournament
 * - Slots are day-relative (0-based per day), matching generateGroupSchedule's convention
 */
export function scheduleAllBrackets(
  tournament: PersonalizadoTournament,
  allBracketMatches: BracketMatch[]
): BracketMatch[] {
  const cfg = tournament.config;
  if (!cfg || allBracketMatches.length === 0) return allBracketMatches;

  const courts = (cfg.courtNames && cfg.courtNames.length > 0)
    ? cfg.courtNames
    : Array.from({ length: Math.max(1, tournament.courts || 1) }, (_, i) => `Cancha ${i + 1}`);

  const days = enumerateDates(tournament.date, cfg.schedule.endDate || tournament.date);

  // Bracket starts the day after the last group-stage match day
  const groupDayIdxs = (cfg.matches ?? []).map(m => days.indexOf(m.day)).filter(i => i >= 0);
  const lastGroupDayIdx = groupDayIdxs.length > 0 ? Math.max(...groupDayIdxs) : -1;
  // Do NOT clamp to days.length-1: if classification fills all days, bracketDays becomes empty
  // and the function returns early. generateGroupSchedule already reserves ≥1 day for the bracket.
  const bracketStartIdx = lastGroupDayIdx + 1;
  const bracketDays = days.slice(bracketStartIdx);
  if (bracketDays.length === 0) return allBracketMatches;

  const matchDur = Math.max(10, cfg.schedule.matchDurationMin || 50);
  // Same pitch as classification: play span + 15-min rest between consecutive matches.
  const pitch = matchPitch(matchDur);
  const lunchEnabled = cfg.schedule.lunchEnabled;
  const lunchStart = parseMinutes(cfg.schedule.lunchStart ?? '13:00');
  const lunchDur = cfg.schedule.lunchDurationMin ?? 0;
  const dayStart = parseMinutes(cfg.schedule.startTime || '07:00');
  const dayEnd = parseMinutes(cfg.schedule.endTime || '22:00');

  // Sort categories novice → experienced (ascending level); highest-level cat's Final is last
  const categoriesSorted = [...tournament.categories].sort((a, b) => (a.level ?? 0) - (b.level ?? 0));
  const catIds = categoriesSorted.map(c => c.id);
  const catLevelIdx = new Map(categoriesSorted.map((c, i) => [c.id, i]));

  const rounds = [...new Set(allBracketMatches.map(m => m.round))].sort((a, b) => a - b);
  const finalRound = rounds.length > 0 ? Math.max(...rounds) : 0;

  // Build ordered "layers" — each layer is all matches that share the same round (and for
  // the final round, 3rd-place is one layer, Finals is a separate layer after).
  // Within each layer the matches are sorted by category level (ascending) so that the
  // mitad/mitad court assignment gives morning courts to novice categories.
  type Layer = BracketMatch[];
  const layers: Layer[] = [];
  for (const round of rounds) {
    if (round === finalRound) {
      // 3rd-place layer
      const thirdMs = allBracketMatches
        .filter(m => m.round === round && m.roundLabel === '3er Puesto')
        .sort((a, b) => (catLevelIdx.get(a.categoryId) ?? 0) - (catLevelIdx.get(b.categoryId) ?? 0));
      if (thirdMs.length > 0) layers.push(thirdMs);
      // Finals layer
      const finalsMs = allBracketMatches
        .filter(m => m.round === round && m.roundLabel !== '3er Puesto')
        .sort((a, b) => (catLevelIdx.get(a.categoryId) ?? 0) - (catLevelIdx.get(b.categoryId) ?? 0));
      if (finalsMs.length > 0) layers.push(finalsMs);
    } else {
      const ms = allBracketMatches
        .filter(m => m.round === round)
        .sort((a, b) => (catLevelIdx.get(a.categoryId) ?? 0) - (catLevelIdx.get(b.categoryId) ?? 0));
      if (ms.length > 0) layers.push(ms);
    }
  }

  if (layers.length === 0) return allBracketMatches;

  // Compute available bracket minutes across all bracket days (all days share same schedule params)
  const dayAvailableMinutes = () => {
    const raw = dayEnd - dayStart;
    return Math.max(0, lunchEnabled ? raw - lunchDur : raw);
  };
  const totalAvailableMinutes = bracketDays.length * dayAvailableMinutes();

  // Compute each layer's needed minutes: ceil(layer.length / courts) slots × matchDur
  const layerNeeded = layers.map(layer => Math.ceil(layer.length / courts.length) * pitch);
  const totalNeededMinutes = layerNeeded.reduce((s, v) => s + v, 0);
  const extraMinutes = totalAvailableMinutes - totalNeededMinutes;
  const gapMinutes = layers.length > 1 ? Math.max(0, Math.floor(extraMinutes / (layers.length - 1))) : 0;

  // Cursor state for advancing through bracket days
  let curDayIdx = 0;
  let curMins = dayStart;
  let curLunchTaken = !lunchEnabled;
  let curDaySlot = 0;

  /** Advance the cursor by `minutes` (handles lunch and day boundaries). */
  function advanceCursor(minutes: number): void {
    let remaining = minutes;
    while (remaining > 0) {
      // Apply lunch if not yet taken and we're at or past lunchStart
      if (!curLunchTaken && curMins >= lunchStart) {
        curMins += lunchDur;
        curLunchTaken = true;
      }
      const minutesToDayEnd = dayEnd - curMins;
      if (remaining <= minutesToDayEnd) {
        curMins += remaining;
        remaining = 0;
      } else {
        // Overflow to next day
        remaining -= minutesToDayEnd;
        if (curDayIdx < bracketDays.length - 1) {
          curDayIdx++;
          curMins = dayStart;
          curLunchTaken = !lunchEnabled;
          curDaySlot = 0;
        } else {
          curMins = dayEnd; // clamp to last day's end
          remaining = 0;
        }
      }
    }
    // Re-check lunch after advance
    if (!curLunchTaken && curMins >= lunchStart) {
      curMins += lunchDur;
      curLunchTaken = true;
    }
  }

  // Assign each layer's matches to actual days/times using mitad/mitad court assignment
  const scheduled = new Map<string, { day: string; time: string; slot: number; courtName: string }>();

  for (let li = 0; li < layers.length; li++) {
    const layer = layers[li];

    // Determine the distinct categories in this layer (already sorted by level due to prior sort)
    const layerCatIds: string[] = [];
    for (const m of layer) {
      if (!layerCatIds.includes(m.categoryId)) layerCatIds.push(m.categoryId);
    }
    const numCats = layerCatIds.length;

    // Group layer matches by category (in order)
    const matchesByCat = new Map<string, BracketMatch[]>();
    for (const catId of layerCatIds) matchesByCat.set(catId, []);
    for (const m of layer) matchesByCat.get(m.categoryId)!.push(m);

    // Compute court ranges per category (mitad/mitad)
    // catIdx 0 gets courts[0 .. floor(N/numCats)-1], catIdx 1 gets next share, etc.
    const catCourtStart = layerCatIds.map((_, ci) => Math.floor(ci * courts.length / numCats));
    const catCourtEnd = layerCatIds.map((_, ci) => Math.floor((ci + 1) * courts.length / numCats));

    // Compute number of slots for this layer
    const numSlots = Math.ceil(layer.length / courts.length);

    // For each slot, fill courts
    for (let slot = 0; slot < numSlots; slot++) {
      // Apply lunch before this slot if needed
      if (!curLunchTaken && curMins >= lunchStart) {
        curMins += lunchDur;
        curLunchTaken = true;
      }

      const day = bracketDays[Math.min(curDayIdx, bracketDays.length - 1)];
      const time = fmtMinutes(curMins);
      const slotNum = curDaySlot;

      // Assign courts to matches per category for this slot
      for (let ci = 0; ci < layerCatIds.length; ci++) {
        const catId = layerCatIds[ci];
        const catMatches = matchesByCat.get(catId)!;
        const courtStart = catCourtStart[ci];
        const courtEnd = catCourtEnd[ci];
        const numCourtsForCat = courtEnd - courtStart;
        if (numCourtsForCat <= 0) continue;

        // Matches for this category in this slot
        const slotStart = slot * numCourtsForCat;
        const slotMs = catMatches.slice(slotStart, slotStart + numCourtsForCat);
        slotMs.forEach((m, j) => {
          scheduled.set(m.id, {
            day,
            time,
            slot: slotNum,
            courtName: courts[courtStart + j],
          });
        });
      }

      curMins += pitch;
      curDaySlot++;
    }

    // After the layer, advance by gapMinutes (except after the last layer)
    if (li < layers.length - 1 && gapMinutes > 0) {
      advanceCursor(gapMinutes);
    }
  }

  // Suppress unused variable warning for catIds (it's used to maintain order intent)
  void catIds;

  return allBracketMatches.map(m => {
    const s = scheduled.get(m.id);
    if (!s) return m;
    return { ...m, ...s, status: (m.status === 'pending' ? 'scheduled' : m.status) as BracketMatch['status'] };
  });
}

/**
 * Pure propagation: record `result` on `matchId` and advance the winner to the next round (and,
 * for a semifinal, drop the loser into the 3rd-place match). Operates on a bracket array that may
 * span multiple categories — only the played match's category is affected. Used by the calendar
 * so scores can be entered there with identical behavior to the Bracket tab.
 */
export function applyBracketResult(
  matches: BracketMatch[],
  matchId: string,
  result: MatchResult,
): BracketMatch[] {
  let bracket = matches.map(m => m.id === matchId ? { ...m, result, status: 'done' as const } : m);
  const played = bracket.find(m => m.id === matchId);
  if (played && played.teamAId && played.teamBId) {
    const winnerId = result.winnerId;
    const loserId = winnerId === played.teamAId ? played.teamBId : played.teamAId;
    const catMatches = bracket.filter(m => m.categoryId === played.categoryId);
    const finalRoundIdx = Math.max(...catMatches.map(m => m.round));
    const isSemifinal = played.round === finalRoundIdx - 1 && finalRoundIdx >= 1;
    const nextRound = played.round + 1;
    const nextSlot = Math.floor(played.slotIndex / 2);
    const side: 'A' | 'B' = played.slotIndex % 2 === 0 ? 'A' : 'B';
    bracket = bracket.map(m => {
      if (m.categoryId === played.categoryId && m.round === nextRound && m.slotIndex === nextSlot && m.roundLabel !== '3er Puesto') {
        return side === 'A' ? { ...m, teamAId: winnerId, placeholderA: undefined, wildcardA: false } : { ...m, teamBId: winnerId, placeholderB: undefined, wildcardB: false };
      }
      if (isSemifinal && m.categoryId === played.categoryId && m.roundLabel === '3er Puesto') {
        return side === 'A' ? { ...m, teamAId: loserId, placeholderA: undefined } : { ...m, teamBId: loserId, placeholderB: undefined };
      }
      return m;
    });
  }
  return bracket;
}

export interface SaveBracketResultInput {
  tournamentId: string;
  matchId: string;
  result: MatchResult;
}

/** Save a bracket result and propagate the winner (and, for semifinals, the loser into the
 *  3rd-place match) to the next round. */
export async function saveBracketResult(input: SaveBracketResultInput): Promise<{ ok: boolean; error?: string }> {
  return saveBracketResultLocal(input);
}

export function saveBracketResultLocal(input: SaveBracketResultInput): { ok: boolean; error?: string } {
  const t = getPersonalizado(input.tournamentId);
  if (!t || !t.config?.bracketMatches) return { ok: false, error: 'Torneo no encontrado' };

  let bracket = t.config.bracketMatches.map(m =>
    m.id === input.matchId ? { ...m, result: input.result, status: 'done' as const } : m
  );
  const played = bracket.find(m => m.id === input.matchId);

  if (played && played.teamAId && played.teamBId) {
    const winnerId = input.result.winnerId;
    const loserId = winnerId === played.teamAId ? played.teamBId : played.teamAId;
    const catMatches = bracket.filter(m => m.categoryId === played.categoryId);
    const finalRoundIdx = Math.max(...catMatches.map(m => m.round));
    const isSemifinal = played.round === finalRoundIdx - 1 && finalRoundIdx >= 1;
    const nextRound = played.round + 1;
    const nextSlot = Math.floor(played.slotIndex / 2);
    const side: 'A' | 'B' = played.slotIndex % 2 === 0 ? 'A' : 'B';

    bracket = bracket.map(m => {
      if (m.categoryId === played.categoryId && m.round === nextRound && m.slotIndex === nextSlot && m.roundLabel !== '3er Puesto') {
        return side === 'A' ? { ...m, teamAId: winnerId, wildcardA: false } : { ...m, teamBId: winnerId, wildcardB: false };
      }
      if (isSemifinal && m.categoryId === played.categoryId && m.roundLabel === '3er Puesto') {
        return side === 'A' ? { ...m, teamAId: loserId } : { ...m, teamBId: loserId };
      }
      return m;
    });
  }

  savePersonalizado({ ...t, config: { ...t.config, bracketMatches: bracket } });
  return { ok: true };
}

// ── Family-member history migration ───────────────────────────────────────────

/**
 * When a family member (FM-XXXX) obtains a real platform account, re-point every
 * personalizado team registration that referenced their FM-id to the new player id
 * (and update the displayed name), so their tournament history carries over.
 * Prefers the service-role API route; falls back to a synchronous localStorage pass.
 */
export async function migrateFamilyMemberHistory(
  familyMemberId: string,
  newPlayerId: string,
  newPlayerName?: string,
): Promise<{ ok: boolean; migrated?: number; error?: string }> {
  if (isSupabaseConfigured) {
    try {
      const res = await fetch('/api/family/migrate-history', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ familyMemberId, newPlayerId, newPlayerName }),
      });
      if (res.ok) {
        const json = (await res.json()) as { ok: boolean; migrated?: number };
        // Also update the local cache so the guardian's device reflects it immediately.
        migrateFamilyMemberHistoryLocal(familyMemberId, newPlayerId, newPlayerName);
        return json;
      }
      if (res.status < 500) {
        const json = await res.json().catch(() => ({})) as { error?: string };
        return { ok: false, error: json.error ?? 'No se pudo migrar el historial' };
      }
    } catch { /* fall through */ }
  }
  return migrateFamilyMemberHistoryLocal(familyMemberId, newPlayerId, newPlayerName);
}

/** Synchronous localStorage history migration (dev fallback / offline). */
export function migrateFamilyMemberHistoryLocal(
  familyMemberId: string,
  newPlayerId: string,
  newPlayerName?: string,
): { ok: boolean; migrated: number } {
  const all = _store.load();
  let migrated = 0;
  for (const t of all) {
    for (const tm of t.teams) {
      if (tm.player1Id === familyMemberId) {
        tm.player1Id = newPlayerId;
        if (newPlayerName) tm.player1Name = newPlayerName;
        migrated++;
      }
      if (tm.player2Id === familyMemberId) {
        tm.player2Id = newPlayerId;
        if (newPlayerName) tm.player2Name = newPlayerName;
        migrated++;
      }
    }
  }
  if (migrated > 0) _store.persist(all);
  return { ok: true, migrated };
}

// ── Partner invitation helpers ────────────────────────────────────────────────

export interface PendingInvitation {
  team: PersonalizadoTeam;
  tournament: PersonalizadoTournament;
}

/** Remove a team's partner (player2) so player1 can find a new one. */
export async function clearTeamPartner(tournamentId: string, teamId: string): Promise<{ ok: boolean; error?: string }> {
  if (isSupabaseConfigured) {
    try {
      const res = await fetch('/api/personalizado/accept-invitation', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tournamentId, teamId, action: 'clear_partner' }),
      });
      if (res.ok) return { ok: true };
      if (res.status < 500) {
        const json = await res.json().catch(() => ({})) as { error?: string };
        return { ok: false, error: json.error ?? 'Error al limpiar compañero' };
      }
    } catch { /* fall through */ }
  }
  return clearTeamPartnerLocal(tournamentId, teamId);
}

export function clearTeamPartnerLocal(tournamentId: string, teamId: string): { ok: boolean; error?: string } {
  const all = _store.load();
  const tIdx = all.findIndex(t => t.id === tournamentId);
  if (tIdx < 0) return { ok: false, error: 'Torneo no encontrado' };
  const t = { ...all[tIdx], teams: [...all[tIdx].teams] };
  const tmIdx = t.teams.findIndex(tm => tm.id === teamId);
  if (tmIdx < 0) return { ok: false, error: 'Inscripción no encontrada' };
  t.teams[tmIdx] = {
    ...t.teams[tmIdx],
    player2Name: undefined, player2Email: undefined, player2Id: undefined,
    status: 'pending' as const,
  };
  all[tIdx] = t;
  _store.persist(all);
  return { ok: true };
}

/** Return all teams where the player has been invited as partner (player2) but hasn't accepted yet. */
export function getPendingInvitationsForPlayer(email: string): PendingInvitation[] {
  const emailLower = email.toLowerCase();
  const results: PendingInvitation[] = [];
  for (const t of _store.load()) {
    for (const tm of t.teams) {
      if (
        tm.player2Email?.toLowerCase() === emailLower &&
        tm.player1Id &&
        !tm.player2Id
      ) {
        results.push({ team: tm, tournament: t });
      }
    }
  }
  return results;
}

export async function acceptTeamInvitation(
  tournamentId: string,
  teamId: string,
  playerId: string,
  playerName: string,
): Promise<{ ok: boolean; error?: string }> {
  if (isSupabaseConfigured) {
    try {
      const res = await fetch('/api/personalizado/accept-invitation', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tournamentId, teamId, playerId, playerName, action: 'accept' }),
      });
      if (res.ok) return { ok: true };
      if (res.status < 500) {
        const json = await res.json().catch(() => ({})) as { error?: string };
        return { ok: false, error: json.error ?? 'No se pudo aceptar la invitación' };
      }
    } catch { /* fall through */ }
  }
  return acceptTeamInvitationLocal(tournamentId, teamId, playerId, playerName);
}

export function acceptTeamInvitationLocal(
  tournamentId: string,
  teamId: string,
  playerId: string,
  playerName: string,
): { ok: boolean; error?: string } {
  const all = _store.load();
  const tIdx = all.findIndex(t => t.id === tournamentId);
  if (tIdx < 0) return { ok: false, error: 'Torneo no encontrado' };
  const t = { ...all[tIdx], teams: [...all[tIdx].teams] };
  const tmIdx = t.teams.findIndex(tm => tm.id === teamId);
  if (tmIdx < 0) return { ok: false, error: 'Inscripción no encontrada' };
  t.teams[tmIdx] = { ...t.teams[tmIdx], player2Id: playerId, player2Name: playerName };
  all[tIdx] = t;
  _store.persist(all);
  return { ok: true };
}

export async function rejectTeamInvitation(
  tournamentId: string,
  teamId: string,
): Promise<{ ok: boolean; error?: string }> {
  if (isSupabaseConfigured) {
    try {
      const res = await fetch('/api/personalizado/accept-invitation', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tournamentId, teamId, action: 'reject' }),
      });
      if (res.ok) return { ok: true };
      if (res.status < 500) {
        const json = await res.json().catch(() => ({})) as { error?: string };
        return { ok: false, error: json.error ?? 'No se pudo rechazar la invitación' };
      }
    } catch { /* fall through */ }
  }
  return rejectTeamInvitationLocal(tournamentId, teamId);
}

export function rejectTeamInvitationLocal(
  tournamentId: string,
  teamId: string,
): { ok: boolean; error?: string } {
  const all = _store.load();
  const tIdx = all.findIndex(t => t.id === tournamentId);
  if (tIdx < 0) return { ok: false, error: 'Torneo no encontrado' };
  const t = { ...all[tIdx], teams: [...all[tIdx].teams] };
  const tmIdx = t.teams.findIndex(tm => tm.id === teamId);
  if (tmIdx < 0) return { ok: false, error: 'Inscripción no encontrada' };
  t.teams[tmIdx] = { ...t.teams[tmIdx], status: 'rejected', player2Email: undefined, player2Name: undefined };
  all[tIdx] = t;
  _store.persist(all);
  return { ok: true };
}

/** Synchronous localStorage status change with waitlist auto-promotion. */
export function setTeamStatusLocal(
  tournamentId: string,
  teamId: string,
  status: PersonalizadoTeam['status'],
): StatusChangeResult {
  const t = getPersonalizado(tournamentId);
  if (!t) return { ok: false, error: 'Torneo no encontrado' };

  let teams = t.teams.map(tm => tm.id === teamId ? { ...tm, status } : tm);
  let promoted: PersonalizadoTeam | undefined;

  if (status === 'rejected') {
    const changed = teams.find(tm => tm.id === teamId);
    if (changed) {
      const catId = changed.categoryId;
      const cat = t.categories.find(c => c.id === catId);
      const enrolled = teams.filter(tm => tm.categoryId === catId && (tm.status === 'pending' || tm.status === 'confirmed')).length;
      if (cat && enrolled < cat.maxTeams) {
        const candidate = teams
          .filter(tm => tm.categoryId === catId && tm.status === 'waitlisted')
          .sort((a, b) => a.registeredAt.localeCompare(b.registeredAt))[0];
        if (candidate) {
          teams = teams.map(tm => tm.id === candidate.id ? { ...tm, status: 'pending' as const } : tm);
          promoted = teams.find(tm => tm.id === candidate.id);
        }
      }
    }
  }

  savePersonalizado({ ...t, teams });
  return { ok: true, promoted };
}

// ── Tournament notifications ──────────────────────────────────────────────────

export interface TournamentNotification {
  id: string;
  playerId: string;
  tournamentId: string;
  type: string;
  message: string;
  read: boolean;
  createdAt: string;
}

/**
 * Insert one notification per player listed in playerIds.
 * Silently ignores empty lists. Falls back gracefully on error.
 */
export async function createScheduleNotifications(
  tournamentId: string,
  playerIds: string[],
  message: string,
): Promise<void> {
  const unique = [...new Set(playerIds.filter(Boolean))];
  if (!unique.length || !isSupabaseConfigured || !supabase) return;
  const rows = unique.map(pid => ({
    player_id: pid,
    tournament_id: tournamentId,
    type: 'schedule_updated',
    message,
    read: false,
  }));
  await supabase.from('tournament_notifications').insert(rows).then(() => {/* ignore errors */});
}

/** Fetch unread notification count for a player. Returns 0 on error. */
export async function getUnreadNotificationCount(playerId: string): Promise<number> {
  if (!playerId || !isSupabaseConfigured || !supabase) return 0;
  const { count } = await supabase
    .from('tournament_notifications')
    .select('id', { count: 'exact', head: true })
    .eq('player_id', playerId)
    .eq('read', false);
  return count ?? 0;
}

/** Fetch unread notifications for a player (latest first, max 50). */
export async function getPlayerNotifications(playerId: string): Promise<TournamentNotification[]> {
  if (!playerId || !isSupabaseConfigured || !supabase) return [];
  const { data } = await supabase
    .from('tournament_notifications')
    .select('*')
    .eq('player_id', playerId)
    .order('created_at', { ascending: false })
    .limit(50);
  if (!data) return [];
  return (data as Record<string, unknown>[]).map(r => ({
    id: r.id as string,
    playerId: r.player_id as string,
    tournamentId: r.tournament_id as string,
    type: r.type as string,
    message: r.message as string,
    read: r.read as boolean,
    createdAt: r.created_at as string,
  }));
}

/** Mark a list of notification ids as read. */
export async function markNotificationsRead(ids: string[]): Promise<void> {
  if (!ids.length || !isSupabaseConfigured || !supabase) return;
  await supabase
    .from('tournament_notifications')
    .update({ read: true })
    .in('id', ids);
}

// ── Schedule publishing ───────────────────────────────────────────────────────

/**
 * Stable signature of the schedule POSITIONS (day · time · court) for group + scheduled bracket
 * matches. Used to detect "saved but not yet published" changes: when the draft signature differs
 * from config.published.signature, there are unpublished schedule edits.
 */
export function scheduleSignature(
  matches: PersonalizadoMatch[] = [],
  bracketMatches: BracketMatch[] = [],
): string {
  const g = matches
    .map(m => `${m.id}@${m.day}|${m.time}|${m.courtName}`)
    .sort()
    .join(';');
  const b = bracketMatches
    .filter(m => !!m.day && !!m.time && !!m.courtName)
    .map(m => `${m.id}@${m.day}|${m.time}|${m.courtName}`)
    .sort()
    .join(';');
  return `${g}#${b}`;
}

/** Player ids of every participant (both partners) across all teams — recipients of notifications. */
export function tournamentPlayerIds(t: PersonalizadoTournament): string[] {
  const ids: string[] = [];
  for (const tm of t.teams) {
    if (tm.player1Id) ids.push(tm.player1Id);
    if (tm.player2Id) ids.push(tm.player2Id);
  }
  return [...new Set(ids)];
}

/**
 * Build the PUBLIC view of a tournament: schedule positions come from the published snapshot,
 * while results/status/team resolution are overlaid live (merged by match id) so scores update
 * in real time without needing a re-publish. Falls back to the live draft when nothing has been
 * published yet (keeps legacy tournaments working).
 */
export function publishedTournamentView(t: PersonalizadoTournament): PersonalizadoTournament {
  const cfg = t.config;
  if (!cfg?.published) return t;
  const liveM = new Map((cfg.matches ?? []).map(m => [m.id, m]));
  const liveB = new Map((cfg.bracketMatches ?? []).map(m => [m.id, m]));
  const matches = cfg.published.matches.map(pm => {
    const live = liveM.get(pm.id);
    return live ? { ...pm, result: live.result, status: live.status, liveScore: live.liveScore } : pm;
  });
  const bracketMatches = cfg.published.bracketMatches.map(pm => {
    const live = liveB.get(pm.id);
    return live
      ? { ...pm, result: live.result, status: live.status, liveScore: live.liveScore, teamAId: live.teamAId, teamBId: live.teamBId }
      : pm;
  });
  return { ...t, config: { ...cfg, matches, bracketMatches } };
}
