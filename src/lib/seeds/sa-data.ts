/**
 * seeds/sa-data.ts
 *
 * Demo seed data for the Superadmin panel.
 * Extracted from superadmin-data.ts so that store/API logic is free of
 * hard-coded data arrays and mock helpers.
 *
 * NOTE: Types are defined inline here (not imported from superadmin-data) to
 * avoid circular module dependencies.
 */

// Inline minimal types — keep in sync with superadmin-data.ts
interface SAPlayer {
  id: string; shortId: string; name: string; email: string; phone: string;
  sex?: 'M' | 'F'; city: string; country: string;
  level?: 'beginner' | 'intermediate' | 'advanced';
  ranking: number; rankingPoints: number;
  status: 'active' | 'blocked' | 'suspended';
  role: 'player' | 'club_admin' | 'federation_admin';
  profileCompleted?: boolean; joinedAt: string; lastActive: string;
  club?: string; photoUrl?: string; customFields?: Record<string, string>;
}

interface SAClub {
  id: string; name: string; clubType: string; city: string; country: string;
  address: string; description: string; courts: number; courtTypes: string[];
  amenities: string[]; members: number;
  status: 'active' | 'inactive' | 'pending' | 'rejected';
  adminEmail: string; ownerName: string; ownerPhone: string; ownerEmail: string;
  message: string; rejectReason?: string; joinedAt: string;
  plan: 'free' | 'basic' | 'pro'; mapsUrl?: string;
}

interface SATournament {
  id: string; name: string; club: string; city: string; date: string;
  players: number; status: 'ongoing' | 'upcoming' | 'completed' | 'cancelled';
  rounds: number; format: string;
}

interface SAGame {
  id: string; name: string; date: string; players: number;
  status: 'ongoing' | 'completed' | 'cancelled';
  rounds: number; format: string; scoreConfig: string;
}

// ── Mock players (shown in SA panel when localStorage has no real data) ────────

