import { supabase } from './supabase';
import { normalizeLegacyLevel } from './level-config';

export interface SAPlayer {
  id: string;
  shortId: string;
  name: string;
  email: string;
  password?: string;
  phone: string;
  sex?: 'M' | 'F';
  city: string;
  country: string;
  level?: import('./level-config').PlayerLevel;
  federationLevel?: string;  // read-only for player, set by federation
  ranking: number;
  rankingPoints: number;
  status: 'active' | 'blocked' | 'suspended';
  role: 'player' | 'club_admin' | 'federation_admin';
  plan?: string;           // PlanId assigned by SA (e.g. 'free', 'player_pro')
  profileCompleted?: boolean;
  joinedAt: string;
  lastActive: string;
  // club removed — use club_memberships table (getPlayerClubs)
  photoUrl?: string;
  customFields?: Record<string, string>;
}

export interface SAClub {
  id: string;
  name: string;
  clubType: string;
  city: string;
  country: string;
  address: string;
  description: string;
  courts: number;
  courtTypes: string[];
  amenities: string[];
  members: number;
  status: 'active' | 'inactive' | 'pending' | 'rejected';
  adminEmail: string;
  ownerName: string;
  ownerPhone: string;
  ownerEmail: string;
  message: string;
  rejectReason?: string;
  joinedAt: string;
  plan: 'free' | 'basic' | 'pro' | 'club_starter' | 'club_pro' | 'club_liga' | 'liga_free' | 'liga_basic' | 'liga_pro' | 'liga_unlimited' | 'fed_basic' | 'fed_pro' | 'infinity';
  mapsUrl?: string;
}

export interface SATournament {
  id: string;
  name: string;
  club: string;
  city: string;
  date: string;
  players: number;
  status: 'ongoing' | 'upcoming' | 'completed' | 'cancelled';
  rounds: number;
  format: string;
}

export interface SAGame {
  id: string;
  name: string;
  date: string;
  players: number;
  status: 'ongoing' | 'completed' | 'cancelled';
  rounds: number;
  format: string;
  scoreConfig: string;
}

export interface SAAdminUser {
  id: string;
  name: string;
  email: string;
  password?: string;
  role: 'score_corrections' | 'player_db' | 'transactions' | 'clubs';
  status: 'active' | 'inactive';
  createdAt: string;
}

export interface SAStats {
  totalPlayers: number;
  activePlayers: number;
  totalClubs: number;
  pendingClubRequests: number;
  tournamentsThisMonth: number;
  tournamentsLastMonth: number;
  gamesThisMonth: number;
  totalGames: number;
  pendingScoreRequests: number;
  nps: number;
  retentionRate: number;
  monthlyRevenue: number;
  growthPercent: number;
}

export interface PlayerRelationship {
  id: string;
  playerId: string;
  relatedPlayerId: string;
  type: 'friend' | 'rival' | 'teammate';
  createdAt: string;
}

function getPendingScoreCorrections(): number {
  if (typeof window === 'undefined') return 0;
  try {
    const raw = localStorage.getItem('padelmgt_score_corrections') ?? '[]';
    const items = JSON.parse(raw) as Array<{ status?: string }>;
    return items.filter(x => x?.status === 'pending').length;
  } catch { return 0; }
}

