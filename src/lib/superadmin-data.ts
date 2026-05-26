import { supabase } from './supabase';

export interface SAPlayer {
  id: string;
  name: string;
  email: string;
  phone: string;
  city: string;
  country: string;
  ranking: number;
  status: 'active' | 'blocked' | 'suspended';
  role: 'player' | 'club_admin' | 'federation_admin';
  joinedAt: string;
  lastActive: string;
  club?: string;
  customFields?: Record<string, string>;
}

export interface SAClub {
  id: string;
  name: string;
  city: string;
  country: string;
  courts: number;
  members: number;
  status: 'active' | 'inactive' | 'pending' | 'rejected';
  adminEmail: string;
  joinedAt: string;
  plan: 'free' | 'basic' | 'pro';
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

const MOCK_PLAYERS: SAPlayer[] = [
  { id: 'mock-1', name: 'Carlos Rodríguez', email: 'carlos@padelmgt.es', phone: '+34 612 345 678', city: 'Madrid', country: 'ES', ranking: 1250, status: 'active', role: 'player', joinedAt: '2024-01-15', lastActive: '2026-05-20', club: 'Club Padel Madrid' },
  { id: 'mock-2', name: 'María García', email: 'maria@padelmgt.es', phone: '+34 623 456 789', city: 'Barcelona', country: 'ES', ranking: 980, status: 'active', role: 'player', joinedAt: '2024-02-10', lastActive: '2026-05-22', club: 'RC Padel Barcelona' },
  { id: 'mock-3', name: 'Alejandro Martínez', email: 'alejandro@padelmgt.es', phone: '+34 634 567 890', city: 'Valencia', country: 'ES', ranking: 760, status: 'active', role: 'club_admin', joinedAt: '2024-01-20', lastActive: '2026-05-18', club: 'Padel Valencia CF' },
  { id: 'mock-4', name: 'Lucía Fernández', email: 'lucia@padelmgt.es', phone: '+34 645 678 901', city: 'Sevilla', country: 'ES', ranking: 1100, status: 'active', role: 'player', joinedAt: '2024-03-05', lastActive: '2026-05-21' },
  { id: 'mock-5', name: 'Pablo López', email: 'pablo@padelmgt.es', phone: '+34 656 789 012', city: 'Málaga', country: 'ES', ranking: 450, status: 'blocked', role: 'player', joinedAt: '2024-04-12', lastActive: '2026-04-30' },
  { id: 'mock-6', name: 'Ana Sánchez', email: 'ana@padelmgt.es', phone: '+34 667 890 123', city: 'Bilbao', country: 'ES', ranking: 820, status: 'active', role: 'player', joinedAt: '2024-02-28', lastActive: '2026-05-19', club: 'Padel Bilbao Sport' },
  { id: 'mock-7', name: 'David González', email: 'david@padelmgt.es', phone: '+34 678 901 234', city: 'Zaragoza', country: 'ES', ranking: 630, status: 'active', role: 'player', joinedAt: '2024-03-18', lastActive: '2026-05-15' },
  { id: 'mock-8', name: 'Elena Ruiz', email: 'elena@padelmgt.es', phone: '+34 689 012 345', city: 'Madrid', country: 'ES', ranking: 950, status: 'suspended', role: 'player', joinedAt: '2024-01-30', lastActive: '2026-05-10' },
  { id: 'mock-9', name: 'Javier Torres', email: 'javier@padelmgt.es', phone: '+34 690 123 456', city: 'Alicante', country: 'ES', ranking: 1050, status: 'active', role: 'player', joinedAt: '2024-04-25', lastActive: '2026-05-23', club: 'Costa Padel Alicante' },
  { id: 'mock-10', name: 'Sofía Díaz', email: 'sofia@padelmgt.es', phone: '+34 601 234 567', city: 'Barcelona', country: 'ES', ranking: 780, status: 'active', role: 'federation_admin', joinedAt: '2024-02-14', lastActive: '2026-05-24' },
];

const MOCK_CLUBS: SAClub[] = [
  { id: 'mc-1', name: 'Club Padel Madrid', city: 'Madrid', country: 'ES', courts: 8, members: 245, status: 'active', adminEmail: 'alejandro@padelmgt.es', joinedAt: '2024-01-10', plan: 'pro' },
  { id: 'mc-2', name: 'RC Padel Barcelona', city: 'Barcelona', country: 'ES', courts: 6, members: 180, status: 'active', adminEmail: 'rcpadel@barcelona.es', joinedAt: '2024-02-05', plan: 'basic' },
  { id: 'mc-3', name: 'Padel Valencia CF', city: 'Valencia', country: 'ES', courts: 4, members: 120, status: 'active', adminEmail: 'alejandro@padelmgt.es', joinedAt: '2024-01-18', plan: 'basic' },
  { id: 'mc-4', name: 'Padel Bilbao Sport', city: 'Bilbao', country: 'ES', courts: 3, members: 95, status: 'active', adminEmail: 'bilbaosport@padel.es', joinedAt: '2024-03-12', plan: 'free' },
  { id: 'mc-5', name: 'Costa Padel Alicante', city: 'Alicante', country: 'ES', courts: 5, members: 150, status: 'active', adminEmail: 'costa@padel.es', joinedAt: '2024-04-20', plan: 'basic' },
];

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
    return { totalPlayers: 0, activePlayers: 0, totalClubs: 0, pendingClubRequests: 0, tournamentsThisMonth: 0, tournamentsLastMonth: 0, gamesThisMonth: 0, totalGames: 0, pendingScoreRequests: 3, nps: 72, retentionRate: 84, monthlyRevenue: 0, growthPercent: 12 };
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
    pendingScoreRequests: 3,
    nps: 72,
    retentionRate: 84,
    monthlyRevenue: 0,
    growthPercent: 12,
  };
}