export const MOCK_PLAYERS: SAPlayer[] = [
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

// ── Mock clubs ────────────────────────────────────────────────────────────────

export const MOCK_CLUBS: SAClub[] = [
  { id: 'mc-1', name: 'Club Padel Madrid', clubType: 'Club Privado', city: 'Madrid', country: 'ES', address: 'Calle del Padel 12, 28001 Madrid', description: 'Club de padel privado con instalaciones de primer nivel en el centro de Madrid.', courts: 8, courtTypes: ['Cristal', 'Muro'], amenities: ['Vestuarios', 'Cafeteria', 'Parking', 'Tienda'], members: 245, status: 'active', adminEmail: 'alejandro@padelmgt.es', ownerName: 'Alejandro Martinez', ownerPhone: '+34 634 567 890', ownerEmail: 'alejandro@padelmgt.es', message: 'Solicito la incorporacion de nuestro club a la plataforma para gestionar torneos.', joinedAt: '2024-01-10', plan: 'pro' },
  { id: 'mc-2', name: 'RC Padel Barcelona', clubType: 'Club Publico', city: 'Barcelona', country: 'ES', address: 'Av. Diagonal 500, 08006 Barcelona', description: 'Club deportivo con amplia tradicion en la ciudad condal.', courts: 6, courtTypes: ['Cristal'], amenities: ['Vestuarios', 'Cafeteria'], members: 180, status: 'active', adminEmail: 'rcpadel@barcelona.es', ownerName: 'Ramon Carles', ownerPhone: '+34 932 111 222', ownerEmail: 'rcpadel@barcelona.es', message: 'Club con 5 anos de historia. Queremos digitalizarnos.', joinedAt: '2024-02-05', plan: 'basic' },
  { id: 'mc-3', name: 'Padel Valencia CF', clubType: 'Club Privado', city: 'Valencia', country: 'ES', address: 'Carrer del Padel 3, 46001 Valencia', description: 'Club moderno con pistas cubiertas y servicio profesional.', courts: 4, courtTypes: ['Cristal', 'Hierba Artificial'], amenities: ['Vestuarios', 'Parking'], members: 120, status: 'active', adminEmail: 'alejandro@padelmgt.es', ownerName: 'Vicente Pla', ownerPhone: '+34 961 234 567', ownerEmail: 'vicent@padelvalencia.es', message: 'Solicitamos acceso para organizar nuestra liga interna.', joinedAt: '2024-01-18', plan: 'basic' },
  { id: 'mc-4', name: 'Padel Bilbao Sport', clubType: 'Club Deportivo', city: 'Bilbao', country: 'ES', address: 'Calle Autonomia 5, 48001 Bilbao', description: 'Instalaciones deportivas multidisciplinares en el corazon de Bilbao.', courts: 3, courtTypes: ['Muro'], amenities: ['Vestuarios', 'Gimnasio'], members: 95, status: 'active', adminEmail: 'bilbaosport@padel.es', ownerName: 'Iker Etxebarria', ownerPhone: '+34 944 321 654', ownerEmail: 'bilbaosport@padel.es', message: 'Queremos gestionar nuestros torneos mensuales desde la plataforma.', joinedAt: '2024-03-12', plan: 'free' },
  { id: 'mc-5', name: 'Costa Padel Alicante', clubType: 'Club Privado', city: 'Alicante', country: 'ES', address: 'Playa de San Juan, 03016 Alicante', description: 'Club al aire libre con vistas al Mediterraneo. Ambiente familiar y profesional.', courts: 5, courtTypes: ['Cristal', 'Muro'], amenities: ['Vestuarios', 'Cafeteria', 'Piscina', 'Parking'], members: 150, status: 'active', adminEmail: 'costa@padel.es', ownerName: 'Francisco Costa', ownerPhone: '+34 965 432 876', ownerEmail: 'costa@padel.es', message: 'Somos un club de playa con gran demanda. Necesitamos herramientas de gestion.', joinedAt: '2024-04-20', plan: 'basic' },
];

// ── Mock tournaments ──────────────────────────────────────────────────────────

export const MOCK_TOURNAMENTS: SATournament[] = [
  { id: 'mt-1', name: 'Torneo Primavera Madrid', club: 'Club Padel Madrid', city: 'Madrid', date: '2026-05-15', players: 16, status: 'completed', rounds: 4, format: 'Americano' },
  { id: 'mt-2', name: 'Open Barcelona Padel', club: 'RC Padel Barcelona', city: 'Barcelona', date: '2026-05-22', players: 24, status: 'ongoing', rounds: 5, format: 'Mexicano' },
  { id: 'mt-3', name: 'Copa Valencia', club: 'Padel Valencia CF', city: 'Valencia', date: '2026-06-05', players: 8, status: 'upcoming', rounds: 3, format: 'Round Robin' },
  { id: 'mt-4', name: 'Torneo Verano Bilbao', club: 'Padel Bilbao Sport', city: 'Bilbao', date: '2026-04-20', players: 12, status: 'completed', rounds: 4, format: 'Americano' },
  { id: 'mt-5', name: 'Alicante Padel Open', club: 'Costa Padel Alicante', city: 'Alicante', date: '2026-05-01', players: 20, status: 'completed', rounds: 5, format: 'Mexicano' },
];

// ── Mock quick games ──────────────────────────────────────────────────────────

export const MOCK_GAMES: SAGame[] = [
  { id: 'mg-1', name: 'Juego Rapido - Madrid #1', date: '2026-05-20', players: 8, status: 'completed', rounds: 4, format: 'Americano', scoreConfig: 'puntos' },
  { id: 'mg-2', name: 'Juego Rapido - Barcelona #1', date: '2026-05-21', players: 12, status: 'completed', rounds: 5, format: 'Mexicano', scoreConfig: 'tradicional' },
  { id: 'mg-3', name: 'Juego Rapido - Valencia #1', date: '2026-05-22', players: 8, status: 'ongoing', rounds: 2, format: 'Americano', scoreConfig: 'puntos' },
  { id: 'mg-4', name: 'Juego Rapido - Sevilla #1', date: '2026-05-23', players: 16, status: 'completed', rounds: 6, format: 'Mexicano', scoreConfig: 'tradicional' },
  { id: 'mg-5', name: 'Juego Rapido - Malaga #1', date: '2026-05-24', players: 8, status: 'ongoing', rounds: 1, format: 'Americano', scoreConfig: 'puntos' },
];