function getThisMonthStr(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

function getLastMonthStr(): string {
  const d = new Date();
  d.setMonth(d.getMonth() - 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

export function getSAStats(): SAStats {
  if (typeof window === 'undefined') {
    return { totalPlayers: 0, activePlayers: 0, totalClubs: 0, pendingClubRequests: 0, tournamentsThisMonth: 0, tournamentsLastMonth: 0, gamesThisMonth: 0, totalGames: 0, pendingScoreRequests: 0, nps: 72, retentionRate: 84, monthlyRevenue: 0, growthPercent: 12 };
  }

  const players = getSAPlayers();
  const clubs = getSAClubs();
  const tournaments = getSATournaments();
  const games = getSAGames();

  const thisMonth = getThisMonthStr();
  const lastMonth = getLastMonthStr();

  const tournamentsThisMonth = tournaments.filter(t => t.date.startsWith(thisMonth)).length;
  const tournamentsLastMonth = tournaments.filter(t => t.date.startsWith(lastMonth)).length;
  const gamesThisMonth = games.filter(g => g.date.startsWith(thisMonth)).length;

  const rawClubs = JSON.parse(localStorage.getItem('padelmgt_club_requests') || '[]') as Array<{ status?: string }>;
  const pendingClubRequests = rawClubs.filter(c => c.status === 'pending').length;

  return {
    totalPlayers: players.length,
    activePlayers: players.filter(p => p.status === 'active').length,
    totalClubs: clubs.filter(c => c.status === 'active').length,
    pendingClubRequests,
    tournamentsThisMonth,
    tournamentsLastMonth,
    gamesThisMonth,
    totalGames: games.length,
    pendingScoreRequests: getPendingScoreCorrections(),
    nps: 72,
    retentionRate: 84,
    monthlyRevenue: 0,
    growthPercent: 12,
  };
}

export function getSAPlayers(): SAPlayer[] {
  if (typeof window === 'undefined') return [];
  const raw = localStorage.getItem('padelmgt_sa_players');
  if (raw) {
    try {
      return JSON.parse(raw) as SAPlayer[];
    } catch {
      // fallthrough
    }
  }
  // Try reading from registered_players
  const regRaw = localStorage.getItem('padelmgt_registered_players');
  let fromStorage: SAPlayer[] = [];
  if (regRaw) {
    try {
      const parsed = JSON.parse(regRaw) as Array<Record<string, unknown>>;
      fromStorage = parsed.map((p, i) => ({
        id: (p.id as string) || `rp-${i}`,
        shortId: (p.shortId as string) || `#${String(i + 1).padStart(5, '0')}`,
        name: (p.name as string) || 'Jugador',
        email: (p.email as string) || '',
        password: (p.password as string) || undefined,
        phone: (p.phone as string) || '',
        sex: (['M', 'F'].includes(p.sex as string) ? p.sex as 'M' | 'F' : undefined),
        city: (p.city as string) || '',
        country: (p.country as string) || 'ES',
        level: normalizeLegacyLevel(p.level as string | undefined),
        ranking: typeof p.ranking === 'number' ? p.ranking : 0,
        rankingPoints: typeof p.rankingPoints === 'number' ? p.rankingPoints : typeof p.points === 'number' ? p.points : 0,
        status: (['active', 'blocked', 'suspended'].includes(p.status as string) ? p.status as SAPlayer['status'] : 'active'),
        role: (['player', 'club_admin', 'federation_admin'].includes(p.role as string) ? p.role as SAPlayer['role'] : 'player'),
        profileCompleted: typeof p.profileCompleted === 'boolean' ? p.profileCompleted : true,
        joinedAt: (p.joinedAt as string) || (p.createdAt as string) || new Date().toISOString().split('T')[0],
        lastActive: (p.lastActive as string) || new Date().toISOString().split('T')[0],
        photoUrl: (p.photoUrl as string) || (p.photo as string) || undefined,
        customFields: (p.customFields as Record<string, string>) || {},
      }));
    } catch {
      // fallthrough
    }
  }

  // No mock padding: the SA panel shows only real registered players (synced
  // from Supabase into this local cache).
  return fromStorage;
}

export function saveSAPlayers(players: SAPlayer[]): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem('padelmgt_sa_players', JSON.stringify(players));
  // Sync back to main app player store format
  const regPlayers = players.map(p => ({
    id: p.id,
    shortId: p.shortId,
    name: p.name,
    email: p.email,
    password: p.password,
    sex: p.sex,
    country: p.country,
    city: p.city,
    level: p.level,
    ranking: p.ranking,
    rankingPoints: p.rankingPoints,
    profileCompleted: p.profileCompleted,
    phone: p.phone,
    photoUrl: p.photoUrl,
    customFields: p.customFields,
    status: p.status,
    role: p.role,
    plan: p.plan,
  }));
  localStorage.setItem('padelmgt_registered_players', JSON.stringify(regPlayers));
}

export function getSAClubs(): SAClub[] {
  if (typeof window === 'undefined') return [];
  const raw = localStorage.getItem('padelmgt_club_requests');
  let fromStorage: SAClub[] = [];
  if (raw) {
    try {
      const parsed = JSON.parse(raw) as Array<Record<string, unknown>>;
      fromStorage = parsed.map((c, i) => ({
        id: (c.id as string) || `cr-${i}`,
        name: (c.clubName as string) || (c.name as string) || 'Club',
        clubType: (c.clubType as string) || 'Club Privado',
        city: (c.city as string) || '',
        country: (c.country as string) || 'ES',
        address: (c.address as string) || '',
        description: (c.description as string) || '',
        courts: typeof c.courtsCount === 'number' ? c.courtsCount : typeof c.courts === 'number' ? c.courts : 0,
        courtTypes: Array.isArray(c.courtTypes) ? (c.courtTypes as string[]) : [],
        amenities: Array.isArray(c.amenities) ? (c.amenities as string[]) : [],
        members: typeof c.members === 'number' ? c.members : 0,
        status: (['active', 'inactive', 'pending', 'rejected'].includes(c.status as string) ? c.status as SAClub['status'] : 'pending'),
        adminEmail: (c.adminEmail as string) || (c.ownerEmail as string) || (c.email as string) || '',
        ownerName: (c.ownerName as string) || '',
        ownerPhone: (c.ownerPhone as string) || '',
        ownerEmail: (c.ownerEmail as string) || (c.adminEmail as string) || '',
        message: (c.message as string) || '',
        rejectReason: (c.rejectReason as string) || undefined,
        joinedAt: (c.joinedAt as string) || (c.createdAt as string) || new Date().toISOString().split('T')[0],
        plan: (['free', 'basic', 'pro'].includes(c.plan as string) ? c.plan as SAClub['plan'] : 'free'),
        mapsUrl: (c.mapsUrl as string) || undefined,
      }));
    } catch {
      // fallthrough
    }
  }

  // No mock clubs: only real club requests/records (synced from Supabase).
  return fromStorage;
}

export function saveSAClubs(clubs: SAClub[]): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem('padelmgt_club_requests', JSON.stringify(clubs));
}

export function saveSATournaments(tournaments: SATournament[]): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem('padelmgt_tournaments_v2', JSON.stringify(tournaments));
}