export function getSAPlayers(): SAPlayer[] {
  if (typeof window === 'undefined') return MOCK_PLAYERS;
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
        name: (p.name as string) || 'Jugador',
        email: (p.email as string) || '',
        phone: (p.phone as string) || '',
        city: (p.city as string) || '',
        country: (p.country as string) || 'ES',
        ranking: typeof p.ranking === 'number' ? p.ranking : typeof p.points === 'number' ? p.points : 0,
        status: (['active', 'blocked', 'suspended'].includes(p.status as string) ? p.status as SAPlayer['status'] : 'active'),
        role: (['player', 'club_admin', 'federation_admin'].includes(p.role as string) ? p.role as SAPlayer['role'] : 'player'),
        joinedAt: (p.joinedAt as string) || (p.createdAt as string) || new Date().toISOString().split('T')[0],
        lastActive: (p.lastActive as string) || new Date().toISOString().split('T')[0],
        club: (p.club as string) || undefined,
        customFields: (p.customFields as Record<string, string>) || {},
      }));
    } catch {
      // fallthrough
    }
  }

  const merged = fromStorage.length >= 10 ? fromStorage : [...fromStorage, ...MOCK_PLAYERS.slice(fromStorage.length)];
  return merged;
}

export function saveSAPlayers(players: SAPlayer[]): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem('padelmgt_sa_players', JSON.stringify(players));
}

export function getSAClubs(): SAClub[] {
  if (typeof window === 'undefined') return MOCK_CLUBS;
  const raw = localStorage.getItem('padelmgt_club_requests');
  let fromStorage: SAClub[] = [];
  if (raw) {
    try {
      const parsed = JSON.parse(raw) as Array<Record<string, unknown>>;
      fromStorage = parsed.map((c, i) => ({
        id: (c.id as string) || `cr-${i}`,
        name: (c.clubName as string) || (c.name as string) || 'Club',
        city: (c.city as string) || '',
        country: (c.country as string) || 'ES',
        courts: typeof c.courts === 'number' ? c.courts : 0,
        members: typeof c.members === 'number' ? c.members : 0,
        status: (['active', 'inactive', 'pending', 'rejected'].includes(c.status as string) ? c.status as SAClub['status'] : 'pending'),
        adminEmail: (c.adminEmail as string) || (c.email as string) || '',
        joinedAt: (c.joinedAt as string) || (c.createdAt as string) || new Date().toISOString().split('T')[0],
        plan: (['free', 'basic', 'pro'].includes(c.plan as string) ? c.plan as SAClub['plan'] : 'free'),
      }));
    } catch {
      // fallthrough
    }
  }

  const ids = new Set(fromStorage.map(c => c.id));
  const extra = MOCK_CLUBS.filter(m => !ids.has(m.id));
  return [...fromStorage, ...extra];
}

export function saveSAClubs(clubs: SAClub[]): void {
  if (typeof window === 'undefined') return;
  // Save to club_requests format so it integrates with existing app
  localStorage.setItem('padelmgt_club_requests', JSON.stringify(clubs));
}

