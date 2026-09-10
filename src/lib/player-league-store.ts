// player-league-store.ts — Player-created leagues with seasons, members, standings

import { createLocalStore } from './local-store';
import type { ActiveGame } from './game-engine';
import { supabase } from './supabase';

export interface PlayerLeague {
  id: string;
  name: string;
  description?: string;
  createdBy: string;
  createdByName: string;
  createdAt: string;
  isOpen: boolean;
  isPublic: boolean;
  code: string;
  defaultPointsWin: number;
  defaultPointsDraw: number;
  defaultPointsLoss: number;
  logoUrl?: string;
  bannerUrl?: string;
}

export interface LeagueSeason {
  id: string;
  leagueId: string;
  name: string;
  startDate: string;
  endDate: string;
  pointsWin: number;
  pointsDraw: number;
  pointsLoss: number;
  status: 'upcoming' | 'active' | 'completed';
}

export interface LeagueMember {
  id: string;
  leagueId: string;
  playerId: string;
  playerName: string;
  role: 'admin' | 'member';
  joinedAt: string;
}

export interface LeagueJoinRequest {
  id: string;
  leagueId: string;
  playerId: string;
  playerName: string;
  playerEmail?: string;
  message?: string;
  status: 'pending' | 'approved' | 'rejected';
  createdAt: string;
  reviewedAt?: string;
  reviewedBy?: string;
}

export interface LeagueStandingEntry {
  playerId: string;
  playerName: string;
  points: number;
  wins: number;
  draws: number;
  losses: number;
  played: number;
}

const leagueStore  = createLocalStore<PlayerLeague[]>('padelmgt_player_leagues', [], { seedOnFirstLoad: false });
const seasonStore  = createLocalStore<LeagueSeason[]>('padelmgt_player_league_seasons', [], { seedOnFirstLoad: false });
const memberStore  = createLocalStore<LeagueMember[]>('padelmgt_player_league_members', [], { seedOnFirstLoad: false });
const requestStore = createLocalStore<LeagueJoinRequest[]>('padelmgt_league_join_requests', [], { seedOnFirstLoad: false });