export function getSATournaments(): SATournament[] {
  if (typeof window === 'undefined') return [];
  const raw = localStorage.getItem('padelmgt_tournaments_v2');
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw) as Array<Record<string, unknown>>;
    if (parsed.length === 0) return [];
    return parsed.map((t, i) => ({
      id: (t.id as string) || `t-${i}`,
      name: (t.name as string) || 'Torneo',
      club: (t.club as string) || '',
      city: (t.city as string) || '',
      date: (t.startDate as string) || (t.date as string) || '',
      players: typeof t.players === 'number' ? t.players
        : Array.isArray(t.players) ? (t.players as unknown[]).length : 0,
      status: t.status === 'completed' ? 'completed'
        : t.status === 'cancelled' ? 'cancelled'
        : t.status === 'ongoing' ? 'ongoing' : 'upcoming',
      rounds: Array.isArray(t.rounds) ? (t.rounds as unknown[]).length
        : typeof t.rounds === 'number' ? t.rounds : 0,
      format: (t.format as string) || (t.formatSlug as string) || 'Americano',
    }));
  } catch {
    return [];
  }
}

export function saveSAGames(games: SAGame[]): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem('padelmgt_games', JSON.stringify(games));
}

export function getSAGames(): SAGame[] {
  if (typeof window === 'undefined') return [];
  const raw = localStorage.getItem('padelmgt_games');
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw) as Array<Record<string, unknown>>;
    if (parsed.length === 0) return [];
    return parsed.map((g, i) => ({
      id: (g.id as string) || `g-${i}`,
      name: (g.name as string) || `Juego ${i + 1}`,
      date: (g.date as string) || (g.createdAt as string) || '',
      players: typeof g.players === 'number' ? g.players
        : Array.isArray(g.players) ? (g.players as unknown[]).length : 0,
      status: g.status === 'completed' ? 'completed'
        : g.status === 'cancelled' ? 'cancelled' : 'ongoing',
      rounds: Array.isArray(g.rounds) ? (g.rounds as unknown[]).length
        : typeof g.rounds === 'number' ? g.rounds : 0,
      format: (g.format as string) || 'Americano',
      scoreConfig: typeof g.scoreConfig === 'object' && g.scoreConfig !== null
        ? ((g.scoreConfig as Record<string, unknown>).type as string) ?? 'puntos'
        : typeof g.scoreConfig === 'string' ? g.scoreConfig : 'puntos',
    }));
  } catch {
    return [];
  }
}

export function getSAAdminUsers(): SAAdminUser[] {
  if (typeof window === 'undefined') return [];
  const raw = localStorage.getItem('padelmgt_sa_admin_users');
  if (!raw) return [];
  try {
    return JSON.parse(raw) as SAAdminUser[];
  } catch {
    return [];
  }
}

export function saveSAAdminUsers(users: SAAdminUser[]): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem('padelmgt_sa_admin_users', JSON.stringify(users));
}

export function getPlayerCustomFields(): string[] {
  if (typeof window === 'undefined') return [];
  const raw = localStorage.getItem('padelmgt_sa_player_custom_fields');
  if (!raw) return [];
  try {
    return JSON.parse(raw) as string[];
  } catch {
    return [];
  }
}

export function savePlayerCustomFields(fields: string[]): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem('padelmgt_sa_player_custom_fields', JSON.stringify(fields));
}

export function getPlayerRelationships(): PlayerRelationship[] {
  if (typeof window === 'undefined') return [];
  const raw = localStorage.getItem('padelmgt_sa_player_relationships');
  if (!raw) return [];
  try {
    return JSON.parse(raw) as PlayerRelationship[];
  } catch {
    return [];
  }
}