export function getSATournaments(): SATournament[] {
  if (typeof window === 'undefined') return [];
  const raw = localStorage.getItem('padelmgt_tournaments_v2');
  if (!raw) return getMockTournaments();
  try {
    const parsed = JSON.parse(raw) as Array<Record<string, unknown>>;
    if (parsed.length === 0) return getMockTournaments();
    return parsed.map((t, i) => ({
      id: (t.id as string) || `t-${i}`,
      name: (t.name as string) || 'Torneo',
      club: (t.club as string) || '',
      city: (t.city as string) || '',
      date: (t.startDate as string) || (t.date as string) || '',
      players: typeof t.players === 'number' ? t.players : (Array.isArray(t.players) ? (t.players as unknown[]).length : 0),
      status: (['ongoing', 'upcoming', 'completed', 'cancelled'].includes(t.status as string) ? t.status as SATournament['status'] : 'upcoming'),
      rounds: typeof t.rounds === 'number' ? t.rounds : 0,
      format: (t.format as string) || (t.formatSlug as string) || 'Americano',
    }));
  } catch {
    return getMockTournaments();
  }
}

function getMockTournaments(): SATournament[] {
  return [
    { id: 'mt-1', name: 'Torneo Primavera Madrid', club: 'Club Padel Madrid', city: 'Madrid', date: '2026-05-15', players: 16, status: 'completed', rounds: 4, format: 'Americano' },
    { id: 'mt-2', name: 'Open Barcelona Padel', club: 'RC Padel Barcelona', city: 'Barcelona', date: '2026-05-22', players: 24, status: 'ongoing', rounds: 5, format: 'Mexicano' },
    { id: 'mt-3', name: 'Copa Valencia', club: 'Padel Valencia CF', city: 'Valencia', date: '2026-06-05', players: 8, status: 'upcoming', rounds: 3, format: 'Round Robin' },
    { id: 'mt-4', name: 'Torneo Verano Bilbao', club: 'Padel Bilbao Sport', city: 'Bilbao', date: '2026-04-20', players: 12, status: 'completed', rounds: 4, format: 'Americano' },
    { id: 'mt-5', name: 'Alicante Padel Open', club: 'Costa Padel Alicante', city: 'Alicante', date: '2026-05-01', players: 20, status: 'completed', rounds: 5, format: 'Mexicano' },
  ];
}

export function getSAGames(): SAGame[] {
  if (typeof window === 'undefined') return [];
  const raw = localStorage.getItem('padelmgt_games');
  if (!raw) return getMockGames();
  try {
    const parsed = JSON.parse(raw) as Array<Record<string, unknown>>;
    if (parsed.length === 0) return getMockGames();
    return parsed.map((g, i) => ({
      id: (g.id as string) || `g-${i}`,
      name: (g.name as string) || `Juego ${i + 1}`,
      date: (g.date as string) || (g.createdAt as string) || '',
      players: typeof g.players === 'number' ? g.players : (Array.isArray(g.players) ? (g.players as unknown[]).length : 0),
      status: (['ongoing', 'completed', 'cancelled'].includes(g.status as string) ? g.status as SAGame['status'] : 'completed'),
      rounds: typeof g.rounds === 'number' ? g.rounds : (typeof g.roundsPlayed === 'number' ? g.roundsPlayed : 0),
      format: (g.format as string) || 'Americano',
      scoreConfig: (g.scoreConfig as string) || (g.scoreMode as string) || 'puntos',
    }));
  } catch {
    return getMockGames();
  }
}