function genId(): string {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) return crypto.randomUUID();
  return `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

function generateLeagueCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let suffix = '';
  for (let i = 0; i < 6; i++) suffix += chars[Math.floor(Math.random() * chars.length)];
  return `LIGA-${new Date().getFullYear()}-${suffix}`;
}

// ── Supabase sync (best-effort, fire-and-forget) ──────────────────────────────
// All league writes go through the service-role /api/leagues endpoint (anon
// writes are blocked by RLS). Each mutation pushes the whole league "bundle"
// — league + its members + its seasons — which is idempotent server-side.

/** Enriched "my leagues" row returned by GET /api/leagues. */
export interface MyLeagueSummary {
  id: string;
  name: string;
  description: string;
  code: string;
  role: 'creador' | 'coadmin' | 'jugador';
  memberCount: number;
  seasonCount: number;
  activeSeasonName: string | null;
  status: 'active' | 'completed' | 'upcoming';
  createdAt: string;
  logoUrl?: string;
}

async function pushLeagueBundle(leagueId: string): Promise<void> {
  if (typeof window === 'undefined') return;
  const league = getPlayerLeague(leagueId);
  if (!league) return;
  try {
    await fetch('/api/leagues', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        op: 'sync',
        leagues: [league],
        members: getLeagueMembers(leagueId),
        seasons: getLeagueSeasons(leagueId),
      }),
    });
  } catch { /* fire-and-forget */ }
}

/** Push every league the player created (with members + seasons) to Supabase.
 * Used as a one-time backfill so localStorage-only leagues land server-side. */
export async function backfillMyLeaguesToSupabase(playerId: string): Promise<void> {
  if (typeof window === 'undefined') return;
  const mine = loadLeagues().filter(l => l.createdBy === playerId);
  if (mine.length === 0) return;
  const leagueIds = new Set(mine.map(l => l.id));
  try {
    await fetch('/api/leagues', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        op: 'sync',
        leagues: mine,
        members: memberStore.load().filter(m => leagueIds.has(m.leagueId)),
        seasons: seasonStore.load().filter(s => leagueIds.has(s.leagueId)),
      }),
    });
  } catch { /* fire-and-forget */ }
}

async function removeLeagueMemberInSupabase(leagueId: string, playerId: string): Promise<void> {
  if (typeof window === 'undefined') return;
  try {
    await fetch('/api/leagues', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ op: 'remove-member', leagueId, playerId }),
    });
  } catch { /* fire-and-forget */ }
}

async function deleteLeagueInSupabase(leagueId: string): Promise<void> {
  if (typeof window === 'undefined') return;
  try {
    await fetch('/api/leagues', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ op: 'delete-league', leagueId }),
    });
  } catch { /* fire-and-forget */ }
}

/** Fetch the caller's leagues (created + joined) enriched with role/counts. */
export async function fetchMyLeaguesFromSupabase(): Promise<MyLeagueSummary[] | null> {
  if (typeof window === 'undefined') return null;
  try {
    const res = await fetch('/api/leagues', { method: 'GET' });
    if (!res.ok) return null;
    const json = await res.json();
    return (json.leagues ?? []) as MyLeagueSummary[];
  } catch {
    return null;
  }
}

export async function fetchLeagueByCodeFromSupabase(code: string): Promise<PlayerLeague | null> {
  if (!supabase) return null;
  try {
    const { data } = await supabase.from('player_leagues').select('*').eq('code', code).maybeSingle();
    if (!data) return null;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const d = data as any;
    return {
      id: d.id, code: d.code, name: d.name,
      description: d.description ?? undefined,
      createdBy: d.created_by ?? '',
      createdByName: d.created_by_name ?? '',
      createdAt: d.created_at,
      isOpen: d.is_open ?? false,
      isPublic: d.is_public ?? true,
      defaultPointsWin: d.default_points_win ?? 3,
      defaultPointsDraw: d.default_points_draw ?? 1,
      defaultPointsLoss: d.default_points_loss ?? 0,
      logoUrl: d.logo_url ?? undefined,
      bannerUrl: d.banner_url ?? undefined,
    };
  } catch { return null; }
}

async function syncJoinRequestToSupabase(req: LeagueJoinRequest): Promise<void> {
  if (typeof window === 'undefined') return;
  try {
    await fetch('/api/leagues', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        op: 'request',
        request: {
          id: req.id, leagueId: req.leagueId, playerId: req.playerId,
          playerName: req.playerName, playerEmail: req.playerEmail ?? null,
          message: req.message ?? null,
        },
      }),
    });
  } catch { /* fire-and-forget */ }
}

async function reviewJoinRequestInSupabase(
  requestId: string,
  status: 'approved' | 'rejected',
  reviewedBy: string,
): Promise<void> {
  if (typeof window === 'undefined') return;
  try {
    await fetch('/api/leagues', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ op: 'review', requestId, status, reviewedBy }),
    });
  } catch { /* fire-and-forget */ }
}

export async function fetchJoinRequestsFromSupabase(leagueId: string): Promise<LeagueJoinRequest[]> {
  if (!supabase) return [];
  try {
    const { data } = await supabase.from('league_join_requests').select('*').eq('league_id', leagueId);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return (data ?? []).map((r: any) => ({
      id: r.id as string,
      leagueId: r.league_id as string,
      playerId: (r.player_id as string | null) ?? '',
      playerName: r.player_name as string,
      playerEmail: (r.player_email as string | null) ?? undefined,
      message: (r.message as string | null) ?? undefined,
      status: r.status as 'pending' | 'approved' | 'rejected',
      createdAt: r.created_at as string,
      reviewedAt: (r.reviewed_at as string | null) ?? undefined,
      reviewedBy: (r.reviewed_by as string | null) ?? undefined,
    }));
  } catch { return []; }
}

export function importLeagueJoinRequests(incoming: LeagueJoinRequest[]): void {
  if (incoming.length === 0) return;
  const all = requestStore.load();
  const byId = new Map(all.map(r => [r.id, r]));
  let dirty = false;
  for (const r of incoming) {
    if (!byId.has(r.id)) { byId.set(r.id, r); dirty = true; }
  }
  if (dirty) requestStore.persist(Array.from(byId.values()));
}

/**
 * One-time local migration when a device's session id changes to the canonical
 * server-assigned id (login self-heal). Rewrites every reference to the old id
 * in the league stores so backfill/sync attribute leagues correctly.
 */
export function migrateLocalPlayerId(oldId: string, newId: string): void {
  if (typeof window === 'undefined' || !oldId || !newId || oldId === newId) return;
  const leagues = leagueStore.load();
  let dirty = false;
  const migratedLeagues = leagues.map(l => {
    if (l.createdBy !== oldId) return l;
    dirty = true;
    return { ...l, createdBy: newId };
  });
  if (dirty) leagueStore.persist(migratedLeagues);

  const members = memberStore.load();
  let mDirty = false;
  const migratedMembers = members.map(m => {
    if (m.playerId !== oldId) return m;
    mDirty = true;
    return { ...m, playerId: newId };
  });
  if (mDirty) memberStore.persist(migratedMembers);

  const requests = requestStore.load();
  let rDirty = false;
  const migratedRequests = requests.map(r => {
    if (r.playerId !== oldId) return r;
    rDirty = true;
    return { ...r, playerId: newId };
  });
  if (rDirty) requestStore.persist(migratedRequests);

  // Tournaments and quick games embed the player id deeply (creatorId,
  // players[], standings[]…). A JSON-token replace rewrites only complete
  // string values equal to oldId (the quotes in JSON.stringify(oldId) prevent
  // partial/substring matches).
  for (const key of ['padelmgt_tournaments', 'padelmgt_games']) {
    try {
      const raw = localStorage.getItem(key);
      if (!raw) continue;
      const token = JSON.stringify(oldId);
      if (!raw.includes(token)) continue;
      localStorage.setItem(key, raw.split(token).join(JSON.stringify(newId)));
    } catch { /* ignore malformed store */ }
  }
}

// Migration: ensure every league has required fields

function migrateLeagues(leagues: PlayerLeague[]): PlayerLeague[] {
  let dirty = false;
  const usedCodes = new Set(leagues.filter(l => l.code).map(l => l.code));
  const migrated = leagues.map(l => {
    const patch: Partial<PlayerLeague> = {};
    if (!l.code) {
      let code = generateLeagueCode();
      while (usedCodes.has(code)) code = generateLeagueCode();
      usedCodes.add(code);
      patch.code = code;
      dirty = true;
    }
    if (l.isPublic === undefined) { patch.isPublic = true; dirty = true; }
    if (l.defaultPointsWin === undefined) { patch.defaultPointsWin = 3; dirty = true; }
    if (l.defaultPointsDraw === undefined) { patch.defaultPointsDraw = 1; dirty = true; }
    if (l.defaultPointsLoss === undefined) { patch.defaultPointsLoss = 0; dirty = true; }
    return Object.keys(patch).length ? { ...l, ...patch } : l;
  });
  if (dirty) leagueStore.persist(migrated);
  return migrated;
}

function loadLeagues(): PlayerLeague[] {
  return migrateLeagues(leagueStore.load());
}

// Leagues

export function getAllPlayerLeagues(): PlayerLeague[] {
  return loadLeagues();
}

export function getPlayerLeague(id: string): PlayerLeague | null {
  return loadLeagues().find(l => l.id === id) ?? null;
}

export function getPlayerLeagueByCode(code: string): PlayerLeague | null {
  return loadLeagues().find(l => l.code === code) ?? null;
}

export function getMyLeagues(playerId: string): PlayerLeague[] {
  const all = loadLeagues();
  const memberLeagueIds = new Set(
    memberStore.load().filter(m => m.playerId === playerId).map(m => m.leagueId)
  );
  return all.filter(l => memberLeagueIds.has(l.id) || l.createdBy === playerId);
}

export function createPlayerLeague(params: {
  name: string;
  description?: string;
  createdBy: string;
  createdByName: string;
  isOpen?: boolean;
  isPublic?: boolean;
  defaultPointsWin?: number;
  defaultPointsDraw?: number;
  defaultPointsLoss?: number;
}): PlayerLeague {
  const existingCodes = new Set(leagueStore.load().map(l => l.code));
  let code = generateLeagueCode();
  while (existingCodes.has(code)) code = generateLeagueCode();

  const league: PlayerLeague = {
    id: genId(),
    code,
    name: params.name,
    description: params.description,
    createdBy: params.createdBy,
    createdByName: params.createdByName,
    createdAt: new Date().toISOString(),
    isOpen: params.isOpen ?? false,
    isPublic: params.isPublic ?? true,
    defaultPointsWin: params.defaultPointsWin ?? 3,
    defaultPointsDraw: params.defaultPointsDraw ?? 1,
    defaultPointsLoss: params.defaultPointsLoss ?? 0,
  };
  const all = leagueStore.load();
  all.push(league);
  leagueStore.persist(all);
  addLeagueMember({ leagueId: league.id, playerId: params.createdBy, playerName: params.createdByName, role: 'admin' });
  // Push the whole bundle (league + creator member) to Supabase.
  pushLeagueBundle(league.id).catch(() => {});
  return league;
}

export function savePlayerLeague(league: PlayerLeague): void {
  const all = leagueStore.load();
  const idx = all.findIndex(l => l.id === league.id);
  if (idx >= 0) all[idx] = league; else all.push(league);
  leagueStore.persist(all);
  pushLeagueBundle(league.id).catch(() => {});
}

export function deletePlayerLeague(id: string): void {
  leagueStore.persist(leagueStore.load().filter(l => l.id !== id));
  seasonStore.persist(seasonStore.load().filter(s => s.leagueId !== id));
  memberStore.persist(memberStore.load().filter(m => m.leagueId !== id));
  requestStore.persist(requestStore.load().filter(r => r.leagueId !== id));
  deleteLeagueInSupabase(id).catch(() => {});
}

// Seasons

export function getLeagueSeasons(leagueId: string): LeagueSeason[] {
  return seasonStore.load().filter(s => s.leagueId === leagueId);
}

export function getLeagueSeason(id: string): LeagueSeason | null {
  return seasonStore.load().find(s => s.id === id) ?? null;
}

export function getActiveSeason(leagueId: string): LeagueSeason | null {
  return seasonStore.load().find(s => s.leagueId === leagueId && s.status === 'active') ?? null;
}

export function createLeagueSeason(params: {
  leagueId: string;
  name: string;
  startDate: string;
  endDate: string;
  pointsWin?: number;
  pointsDraw?: number;
  pointsLoss?: number;
}): LeagueSeason {
  const league = getPlayerLeague(params.leagueId);
  const all = seasonStore.load();
  // The first season of a league becomes active immediately so a brand-new
  // league shows as "En curso" (not "Completada") and standings have a season.
  const isFirstSeason = !all.some(s => s.leagueId === params.leagueId);
  const season: LeagueSeason = {
    id: genId(),
    leagueId: params.leagueId,
    name: params.name,
    startDate: params.startDate,
    endDate: params.endDate,
    pointsWin: params.pointsWin ?? league?.defaultPointsWin ?? 3,
    pointsDraw: params.pointsDraw ?? league?.defaultPointsDraw ?? 1,
    pointsLoss: params.pointsLoss ?? league?.defaultPointsLoss ?? 0,
    status: isFirstSeason ? 'active' : 'upcoming',
  };
  all.push(season);
  seasonStore.persist(all);
  pushLeagueBundle(params.leagueId).catch(() => {});
  return season;
}

export function saveLeagueSeason(season: LeagueSeason): void {
  const all = seasonStore.load();
  const idx = all.findIndex(s => s.id === season.id);
  if (idx >= 0) all[idx] = season; else all.push(season);
  seasonStore.persist(all);
  pushLeagueBundle(season.leagueId).catch(() => {});
}

// Members

export function getLeagueMembers(leagueId: string): LeagueMember[] {
  return memberStore.load().filter(m => m.leagueId === leagueId);
}

export function isLeagueMember(leagueId: string, playerId: string): boolean {
  const league = getPlayerLeague(leagueId);
  if (league?.createdBy === playerId) return true;
  return memberStore.load().some(m => m.leagueId === leagueId && m.playerId === playerId);
}

export function isLeagueAdmin(leagueId: string, playerId: string): boolean {
  const league = getPlayerLeague(leagueId);
  if (league?.createdBy === playerId) return true;
  return memberStore.load().some(m => m.leagueId === leagueId && m.playerId === playerId && m.role === 'admin');
}

export function addLeagueMember(params: {
  leagueId: string;
  playerId: string;
  playerName: string;
  role?: 'admin' | 'member';
}): LeagueMember {
  const all = memberStore.load();
  const existing = all.find(m => m.leagueId === params.leagueId && m.playerId === params.playerId);
  if (existing) return existing;
  const member: LeagueMember = {
    id: genId(),
    leagueId: params.leagueId,
    playerId: params.playerId,
    playerName: params.playerName,
    role: params.role ?? 'member',
    joinedAt: new Date().toISOString(),
  };
  all.push(member);
  memberStore.persist(all);
  pushLeagueBundle(params.leagueId).catch(() => {});
  return member;
}

export function removeLeagueMember(leagueId: string, playerId: string): void {
  memberStore.persist(memberStore.load().filter(m => !(m.leagueId === leagueId && m.playerId === playerId)));
  removeLeagueMemberInSupabase(leagueId, playerId).catch(() => {});
}

export function updateMemberRole(leagueId: string, playerId: string, role: 'admin' | 'member'): void {
  const all = memberStore.load();
  const idx = all.findIndex(m => m.leagueId === leagueId && m.playerId === playerId);
  if (idx >= 0) { all[idx] = { ...all[idx], role }; memberStore.persist(all); pushLeagueBundle(leagueId).catch(() => {}); }
}

// Join Requests

export function getLeagueJoinRequests(leagueId: string): LeagueJoinRequest[] {
  return requestStore.load().filter(r => r.leagueId === leagueId);
}

export function getLeaguePendingRequests(leagueId: string): LeagueJoinRequest[] {
  return requestStore.load().filter(r => r.leagueId === leagueId && r.status === 'pending');
}

export function getLeagueJoinRequestForPlayer(leagueId: string, playerId: string): LeagueJoinRequest | null {
  return requestStore.load().find(r => r.leagueId === leagueId && r.playerId === playerId) ?? null;
}

export function createLeagueJoinRequest(params: {
  leagueId: string;
  playerId: string;
  playerName: string;
  playerEmail?: string;
  message?: string;
}): LeagueJoinRequest {
  const all = requestStore.load();
  const existing = all.find(r => r.leagueId === params.leagueId && r.playerId === params.playerId);
  if (existing) {
    // Re-push pending requests: an earlier attempt may have never reached
    // Supabase (old bundle / offline), and the upsert is idempotent.
    if (existing.status === 'pending') syncJoinRequestToSupabase(existing).catch(() => {});
    return existing;
  }
  const req: LeagueJoinRequest = {
    id: genId(),
    leagueId: params.leagueId,
    playerId: params.playerId,
    playerName: params.playerName,
    playerEmail: params.playerEmail,
    message: params.message,
    status: 'pending',
    createdAt: new Date().toISOString(),
  };
  all.push(req);
  requestStore.persist(all);
  syncJoinRequestToSupabase(req).catch(() => {});
  return req;
}

export function reviewJoinRequest(
  requestId: string,
  status: 'approved' | 'rejected',
  reviewedBy: string,
): void {
  const all = requestStore.load();
  const idx = all.findIndex(r => r.id === requestId);
  if (idx < 0) return;
  all[idx] = { ...all[idx], status, reviewedAt: new Date().toISOString(), reviewedBy };
  requestStore.persist(all);
  reviewJoinRequestInSupabase(requestId, status, reviewedBy).catch(() => {});
  if (status === 'approved') {
    // addLeagueMember pushes the updated bundle (incl. the new member) to Supabase.
    addLeagueMember({ leagueId: all[idx].leagueId, playerId: all[idx].playerId, playerName: all[idx].playerName });
  }
}

export function getAdminPendingRequestsCount(playerId: string): number {
  const adminLeagueIds = new Set<string>();
  memberStore.load().filter(m => m.playerId === playerId && m.role === 'admin').forEach(m => adminLeagueIds.add(m.leagueId));
  leagueStore.load().filter(l => l.createdBy === playerId).forEach(l => adminLeagueIds.add(l.id));
  return requestStore.load().filter(r => adminLeagueIds.has(r.leagueId) && r.status === 'pending').length;
}

// Standings

export function computeLeagueStandings(
  leagueId: string,
  seasonId: string | null,
  games: ActiveGame[],
): LeagueStandingEntry[] {
  const season = seasonId ? getLeagueSeason(seasonId) : getActiveSeason(leagueId);
  const league = getPlayerLeague(leagueId);
  const cfg = {
    pointsWin:  league?.defaultPointsWin  ?? 3,
    pointsDraw: league?.defaultPointsDraw ?? 1,
    pointsLoss: league?.defaultPointsLoss ?? 0,
    ...(season ?? {}),
  };

  const leagueGames = games.filter(g => {
    if (g.leagueId !== leagueId) return false;
    if (seasonId && g.seasonId !== seasonId) return false;
    return g.status === 'finished';
  });

  const byPlayer = new Map<string, LeagueStandingEntry>();

  for (const game of leagueGames) {
    for (const st of game.standings) {
      const draws  = st.draws ?? 0;
      const losses = st.losses ?? (st.played - st.wins - draws);
      const wonPts = st.wins * cfg.pointsWin + draws * cfg.pointsDraw + losses * cfg.pointsLoss;

      let entry = byPlayer.get(st.playerId);
      if (!entry) {
        entry = { playerId: st.playerId, playerName: st.playerName, points: 0, wins: 0, draws: 0, losses: 0, played: 0 };
        byPlayer.set(st.playerId, entry);
      }
      entry.wins   += st.wins;
      entry.draws  += draws;
      entry.losses += losses;
      entry.played += st.played;
      entry.points += wonPts;

      // Fixed-pairs mode: st.player2Id is the pair's second member, credited
      // with the same result — otherwise they'd never appear in standings.
      if (st.player2Id) {
        const fp = game.fixedPairs?.find(p => p.player2Id === st.player2Id && p.player1Id === st.playerId);
        const player2Name = fp?.player2Name ?? st.playerName.split(' / ')[1] ?? st.playerName;
        let entry2 = byPlayer.get(st.player2Id);
        if (!entry2) {
          entry2 = { playerId: st.player2Id, playerName: player2Name, points: 0, wins: 0, draws: 0, losses: 0, played: 0 };
          byPlayer.set(st.player2Id, entry2);
        }
        entry2.wins   += st.wins;
        entry2.draws  += draws;
        entry2.losses += losses;
        entry2.played += st.played;
        entry2.points += wonPts;
      }
    }
  }

  return Array.from(byPlayer.values()).sort((a, b) => b.points - a.points || b.wins - a.wins);
}