export function savePlayerRelationships(rels: PlayerRelationship[]): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem('padelmgt_sa_player_relationships', JSON.stringify(rels));
}

/** Pull the real cross-device relationship list from Supabase. Returns null
 * on fetch failure (caller should keep showing the local cache), not [] —
 * an empty result is only trustworthy when the fetch actually succeeded. */
export async function getPlayerRelationshipsFromSupabase(): Promise<PlayerRelationship[] | null> {
  try {
    const res = await fetch('/api/sa/player-relationships', { credentials: 'include' });
    if (!res.ok) return null;
    const data = await res.json() as { relationships: PlayerRelationship[] };
    return data.relationships;
  } catch { return null; }
}

export async function addPlayerRelationshipToSupabase(rel: PlayerRelationship): Promise<void> {
  const res = await fetch('/api/sa/player-relationships', {
    method: 'POST', credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ id: rel.id, playerId: rel.playerId, relatedPlayerId: rel.relatedPlayerId, type: rel.type }),
  });
  if (!res.ok) throw new Error(`add relationship failed: ${res.status}`);
}

export async function deletePlayerRelationshipFromSupabase(id: string): Promise<void> {
  const res = await fetch(`/api/sa/player-relationships?id=${encodeURIComponent(id)}`, { method: 'DELETE', credentials: 'include' });
  if (!res.ok) throw new Error(`delete relationship failed: ${res.status}`);
}

export interface SAFriendship {
  id: string;
  aId: string;
  aName: string;
  bId: string;
  bName: string;
  since: string;
}

/** Global friendship graph (all accepted friend_requests), for the SA
 * Relations panel. Returns null on fetch failure — caller should keep
 * showing the local cache in that case. */
export async function getSAFriendshipsFromSupabase(): Promise<SAFriendship[] | null> {
  try {
    const res = await fetch('/api/sa/friendships', { credentials: 'include' });
    if (!res.ok) return null;
    const data = await res.json() as { friendships: SAFriendship[] };
    return data.friendships;
  } catch { return null; }
}

export async function addSAFriendship(aId: string, aName: string, bId: string, bName: string): Promise<void> {
  const res = await fetch('/api/sa/friendships', {
    method: 'POST', credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ aId, aName, bId, bName }),
  });
  if (!res.ok) throw new Error(`add friendship failed: ${res.status}`);
}

export async function removeSAFriendship(aId: string, bId: string): Promise<void> {
  const res = await fetch(`/api/sa/friendships?aId=${encodeURIComponent(aId)}&bId=${encodeURIComponent(bId)}`, { method: 'DELETE', credentials: 'include' });
  if (!res.ok) throw new Error(`remove friendship failed: ${res.status}`);
}

/** Create a club membership on the caller's behalf as the SA — the
 * player-facing /api/club-memberships route only authorizes the caller's OWN
 * player id (via their Supabase Auth session), which the SA's signed cookie
 * session never has, so SA-created memberships need this dedicated route. */
export async function addSAClubMembership(
  playerId: string, clubId: string, clubName: string, clubCity: string, clubCountry: string,
): Promise<void> {
  const res = await fetch('/api/sa/club-memberships', {
    method: 'POST', credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ playerId, clubId, clubName, clubCity, clubCountry }),
  });
  if (!res.ok) throw new Error(`add club membership failed: ${res.status}`);
}

export async function removeSAClubMembership(playerId: string, clubId: string): Promise<void> {
  const res = await fetch(`/api/sa/club-memberships?playerId=${encodeURIComponent(playerId)}&clubId=${encodeURIComponent(clubId)}`, { method: 'DELETE', credentials: 'include' });
  if (!res.ok) throw new Error(`remove club membership failed: ${res.status}`);
}

// ── Supabase integration ───────────────────────────────────────────────────────

// Map Supabase row → SAPlayer
function rowToSAPlayer(row: Record<string, unknown>): SAPlayer {
  const cf = (row.custom_fields as Record<string, string>) ?? {};
  return {
    id: row.id as string,
    // shortId not a DB column — stored in custom_fields
    shortId: (row.short_id as string) ?? cf.shortId ?? '',
    name: row.name as string,
    email: row.email as string,
    phone: (row.phone as string) ?? '',
    sex: (['M', 'F'].includes(cf.sex) ? cf.sex as SAPlayer['sex'] : undefined),
    city: (row.city as string) ?? '',
    country: (row.country as string) ?? 'ES',
    level: normalizeLegacyLevel(cf.level),
    ranking: (row.ranking as number) ?? 0,
    rankingPoints: (row.ranking_points as number) ?? 0,
    status: (row.status as SAPlayer['status']) ?? 'active',
    role: (row.role as SAPlayer['role']) ?? 'player',
    plan: cf.plan ?? undefined,
    profileCompleted: cf.profileCompleted === 'true',
    joinedAt: ((row.joined_at as string) ?? '').split('T')[0],
    lastActive: ((row.last_active as string) ?? '').split('T')[0],
    customFields: cf,
  };
}

