import { supabase } from './supabase';

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
  level?: 'beginner' | 'intermediate' | 'advanced';
  ranking: number;
  rankingPoints: number;
  status: 'active' | 'blocked' | 'suspended';
  role: 'player' | 'club_admin' | 'federation_admin';
  profileCompleted?: boolean;
  joinedAt: string;
  lastActive: string;
  club?: string;
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
  { id: 'mock-1', shortId: '#00001', name: 'Carlos Rodriguez', email: 'carlos@padelmgt.es', phone: '+34 612 345 678', sex: 'M', city: 'Madrid', country: 'ES', level: 'advanced', ranking: 1, rankingPoints: 1250, status: 'active', role: 'player', profileCompleted: true, joinedAt: '2024-01-15', lastActive: '2026-05-20', club: 'Club Padel Madrid' },
  { id: 'mock-2', shortId: '#00002', name: 'Maria Garcia', email: 'maria@padelmgt.es', phone: '+34 623 456 789', sex: 'F', city: 'Barcelona', country: 'ES', level: 'intermediate', ranking: 2, rankingPoints: 980, status: 'active', role: 'player', profileCompleted: true, joinedAt: '2024-02-10', lastActive: '2026-05-22', club: 'RC Padel Barcelona' },
  { id: 'mock-3', shortId: '#00003', name: 'Alejandro Martinez', email: 'alejandro@padelmgt.es', phone: '+34 634 567 890', sex: 'M', city: 'Valencia', country: 'ES', level: 'advanced', ranking: 3, rankingPoints: 760, status: 'active', role: 'club_admin', profileCompleted: true, joinedAt: '2024-01-20', lastActive: '2026-05-18', club: 'Padel Valencia CF' },
  { id: 'mock-4', shortId: '#00004', name: 'Lucia Fernandez', email: 'lucia@padelmgt.es', phone: '+34 645 678 901', sex: 'F', city: 'Sevilla', country: 'ES', level: 'advanced', ranking: 4, rankingPoints: 1100, status: 'active', role: 'player', profileCompleted: true, joinedAt: '2024-03-05', lastActive: '2026-05-21' },
  { id: 'mock-5', shortId: '#00005', name: 'Pablo Lopez', email: 'pablo@padelmgt.es', phone: '+34 656 789 012', sex: 'M', city: 'Malaga', country: 'ES', level: 'beginner', ranking: 5, rankingPoints: 450, status: 'blocked', role: 'player', profileCompleted: false, joinedAt: '2024-04-12', lastActive: '2026-04-30' },
  { id: 'mock-6', shortId: '#00006', name: 'Ana Sanchez', email: 'ana@padelmgt.es', phone: '+34 667 890 123', sex: 'F', city: 'Bilbao', country: 'ES', level: 'intermediate', ranking: 6, rankingPoints: 820, status: 'active', role: 'player', profileCompleted: true, joinedAt: '2024-02-28', lastActive: '2026-05-19', club: 'Padel Bilbao Sport' },
  { id: 'mock-7', shortId: '#00007', name: 'David Gonzalez', email: 'david@padelmgt.es', phone: '+34 678 901 234', sex: 'M', city: 'Zaragoza', country: 'ES', level: 'intermediate', ranking: 7, rankingPoints: 630, status: 'active', role: 'player', profileCompleted: true, joinedAt: '2024-03-18', lastActive: '2026-05-15' },
  { id: 'mock-8', shortId: '#00008', name: 'Elena Ruiz', email: 'elena@padelmgt.es', phone: '+34 689 012 345', sex: 'F', city: 'Madrid', country: 'ES', level: 'advanced', ranking: 8, rankingPoints: 950, status: 'suspended', role: 'player', profileCompleted: false, joinedAt: '2024-01-30', lastActive: '2026-05-10' },
  { id: 'mock-9', shortId: '#00009', name: 'Javier Torres', email: 'javier@padelmgt.es', phone: '+34 690 123 456', sex: 'M', city: 'Alicante', country: 'ES', level: 'advanced', ranking: 9, rankingPoints: 1050, status: 'active', role: 'player', profileCompleted: true, joinedAt: '2024-04-25', lastActive: '2026-05-23', club: 'Costa Padel Alicante' },
  { id: 'mock-10', shortId: '#00010', name: 'Sofia Diaz', email: 'sofia@padelmgt.es', phone: '+34 601 234 567', sex: 'F', city: 'Barcelona', country: 'ES', level: 'intermediate', ranking: 10, rankingPoints: 780, status: 'active', role: 'federation_admin', profileCompleted: true, joinedAt: '2024-02-14', lastActive: '2026-05-24' },
];