function getMockGames(): SAGame[] {
  return [
    { id: 'mg-1', name: 'Juego Rápido - Madrid #1', date: '2026-05-20', players: 8, status: 'completed', rounds: 4, format: 'Americano', scoreConfig: 'puntos' },
    { id: 'mg-2', name: 'Juego Rápido - Barcelona #1', date: '2026-05-21', players: 12, status: 'completed', rounds: 5, format: 'Mexicano', scoreConfig: 'tradicional' },
    { id: 'mg-3', name: 'Juego Rápido - Valencia #1', date: '2026-05-22', players: 8, status: 'ongoing', rounds: 2, format: 'Americano', scoreConfig: 'puntos' },
    { id: 'mg-4', name: 'Juego Rápido - Sevilla #1', date: '2026-05-23', players: 16, status: 'completed', rounds: 6, format: 'Mexicano', scoreConfig: 'tradicional' },
    { id: 'mg-5', name: 'Juego Rápido - Málaga #1', date: '2026-05-24', players: 8, status: 'ongoing', rounds: 1, format: 'Americano', scoreConfig: 'puntos' },
  ];
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

// ── Supabase integration ───────────────────────────────────────────────────────

// Map Supabase row → SAPlayer
function rowToSAPlayer(row: Record<string, unknown>): SAPlayer {
  return {
    id: row.id as string,
    name: row.name as string,
    email: row.email as string,
    phone: (row.phone as string) ?? '',
    city: (row.city as string) ?? '',
    country: (row.country as string) ?? 'ES',
    ranking: (row.ranking_points as number) ?? 0,
    status: (row.status as SAPlayer['status']) ?? 'active',
    role: (row.role as SAPlayer['role']) ?? 'player',
    joinedAt: ((row.joined_at as string) ?? '').split('T')[0],
    lastActive: ((row.last_active as string) ?? '').split('T')[0],
    club: (row.club as string) ?? undefined,
    customFields: (row.custom_fields as Record<string, string>) ?? {},
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
    ranking_points: p.ranking ?? 0,
    status: p.status,
    role: p.role,
    club: p.club || null,
    custom_fields: p.customFields ?? {},
    joined_at: p.joinedAt || new Date().toISOString(),
    last_active: p.lastActive || new Date().toISOString(),
  };
}

function rowToSAClub(row: Record<string, unknown>): SAClub {
  return {
    id: row.id as string,
    name: row.name as string,
    city: (row.city as string) ?? '',
    country: (row.country as string) ?? 'ES',
    courts: (row.courts as number) ?? 0,
    members: (row.members as number) ?? 0,
    status: (row.status as SAClub['status']) ?? 'pending',
    adminEmail: (row.admin_email as string) ?? '',
    joinedAt: ((row.joined_at as string) ?? '').split('T')[0],
    plan: (row.plan as SAClub['plan']) ?? 'free',
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
    const { data, error } = await supabase.from('players').select('*').order('joined_at', { ascending: false });
    if (error) return null;
    return (data ?? []).map(row => rowToSAPlayer(row as Record<string, unknown>));
  } catch { return null; }
}

export async function upsertSAPlayerToSupabase(player: SAPlayer): Promise<void> {
  if (!supabase) return;
  try { await supabase.from('players').upsert(playerToRow(player)); } catch { /* silent */ }
}

export async function deleteSAPlayerFromSupabase(id: string): Promise<void> {
  if (!supabase) return;
  try { await supabase.from('players').delete().eq('id', id); } catch { /* silent */ }
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

export async function upsertSAClubToSupabase(club: SAClub): Promise<void> {
  if (!supabase) return;
  try {
    await supabase.from('clubs').upsert({
      id: club.id, name: club.name, city: club.city, country: club.country,
      courts: club.courts, members: club.members, status: club.status,
      admin_email: club.adminEmail, plan: club.plan,
      joined_at: club.joinedAt || new Date().toISOString(),
    });
  } catch { /* silent */ }
}

export async function deleteSAClubFromSupabase(id: string): Promise<void> {
  if (!supabase) return;
  try { await supabase.from('clubs').delete().eq('id', id); } catch { /* silent */ }
}

// Admin users
export async function getSAAdminUsersFromSupabase(): Promise<SAAdminUser[] | null> {
  if (!supabase) return null;
  try {
    const { data, error } = await supabase.from('admin_users').select('*').order('created_at', { ascending: false });
    if (error) return null;
    return (data ?? []).map(row => rowToSAAdminUser(row as Record<string, unknown>));
  } catch { return null; }
}

export async function upsertSAAdminUserToSupabase(user: SAAdminUser): Promise<void> {
  if (!supabase) return;
  try {
    await supabase.from('admin_users').upsert({
      id: user.id, name: user.name, email: user.email,
      role: user.role, status: user.status,
      created_at: user.createdAt || new Date().toISOString(),
    });
  } catch { /* silent */ }
}

export async function deleteSAAdminUserFromSupabase(id: string): Promise<void> {
  if (!supabase) return;
  try { await supabase.from('admin_users').delete().eq('id', id); } catch { /* silent */ }
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
  if (!supabase) return 0;
  const clubs = getSAClubs();
  let count = 0;
  for (const c of clubs) {
    const { error } = await supabase.from('clubs').upsert({
      id: c.id, name: c.name, city: c.city, country: c.country,
      courts: c.courts, members: c.members, status: c.status,
      admin_email: c.adminEmail, plan: c.plan,
      joined_at: c.joinedAt || new Date().toISOString(),
    });
    if (!error) count++;
  }
  return count;
}