function playerToRow(p: SAPlayer): Record<string, unknown> {
  return {
    id: p.id,
    name: p.name,
    email: p.email,
    phone: p.phone || null,
    city: p.city || null,
    country: p.country || 'ES',
    ranking_points: p.rankingPoints ?? p.ranking ?? 0,
    status: p.status,
    role: p.role,
    // Store extended fields in custom_fields JSONB so they round-trip correctly
    custom_fields: {
      ...(p.customFields ?? {}),
      shortId: p.shortId,
      ...(p.sex              ? { sex: p.sex }                           : {}),
      ...(p.level            ? { level: p.level }                       : {}),
      ...(p.profileCompleted !== undefined ? { profileCompleted: String(p.profileCompleted) } : {}),
      ...(p.plan             ? { plan: p.plan }                         : {}),
    },
    joined_at: p.joinedAt || new Date().toISOString(),
    last_active: p.lastActive || new Date().toISOString(),
  };
}

function rowToSAClub(row: Record<string, unknown>): SAClub {
  return {
    id: row.id as string,
    name: row.name as string,
    clubType: (row.club_type as string) ?? 'Club Privado',
    city: (row.city as string) ?? '',
    country: (row.country as string) ?? 'ES',
    address: (row.address as string) ?? '',
    description: (row.description as string) ?? '',
    courts: (row.courts as number) ?? 0,
    courtTypes: Array.isArray(row.court_types) ? (row.court_types as string[]) : [],
    amenities: Array.isArray(row.amenities) ? (row.amenities as string[]) : [],
    members: (row.members as number) ?? 0,
    status: (row.status as SAClub['status']) ?? 'pending',
    adminEmail: (row.admin_email as string) ?? '',
    ownerName: (row.owner_name as string) ?? '',
    ownerPhone: (row.owner_phone as string) ?? '',
    ownerEmail: (row.owner_email as string) ?? '',
    message: (row.message as string) ?? '',
    rejectReason: (row.reject_reason as string) ?? undefined,
    joinedAt: ((row.joined_at as string) ?? '').split('T')[0],
    plan: (row.plan as SAClub['plan']) ?? 'free',
    mapsUrl: (row.maps_url as string) ?? undefined,
  };
}

function rowToSAAdminUser(row: Record<string, unknown>): SAAdminUser {
  return {
    id: row.id as string,
    name: row.name as string,
    email: row.email as string,
    role: row.role as SAAdminUser['role'],
    status: (row.status as SAAdminUser['status']) ?? 'active',
    createdAt: ((row.created_at as string) ?? '').split('T')[0],
  };
}

// Players
export async function getSAPlayersFromSupabase(): Promise<SAPlayer[] | null> {
  if (!supabase) return null;
  try {
    const { data, error } = await supabase.from('players').select('*').order('joined_at', { ascending: false }).limit(500);
    if (error) return null;
    return (data ?? []).map(row => rowToSAPlayer(row as Record<string, unknown>));
  } catch { return null; }
}

// Short-lived bookkeeping for the SA players merge: tracks ids just pushed to
// Supabase so the next poll (which may land before the write is visible) doesn't
// treat them as "deleted server-side" and drop them. Entries expire quickly —
// this is only meant to cover the upsert→poll race window, not indefinite drift.
const PENDING_SYNC_KEY = 'padelmgt_sa_pending_player_sync';
const PENDING_SYNC_TTL_MS = 60_000;

export function markPlayerPendingSync(id: string): void {
  if (typeof window === 'undefined') return;
  let map: Record<string, number> = {};
  try {
    const raw = localStorage.getItem(PENDING_SYNC_KEY);
    map = raw ? JSON.parse(raw) : {};
  } catch { map = {}; }
  map[id] = Date.now();
  localStorage.setItem(PENDING_SYNC_KEY, JSON.stringify(map));
}

export function getPendingSyncIds(): Set<string> {
  if (typeof window === 'undefined') return new Set();
  const raw = localStorage.getItem(PENDING_SYNC_KEY);
  if (!raw) return new Set();
  try {
    const map = JSON.parse(raw) as Record<string, number>;
    const now = Date.now();
    const fresh = Object.entries(map).filter(([, ts]) => now - ts < PENDING_SYNC_TTL_MS);
    if (fresh.length !== Object.keys(map).length) {
      localStorage.setItem(PENDING_SYNC_KEY, JSON.stringify(Object.fromEntries(fresh)));
    }
    return new Set(fresh.map(([id]) => id));
  } catch {
    return new Set();
  }
}