const MOCK_CLUBS: SAClub[] = [
  { id: 'mc-1', name: 'Club Padel Madrid', clubType: 'Club Privado', city: 'Madrid', country: 'ES', address: 'Calle del Padel 12, 28001 Madrid', description: 'Club de padel privado con instalaciones de primer nivel en el centro de Madrid.', courts: 8, courtTypes: ['Cristal', 'Muro'], amenities: ['Vestuarios', 'Cafeteria', 'Parking', 'Tienda'], members: 245, status: 'active', adminEmail: 'alejandro@padelmgt.es', ownerName: 'Alejandro Martinez', ownerPhone: '+34 634 567 890', ownerEmail: 'alejandro@padelmgt.es', message: 'Solicito la incorporacion de nuestro club a la plataforma para gestionar torneos.', joinedAt: '2024-01-10', plan: 'pro' },
  { id: 'mc-2', name: 'RC Padel Barcelona', clubType: 'Club Publico', city: 'Barcelona', country: 'ES', address: 'Av. Diagonal 500, 08006 Barcelona', description: 'Club deportivo con amplia tradicion en la ciudad condal.', courts: 6, courtTypes: ['Cristal'], amenities: ['Vestuarios', 'Cafeteria'], members: 180, status: 'active', adminEmail: 'rcpadel@barcelona.es', ownerName: 'Ramon Carles', ownerPhone: '+34 932 111 222', ownerEmail: 'rcpadel@barcelona.es', message: 'Club con 5 anos de historia. Queremos digitalizarnos.', joinedAt: '2024-02-05', plan: 'basic' },
  { id: 'mc-3', name: 'Padel Valencia CF', clubType: 'Club Privado', city: 'Valencia', country: 'ES', address: 'Carrer del Padel 3, 46001 Valencia', description: 'Club moderno con pistas cubiertas y servicio profesional.', courts: 4, courtTypes: ['Cristal', 'Hierba Artificial'], amenities: ['Vestuarios', 'Parking'], members: 120, status: 'active', adminEmail: 'alejandro@padelmgt.es', ownerName: 'Vicente Pla', ownerPhone: '+34 961 234 567', ownerEmail: 'vicent@padelvalencia.es', message: 'Solicitamos acceso para organizar nuestra liga interna.', joinedAt: '2024-01-18', plan: 'basic' },
  { id: 'mc-4', name: 'Padel Bilbao Sport', clubType: 'Club Deportivo', city: 'Bilbao', country: 'ES', address: 'Calle Autonomia 5, 48001 Bilbao', description: 'Instalaciones deportivas multidisciplinares en el corazon de Bilbao.', courts: 3, courtTypes: ['Muro'], amenities: ['Vestuarios', 'Gimnasio'], members: 95, status: 'active', adminEmail: 'bilbaosport@padel.es', ownerName: 'Iker Etxebarria', ownerPhone: '+34 944 321 654', ownerEmail: 'bilbaosport@padel.es', message: 'Queremos gestionar nuestros torneos mensuales desde la plataforma.', joinedAt: '2024-03-12', plan: 'free' },
  { id: 'mc-5', name: 'Costa Padel Alicante', clubType: 'Club Privado', city: 'Alicante', country: 'ES', address: 'Playa de San Juan, 03016 Alicante', description: 'Club al aire libre con vistas al Mediterraneo. Ambiente familiar y profesional.', courts: 5, courtTypes: ['Cristal', 'Muro'], amenities: ['Vestuarios', 'Cafeteria', 'Piscina', 'Parking'], members: 150, status: 'active', adminEmail: 'costa@padel.es', ownerName: 'Francisco Costa', ownerPhone: '+34 965 432 876', ownerEmail: 'costa@padel.es', message: 'Somos un club de playa con gran demanda. Necesitamos herramientas de gestion.', joinedAt: '2024-04-20', plan: 'basic' },
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
        shortId: (p.shortId as string) || `#${String(i + 1).padStart(5, '0')}`,
        name: (p.name as string) || 'Jugador',
        email: (p.email as string) || '',
        password: (p.password as string) || undefined,
        phone: (p.phone as string) || '',
        sex: (['M', 'F'].includes(p.sex as string) ? p.sex as 'M' | 'F' : undefined),
        city: (p.city as string) || '',
        country: (p.country as string) || 'ES',
        level: (['beginner', 'intermediate', 'advanced'].includes(p.level as string) ? p.level as SAPlayer['level'] : undefined),
        ranking: typeof p.ranking === 'number' ? p.ranking : 0,
        rankingPoints: typeof p.rankingPoints === 'number' ? p.rankingPoints : typeof p.points === 'number' ? p.points : 0,
        status: (['active', 'blocked', 'suspended'].includes(p.status as string) ? p.status as SAPlayer['status'] : 'active'),
        role: (['player', 'club_admin', 'federation_admin'].includes(p.role as string) ? p.role as SAPlayer['role'] : 'player'),
        profileCompleted: typeof p.profileCompleted === 'boolean' ? p.profileCompleted : true,
        joinedAt: (p.joinedAt as string) || (p.createdAt as string) || new Date().toISOString().split('T')[0],
        lastActive: (p.lastActive as string) || new Date().toISOString().split('T')[0],
        club: (p.club as string) || undefined,
        photoUrl: (p.photoUrl as string) || (p.photo as string) || undefined,
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
    club: p.club,
    phone: p.phone,
    photoUrl: p.photoUrl,
    customFields: p.customFields,
    status: p.status,
    role: p.role,
  }));
  localStorage.setItem('padelmgt_registered_players', JSON.stringify(regPlayers));
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
  localStorage.setItem('padelmgt_club_requests', JSON.stringify(clubs));
}

