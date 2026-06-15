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
  status: 'pending' | 'confirmed' | 'rejected' | 'waitlisted';
  paymentStatus: 'unpaid' | 'paid' | 'free';
}

// ── Control-panel configuration ──────────────────────────────────────────────

export interface CategoryGroupConfig {
  categoryId: string;
  teamsPerGroup: number;   // teams that play in each group
  qualifyPerGroup: number; // teams that advance from each group to the bracket
}

export interface PersonalizadoSchedule {
  startTime: string;        // "09:00" — first match of the day
  lunchEnabled: boolean;
  lunchStart?: string;      // "13:00"
  lunchDurationMin?: number;
  expectedEndTime?: string; // computed, stored for reference
  matchDurationMin: number; // estimated minutes per match (for end-time calc)
}

export interface PersonalizadoMatch {
  id: string;
  categoryId: string;
  groupId: string;
  groupLabel: string;       // "A", "B"…
  phase: 'group';
  slot: number;             // ordinal time slot (0-based)
  time: string;             // "09:00"
  courtName: string;
  teamAId: string;
  teamBId: string;
  status: 'scheduled' | 'playing' | 'done';
}

export interface ControlPanelConfig {
  substitutionEnabled: boolean;
  scoreType: 'traditional' | 'points';
  // when scoreType === 'points'
  pointsPerSet?: number;
  sets?: number;
  thirdSetPoints?: number; // 0/undefined = no third set
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
}

export const DEFAULT_CONTROL_CONFIG: ControlPanelConfig = {
  substitutionEnabled: false,
  scoreType: 'traditional',
  standingsPoints: { win: 3, draw: 1, loss: 0 },
  forfeit: { winnerPoints: 3, winnerGamesFor: 0 },
  groups: [],
  courtNames: [],
  schedule: {
    startTime: '09:00',
    lunchEnabled: false,
    lunchStart: '13:00',
    lunchDurationMin: 60,
    matchDurationMin: 50,
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
  status: 'draft' | 'registration_open' | 'configured' | 'live' | 'finished';
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
    category_id: t.categoryId,
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
  };
}

export function rowToTeam(r: Record<string, unknown>): PersonalizadoTeam {
  return {
    id: r.id as string,
    categoryId: r.category_id as string,
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
        const { data: teamRows } = await supabase
          .from('personalizado_teams')
          .select('*')
          .eq('tournament_id', id)
          .order('registered_at', { ascending: true });
        const teams = (teamRows ?? []).map(r => rowToTeam(r as Record<string, unknown>));
        return rowToTournament(trow as Record<string, unknown>, teams);
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
    config: { ...DEFAULT_CONTROL_CONFIG },
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
  return t.teams.filter(tm => tm.categoryId === categoryId && (tm.status === 'pending' || tm.status === 'confirmed')).length;
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
  player2Name?: string;
  player2Email?: string;
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
      const json = await res.json();
      if (!res.ok) return { ok: false, error: json.error ?? 'No se pudo completar la inscripción' };
      return json as RegisterResult;
    } catch {
      return { ok: false, error: 'Error de conexión. Intenta de nuevo.' };
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
    player2Name: team.player2Name,
    player2Email: team.player2Email,
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
      const json = await res.json();
      if (!res.ok) return { ok: false, error: json.error ?? 'No se pudo actualizar' };
      return json as StatusChangeResult;
    } catch {
      return { ok: false, error: 'Error de conexión. Intenta de nuevo.' };
    }
  }
  return setTeamStatusLocal(tournamentId, teamId, status);
}

// ── Calendar generation (group-stage schedule) ───────────────────────────────

const GROUP_LETTERS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';

function fmtMinutes(total: number): string {
  const capped = Math.min(total, 23 * 60 + 59);
  const h = Math.floor(capped / 60), m = capped % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

function parseMinutes(hhmm: string): number {
  const [h, m] = (hhmm || '0:0').split(':').map(Number);
  return (h || 0) * 60 + (m || 0);
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

/**
 * Generate the group-stage match schedule from the control-panel config and the
 * teams' group assignments. Round-robin within each group, then list-scheduled
 * across courts and time slots, honoring the lunch break. A team never plays two
 * matches in the same time slot.
 */
export function generateGroupSchedule(t: PersonalizadoTournament): PersonalizadoMatch[] {
  const cfg = t.config;
  if (!cfg) return [];
  const courts = (cfg.courtNames && cfg.courtNames.length > 0)
    ? cfg.courtNames
    : Array.from({ length: Math.max(1, t.courts || 1) }, (_, i) => `Cancha ${i + 1}`);

  const assignable = t.teams.filter(tm => tm.status === 'pending' || tm.status === 'confirmed');

  // Collect all group matches (unscheduled).
  type Pending = { categoryId: string; groupId: string; groupLabel: string; a: string; b: string };
  const pending: Pending[] = [];
  for (const cat of t.categories) {
    const byGroup = new Map<string, string[]>();
    for (const tm of assignable) {
      if (tm.categoryId !== cat.id || !tm.groupId) continue;
      const arr = byGroup.get(tm.groupId) ?? [];
      arr.push(tm.id);
      byGroup.set(tm.groupId, arr);
    }
    for (const [gid, ids] of byGroup) {
      const n = parseInt(gid.split('-G')[1] ?? '1', 10);
      const label = GROUP_LETTERS[(n - 1) % GROUP_LETTERS.length] ?? String(n);
      for (const round of roundRobinRounds(ids)) {
        for (const [a, b] of round) pending.push({ categoryId: cat.id, groupId: gid, groupLabel: label, a, b });
      }
    }
  }

  // List-schedule into slots × courts.
  const matchDur = Math.max(10, cfg.schedule.matchDurationMin || 50);
  const lunchEnabled = cfg.schedule.lunchEnabled;
  const lunchStart = parseMinutes(cfg.schedule.lunchStart ?? '13:00');
  const lunchDur = cfg.schedule.lunchDurationMin ?? 0;

  let slotTime = parseMinutes(cfg.schedule.startTime || '09:00');
  let lunchTaken = !lunchEnabled;
  let slotIndex = 0;
  const out: PersonalizadoMatch[] = [];
  const remaining = [...pending];

  while (remaining.length > 0) {
    if (!lunchTaken && slotTime >= lunchStart) { slotTime += lunchDur; lunchTaken = true; }
    const busy = new Set<string>();
    let courtsUsed = 0;
    for (let i = 0; i < remaining.length && courtsUsed < courts.length; ) {
      const m = remaining[i];
      if (!busy.has(m.a) && !busy.has(m.b)) {
        out.push({
          id: `m-${m.groupId}-${m.a}-${m.b}`,
          categoryId: m.categoryId, groupId: m.groupId, groupLabel: m.groupLabel, phase: 'group',
          slot: slotIndex, time: fmtMinutes(slotTime), courtName: courts[courtsUsed],
          teamAId: m.a, teamBId: m.b, status: 'scheduled',
        });
        busy.add(m.a); busy.add(m.b);
        courtsUsed++;
        remaining.splice(i, 1);
      } else {
        i++;
      }
    }
    slotTime += matchDur;
    slotIndex++;
    if (slotIndex > 2000) break; // safety
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
      const json = await res.json();
      if (!res.ok) return { ok: false, error: json.error ?? 'No se pudo guardar' };
      return json as SaveControlPanelResult;
    } catch {
      return { ok: false, error: 'Error de conexión. Intenta de nuevo.' };
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
    teams,
  });
  return { ok: true, teams };
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