export async function upsertSAPlayerToSupabase(player: SAPlayer): Promise<void> {
  // Preferred path: server route with the service role. RLS on players only
  // lets each auth user update their OWN row, so a direct anon-key upsert
  // from the SA browser fails silently against other users' rows.
  try {
    const res = await fetch('/api/superadmin/players', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ player }),
    });
    if (res.ok) return;
    console.error('[SA] upsertPlayer route failed:', res.status);
  } catch { /* offline / route unavailable — try direct upsert below */ }

  if (!supabase) return;
  try {
    const { error } = await supabase.from('players').upsert(playerToRow(player));
    if (error) console.error('[Supabase] upsertPlayer error:', error.message, error.details);
  } catch (err) { console.error('[Supabase] upsertPlayer exception:', err); }
}

// Throws on failure so callers can surface a "delete failed" error instead of
// assuming success. The service-role /api/superadmin/players route is the only
// authorized path — a direct anon-key delete would be blocked by RLS anyway,
// so there's no useful fallback to silently swallow errors into.
export async function deleteSAPlayerFromSupabase(id: string): Promise<void> {
  const res = await fetch('/api/superadmin/players', {
    method: 'DELETE',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ id }),
  });
  if (!res.ok) throw new Error(`delete player failed: ${res.status} ${await res.text().catch(() => '')}`);
}

// Clubs
export async function getSAClubsFromSupabase(): Promise<SAClub[] | null> {
  if (!supabase) return null;
  try {
    const { data, error } = await supabase.from('clubs').select('*').order('joined_at', { ascending: false });
    if (error) return null;
    return (data ?? []).map(row => rowToSAClub(row as Record<string, unknown>));
  } catch { return null; }
}

// Throws on failure (network error or non-2xx) so callers relying on
// .catch(...) to surface a "save failed" toast actually get invoked — an
// unchecked res.ok previously made every write look like it succeeded.
export async function upsertSAClubToSupabase(club: SAClub): Promise<void> {
  if (typeof window === 'undefined') return;
  // Route through the SA-guarded service-role endpoint (anon writes on the clubs
  // table are blocked by RLS).
  const res = await fetch('/api/sa/clubs', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      id: club.id, name: club.name, city: club.city, country: club.country,
      courts: club.courts, members: club.members, status: club.status,
      adminEmail: club.adminEmail, plan: club.plan,
      joinedAt: club.joinedAt || new Date().toISOString(),
      address: club.address || null,
      clubType: club.clubType || null,
      mapsUrl: club.mapsUrl || null,
    }),
  });
  if (!res.ok) throw new Error(`upsert club failed: ${res.status} ${await res.text().catch(() => '')}`);
}

export async function deleteSAClubFromSupabase(id: string): Promise<void> {
  if (typeof window === 'undefined') return;
  const res = await fetch(`/api/sa/clubs?id=${encodeURIComponent(id)}`, { method: 'DELETE' });
  if (!res.ok) throw new Error(`delete club failed: ${res.status} ${await res.text().catch(() => '')}`);
}

// Admin users — go through the protected /api/sa/admins routes (signed SA
// cookie required). The admin_users table is locked to service_role via RLS.
export async function getSAAdminUsersFromSupabase(): Promise<SAAdminUser[] | null> {
  try {
    const res = await fetch('/api/sa/admins');
    if (!res.ok) return null;
    const data = await res.json() as { admins: Record<string, unknown>[] };
    return (data.admins ?? []).map(row => rowToSAAdminUser(row));
  } catch { return null; }
}

export async function upsertSAAdminUserToSupabase(user: SAAdminUser): Promise<void> {
  try {
    await fetch('/api/sa/admins', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        id: user.id, name: user.name, email: user.email,
        role: user.role, status: user.status,
        password: user.password, createdAt: user.createdAt,
      }),
    });
  } catch { /* silent */ }
}

export async function deleteSAAdminUserFromSupabase(id: string): Promise<void> {
  try {
    await fetch(`/api/sa/admins?id=${encodeURIComponent(id)}`, { method: 'DELETE' });
  } catch { /* silent */ }
}

// Bulk seed: push all localStorage players to Supabase (one-time migration)
export async function seedPlayersToSupabase(): Promise<number> {
  if (!supabase) return 0;
  const players = getSAPlayers();
  let count = 0;
  for (const p of players) {
    const { error } = await supabase.from('players').upsert(playerToRow(p));
    if (!error) count++;
  }
  return count;
}