export function saveSATournaments(tournaments: SATournament[]): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem('padelmgt_tournaments_v2', JSON.stringify(tournaments));
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
    return getMockGames();
  }
}

function getMockGames(): SAGame[] {
  return [
    { id: 'mg-1', name: 'Juego Rapido - Madrid #1', date: '2026-05-20', players: 8, status: 'completed', rounds: 4, format: 'Americano', scoreConfig: 'puntos' },
    { id: 'mg-2', name: 'Juego Rapido - Barcelona #1', date: '2026-05-21', players: 12, status: 'completed', rounds: 5, format: 'Mexicano', scoreConfig: 'tradicional' },
    { id: 'mg-3', name: 'Juego Rapido - Valencia #1', date: '2026-05-22', players: 8, status: 'ongoing', rounds: 2, format: 'Americano', scoreConfig: 'puntos' },
    { id: 'mg-4', name: 'Juego Rapido - Sevilla #1', date: '2026-05-23', players: 16, status: 'completed', rounds: 6, format: 'Mexicano', scoreConfig: 'tradicional' },
    { id: 'mg-5', name: 'Juego Rapido - Malaga #1', date: '2026-05-24', players: 8, status: 'ongoing', rounds: 1, format: 'Americano', scoreConfig: 'puntos' },
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
    shortId: (row.short_id as string) ?? '',
    name: row.name as string,
    email: row.email as string,
    phone: (row.phone as string) ?? '',
    city: (row.city as string) ?? '',
    country: (row.country as string) ?? 'ES',
    ranking: (row.ranking as number) ?? 0,
    rankingPoints: (row.ranking_points as number) ?? 0,
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
    ranking_points: p.rankingPoints ?? p.ranking ?? 0,
    status: p.status,
    role: p.role,
    club: p.club || null,
    custom_fields: p.customFields ?? {},
    joined_at: p.joinedAt || new Date().toISOString(),
    last_active: p.lastActive || new Date().toISOString(),
    // Note: sex, level, shortId, profileCompleted stored in custom_fields or as extra columns when schema is extended
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

// Tournaments (requires `data JSONB` column on the tournaments table)
export async function getSATournamentsFromSupabase(): Promise<SATournament[] | null> {
  if (!supabase) return null;
  try {
    const { data, error } = await supabase
      .from('tournaments')
      .select('*')
      .order('created_at', { ascending: false });
    if (error) return null;
    return (data ?? []).map(row => ({
      id: row.id as string,
      name: row.name as string,
      club: (row.club as string) ?? '',
      city: (row.city as string) ?? '',
      date: ((row.start_date as string) ?? '').split('T')[0],
      players: (row.max_players as number) ?? 0,
      status: (row.status as SATournament['status']) ?? 'upcoming',
      rounds: ((row.data as Record<string, unknown>)?.currentRound as number) ?? 0,
      format: (row.format as string) ?? 'Americano',
    }));
  } catch { return null; }
}

export async function upsertTournamentToSupabase(t: Record<string, unknown>): Promise<void> {
  if (!supabase) return;
  try {
    await supabase.from('tournaments').upsert({
      id: t.id,
      name: t.name,
      club: t.club ?? null,
      city: t.city ?? null,
      country: t.country ?? 'ES',
      format: t.format ?? null,
      status: t.status ?? 'upcoming',
      start_date: t.date ?? null,
      max_players: t.maxPlayers ?? 0,
      data: t,
    });
  } catch { /* silent */ }
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

export async function upsertGameToSupabase(g: Record<string, unknown>): Promise<void> {
  if (!supabase) return;
  try {
    const players = Array.isArray(g.players) ? g.players as unknown[] : [];
    const rounds = Array.isArray(g.rounds) ? g.rounds as unknown[] : [];
    const scoreConfig = g.scoreConfig && typeof g.scoreConfig === 'object'
      ? (g.scoreConfig as Record<string, unknown>).type as string ?? 'puntos'
      : typeof g.scoreConfig === 'string' ? g.scoreConfig : 'puntos';
    await supabase.from('quick_games').upsert({
      id: g.id,
      name: g.name ?? null,
      format: g.format ?? null,
      score_config: scoreConfig,
      status: g.status === 'finished' ? 'completed' : (g.status as string) ?? 'ongoing',
      rounds_played: rounds.length,
      data: g,
    });
  } catch { /* silent */ }
}

export async function deleteGameFromSupabase(id: string): Promise<void> {
  if (!supabase) return;
  try { await supabase.from('quick_games').delete().eq('id', id); } catch { /* silent */ }
}

// Register player (player-store write-through)
export async function registerPlayerToSupabase(p: {
  id: string; shortId?: string; name: string; email: string;
  phone?: string; sex?: string; country?: string; city?: string;
  level?: string; ranking?: number; rankingPoints?: number;
}): Promise<void> {
  if (!supabase) return;
  try {
    await supabase.from('players').upsert({
      id: p.id,
      name: p.name,
      email: p.email,
      phone: p.phone ?? null,
      city: p.city ?? null,
      country: p.country ?? 'ES',
      ranking_points: p.rankingPoints ?? 0,
      status: 'active',
      role: 'player',
      custom_fields: { shortId: p.shortId, sex: p.sex, level: p.level },
    });
  } catch { /* silent */ }
}