export async function seedClubsToSupabase(): Promise<number> {
  if (typeof window === 'undefined') return 0;
  const clubs = getSAClubs();
  let count = 0;
  // Route each write through the SA-guarded service-role endpoint.
  for (const c of clubs) {
    try {
      const res = await fetch('/api/sa/clubs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: c.id, name: c.name, city: c.city, country: c.country,
          courts: c.courts, members: c.members, status: c.status,
          adminEmail: c.adminEmail, plan: c.plan,
          joinedAt: c.joinedAt || new Date().toISOString(),
        }),
      });
      if (res.ok) count++;
    } catch { /* skip failed row */ }
  }
  return count;
}

// Tournaments (requires `data JSONB` column on the tournaments table)
export async function getSATournamentsFromSupabase(): Promise<SATournament[] | null> {
  if (!supabase) return null;
  try {
    const { data, error } = await supabase
      .from('tournaments')
      .select('*')
      .order('created_at', { ascending: false });
    if (error) return null;
    return (data ?? []).map(row => {
      const fullData = row.data as Record<string, unknown> | null;
      const actualPlayers = Array.isArray(fullData?.players) ? (fullData!.players as unknown[]).length : 0;
      return {
        id: row.id as string,
        name: row.name as string,
        club: (row.club as string) ?? '',
        city: (row.city as string) ?? '',
        date: ((row.start_date as string) ?? '').split('T')[0],
        players: actualPlayers || (row.max_players as number) || 0,
        status: (row.status as SATournament['status']) ?? 'upcoming',
        rounds: (fullData?.currentRound as number) ?? 0,
        format: (row.format as string) ?? 'Americano',
      };
    });
  } catch { return null; }
}

export async function getFullTournamentFromSupabase(id: string): Promise<Record<string, unknown> | null> {
  if (!supabase) return null;
  try {
    const { data, error } = await supabase
      .from('tournaments')
      .select('data')
      .eq('id', id)
      .single();
    if (error || !data) return null;
    return (data.data as Record<string, unknown>) ?? null;
  } catch { return null; }
}

// `t.status` is normally the tournament engine's own status vocabulary
// ('created'|'starting_soon'|'live'|'finished', see GameStatus), never the
// SA panel's ('upcoming'|'ongoing'|'completed'|'cancelled') — the two only
// partially overlap and 'cancelled' has no engine equivalent at all. Pass
// `columnStatus` explicitly (SA vocabulary) when the caller wants the SA
// status set without touching the nested `data` payload's own status field
// (e.g. a plain SA status-change action) — otherwise it's derived from `t.status`.
export async function upsertTournamentToSupabase(t: Record<string, unknown>, columnStatus?: SATournament['status']): Promise<void> {
  if (!supabase) return;
  const rawStatus = t.status as string;
  const status = columnStatus ?? (
    rawStatus === 'created' || rawStatus === 'open' ? 'upcoming'
    : rawStatus === 'starting_soon' ? 'upcoming'
    : rawStatus === 'live' ? 'ongoing'
    : rawStatus === 'finished' ? 'completed'
    : (['upcoming', 'ongoing', 'completed', 'cancelled'].includes(rawStatus) ? rawStatus : 'upcoming')
  );
  try {
    const { error } = await supabase.from('tournaments').upsert({
      id: t.id,
      name: t.name,
      club: t.club ?? null,
      city: t.city ?? null,
      country: t.country ?? 'ES',
      format: t.format ?? null,
      status,
      start_date: t.date ?? null,
      max_players: t.maxPlayers ?? 0,
      creator_player_id: t.creatorId ?? null,
      data: t,
    });
    if (error) console.error('[Supabase] upsertTournament error:', error.message, error.details);
  } catch (err) { console.error('[Supabase] upsertTournament exception:', err); }
}

export async function deleteTournamentFromSupabase(id: string): Promise<void> {
  if (!supabase) return;
  try { await supabase.from('tournaments').delete().eq('id', id); } catch { /* silent */ }
}

// Quick games (requires `data JSONB` column on the quick_games table)
export async function getSAGamesFromSupabase(): Promise<SAGame[] | null> {
  if (!supabase) return null;
  try {
    const { data, error } = await supabase
      .from('quick_games')
      .select('*')
      .order('created_at', { ascending: false });
    if (error) return null;
    return (data ?? []).map(row => ({
      id: row.id as string,
      name: (row.name as string) ?? `Juego`,
      date: ((row.created_at as string) ?? '').split('T')[0],
      players: ((row.data as Record<string, unknown>)?.players as unknown[])?.length ?? 0,
      status: (row.status as SAGame['status']) ?? 'ongoing',
      rounds: (row.rounds_played as number) ?? 0,
      format: (row.format as string) ?? 'Americano',
      scoreConfig: (row.score_config as string) ?? 'puntos',
    }));
  } catch { return null; }
}

// SA-panel-safe game upsert: `quick_games.data` holds the full live game object
// (participants, round results, join code) that the real quick-game UI reads via
// fetchGameByCode/fetchGamesByCreator. A naive upsert from the SA summary form
// (name/date/players/format/rounds/status only) would clobber that real payload
// for existing games. This reads the current `data` first and merges the SA's
// edited fields into it, so a live game's real state survives an SA edit.
export async function upsertSAGameToSupabase(g: SAGame): Promise<void> {
  if (!supabase) return;
  try {
    const { data: existing } = await supabase.from('quick_games').select('data').eq('id', g.id).maybeSingle();
    const mergedData = {
      ...(existing?.data as Record<string, unknown> ?? {}),
      id: g.id, name: g.name, date: g.date, players: g.players,
      format: g.format, rounds: g.rounds, scoreConfig: g.scoreConfig, status: g.status,
    };
    const { error } = await supabase.from('quick_games').upsert({
      id: g.id,
      name: g.name ?? null,
      format: g.format ?? null,
      score_config: g.scoreConfig ?? 'puntos',
      status: g.status,
      rounds_played: g.rounds ?? 0,
      data: mergedData,
    });
    if (error) console.error('[Supabase] upsertSAGame error:', error.message, error.details);
  } catch (err) { console.error('[Supabase] upsertSAGame exception:', err); }
}

export async function upsertGameToSupabase(g: Record<string, unknown>): Promise<void> {
  if (!supabase) return;
  const rounds = Array.isArray(g.rounds) ? g.rounds as unknown[] : [];
  const scoreConfig = g.scoreConfig && typeof g.scoreConfig === 'object'
    ? (g.scoreConfig as Record<string, unknown>).type as string ?? 'puntos'
    : typeof g.scoreConfig === 'string' ? g.scoreConfig : 'puntos';
  const rawStatus = g.status as string;
  const status = rawStatus === 'finished' || rawStatus === 'completed' ? 'completed'
    : rawStatus === 'cancelled' ? 'cancelled'
    : rawStatus === 'created' ? 'ongoing'
    : 'ongoing';
  try {
    const { error } = await supabase.from('quick_games').upsert({
      id: g.id,
      name: g.name ?? null,
      format: g.format ?? null,
      score_config: scoreConfig,
      status,
      rounds_played: rounds.length,
      creator_player_id: g.creatorId ?? null,
      data: g,
    });
    if (error) console.error('[Supabase] upsertGame error:', error.message, error.details);
  } catch (err) { console.error('[Supabase] upsertGame exception:', err); }
}

export async function deleteGameFromSupabase(id: string): Promise<void> {
  if (!supabase) return;
  try { await supabase.from('quick_games').delete().eq('id', id); } catch (err) { console.warn('[Supabase] deleteGame failed:', err); }
}

// Register player (player-store write-through)
export async function registerPlayerToSupabase(p: {
  id: string; shortId?: string; name: string; email: string;
  phone?: string; sex?: string; country?: string; city?: string;
  level?: string; ranking?: number; rankingPoints?: number;
  authUserId?: string; plan?: string;
}): Promise<void> {
  if (!supabase) return;
  try {
    const { error } = await supabase.from('players').upsert({
      id: p.id,
      name: p.name,
      email: p.email,
      phone: p.phone ?? null,
      city: p.city ?? null,
      country: p.country ?? 'ES',
      ranking_points: p.rankingPoints ?? 0,
      status: 'active',
      role: 'player',
      ...(p.authUserId ? { user_id: p.authUserId } : {}),
      custom_fields: {
        shortId: p.shortId,
        ...(p.sex   ? { sex: p.sex }     : {}),
        ...(p.level ? { level: p.level } : {}),
        ...(p.plan  ? { plan: p.plan }   : {}),
        profileCompleted: 'false',
      },
    });
    if (error) console.error('[Supabase] registerPlayer error:', error.message, error.details);
  } catch (err) { console.error('[Supabase] registerPlayer exception:', err); }
}

export async function upsertFriendRequestToSupabase(req: {
  id: string; fromId: string; fromName: string;
  toId: string; toName: string; status: string; createdAt: string;
}): Promise<void> {
  if (!supabase) return;
  try {
    const { error } = await supabase.from('friend_requests').upsert({
      id: req.id,
      from_id: req.fromId,
      from_name: req.fromName,
      to_id: req.toId,
      to_name: req.toName,
      status: req.status,
      created_at: req.createdAt,
    });
    if (error) console.error('[Supabase] upsertFriendRequest error:', error.message);
  } catch (err) { console.error('[Supabase] upsertFriendRequest exception:', err); }
}
