-- PadelMGT Supabase Schema
-- Generated for migration from localStorage when backend is ready

-- Players
-- Note: id is TEXT (not UUID) so app-generated IDs like "player-00119" are accepted
CREATE TABLE players (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT UNIQUE NOT NULL,
  phone TEXT,
  city TEXT,
  country TEXT DEFAULT 'ES',
  ranking_points INTEGER DEFAULT 0,
  club TEXT,
  role TEXT DEFAULT 'player' CHECK (role IN ('player', 'club_admin', 'federation_admin')),
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'blocked', 'suspended')),
  custom_fields JSONB DEFAULT '{}',
  joined_at TIMESTAMPTZ DEFAULT NOW(),
  last_active TIMESTAMPTZ DEFAULT NOW()
);

-- Clubs
CREATE TABLE clubs (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  city TEXT,
  country TEXT DEFAULT 'ES',
  courts INTEGER DEFAULT 0,
  members INTEGER DEFAULT 0,
  plan TEXT DEFAULT 'free' CHECK (plan IN ('free', 'basic', 'pro')),
  status TEXT DEFAULT 'pending' CHECK (status IN ('active', 'inactive', 'pending', 'rejected')),
  admin_email TEXT,
  joined_at TIMESTAMPTZ DEFAULT NOW()
);

-- Player relationships
CREATE TABLE player_relationships (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
  player_id TEXT REFERENCES players(id) ON DELETE CASCADE,
  related_player_id TEXT REFERENCES players(id) ON DELETE CASCADE,
  relationship_type TEXT CHECK (relationship_type IN ('friend', 'rival', 'teammate')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(player_id, related_player_id)
);

-- Admin users
CREATE TABLE admin_users (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
  name TEXT NOT NULL,
  email TEXT UNIQUE NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('score_corrections', 'player_db', 'transactions', 'clubs')),
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Score correction requests
CREATE TABLE score_corrections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_type TEXT CHECK (entity_type IN ('tournament', 'game')),
  entity_id TEXT NOT NULL,
  entity_name TEXT,
  round_num INTEGER,
  court_num INTEGER,
  requested_by TEXT,
  requested_by_id TEXT,
  current_score TEXT,
  requested_score TEXT,
  reason TEXT,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  reviewed_by TEXT,
  reviewed_at TIMESTAMPTZ,
  review_notes TEXT,
  affected_player_ids TEXT[],
  ranking_adjusted BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Promo codes
CREATE TABLE promo_codes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT UNIQUE NOT NULL,
  type TEXT CHECK (type IN ('percent_off', 'fixed_off', 'free_trial', 'feature_unlock')),
  value NUMERIC DEFAULT 0,
  description TEXT,
  max_uses INTEGER,
  used_count INTEGER DEFAULT 0,
  expires_at TIMESTAMPTZ,
  is_active BOOLEAN DEFAULT TRUE,
  created_by TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Promo redemptions
CREATE TABLE promo_redemptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  promo_id UUID REFERENCES promo_codes(id) ON DELETE SET NULL,
  promo_code TEXT NOT NULL,
  user_id TEXT NOT NULL,
  user_email TEXT,
  user_name TEXT,
  redeemed_at TIMESTAMPTZ DEFAULT NOW()
);

-- Custom player fields definition
CREATE TABLE player_field_definitions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  field_name TEXT UNIQUE NOT NULL,
  field_type TEXT DEFAULT 'text',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Tournaments
CREATE TABLE tournaments (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  club TEXT,
  city TEXT,
  country TEXT DEFAULT 'ES',
  format TEXT,
  status TEXT DEFAULT 'upcoming' CHECK (status IN ('upcoming', 'ongoing', 'completed', 'cancelled')),
  start_date DATE,
  end_date DATE,
  max_players INTEGER DEFAULT 16,
  data JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Quick games
CREATE TABLE quick_games (
  id TEXT PRIMARY KEY,
  name TEXT,
  format TEXT,
  score_config TEXT DEFAULT 'puntos',
  status TEXT DEFAULT 'ongoing' CHECK (status IN ('ongoing', 'completed', 'cancelled')),
  rounds_played INTEGER DEFAULT 0,
  data JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Friend requests
CREATE TABLE friend_requests (
  id TEXT PRIMARY KEY,
  from_id TEXT NOT NULL,
  from_name TEXT,
  to_id TEXT NOT NULL,
  to_name TEXT,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'rejected')),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Player-created leagues
CREATE TABLE player_leagues (
  id TEXT PRIMARY KEY,
  code TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  created_by TEXT REFERENCES players(id) ON DELETE CASCADE,
  created_by_name TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  is_open BOOLEAN DEFAULT FALSE,
  is_public BOOLEAN DEFAULT TRUE,
  default_points_win INTEGER DEFAULT 3,
  default_points_draw INTEGER DEFAULT 1,
  default_points_loss INTEGER DEFAULT 0
);

-- League join requests
CREATE TABLE league_join_requests (
  id TEXT PRIMARY KEY,
  league_id TEXT REFERENCES player_leagues(id) ON DELETE CASCADE,
  player_id TEXT REFERENCES players(id) ON DELETE CASCADE,
  player_name TEXT,
  player_email TEXT,
  message TEXT,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  reviewed_at TIMESTAMPTZ,
  reviewed_by TEXT REFERENCES players(id),
  UNIQUE(league_id, player_id)
);

-- League seasons
CREATE TABLE league_seasons (
  id TEXT PRIMARY KEY,
  league_id TEXT REFERENCES player_leagues(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  points_win INTEGER DEFAULT 3,
  points_draw INTEGER DEFAULT 1,
  points_loss INTEGER DEFAULT 0,
  status TEXT DEFAULT 'upcoming' CHECK (status IN ('upcoming', 'active', 'completed')),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- League members
CREATE TABLE league_members (
  id TEXT PRIMARY KEY,
  league_id TEXT REFERENCES player_leagues(id) ON DELETE CASCADE,
  player_id TEXT REFERENCES players(id) ON DELETE CASCADE,
  player_name TEXT,
  role TEXT DEFAULT 'member' CHECK (role IN ('admin', 'member')),
  joined_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(league_id, player_id)
);

-- Indexes for common queries
CREATE INDEX idx_players_status ON players(status);
CREATE INDEX idx_players_email ON players(email);
CREATE INDEX idx_clubs_status ON clubs(status);
CREATE INDEX idx_score_corrections_status ON score_corrections(status);
CREATE INDEX idx_score_corrections_entity ON score_corrections(entity_type, entity_id);
CREATE INDEX idx_player_relationships_player ON player_relationships(player_id);
CREATE INDEX idx_tournaments_status ON tournaments(status);
CREATE INDEX idx_tournaments_start_date ON tournaments(start_date);

-- Row Level Security (RLS)
ALTER TABLE players ENABLE ROW LEVEL SECURITY;
ALTER TABLE clubs ENABLE ROW LEVEL SECURITY;
ALTER TABLE admin_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE score_corrections ENABLE ROW LEVEL SECURITY;
ALTER TABLE player_relationships ENABLE ROW LEVEL SECURITY;
ALTER TABLE player_field_definitions ENABLE ROW LEVEL SECURITY;
ALTER TABLE tournaments ENABLE ROW LEVEL SECURITY;
ALTER TABLE quick_games ENABLE ROW LEVEL SECURITY;

-- Super admin policy (adjust service_role as needed)
-- These are placeholder policies; configure auth.uid() checks per your auth setup
CREATE POLICY "Super admin full access on players"
  ON players FOR ALL TO service_role USING (true) WITH CHECK (true);

CREATE POLICY "Super admin full access on clubs"
  ON clubs FOR ALL TO service_role USING (true) WITH CHECK (true);

CREATE POLICY "Super admin full access on admin_users"
  ON admin_users FOR ALL TO service_role USING (true) WITH CHECK (true);

CREATE POLICY "Super admin full access on score_corrections"
  ON score_corrections FOR ALL TO service_role USING (true) WITH CHECK (true);

CREATE POLICY "Super admin full access on player_relationships"
  ON player_relationships FOR ALL TO service_role USING (true) WITH CHECK (true);

CREATE POLICY "Super admin full access on player_field_definitions"
  ON player_field_definitions FOR ALL TO service_role USING (true) WITH CHECK (true);

CREATE POLICY "Super admin full access on tournaments"
  ON tournaments FOR ALL TO service_role USING (true) WITH CHECK (true);

CREATE POLICY "Super admin full access on quick_games"
  ON quick_games FOR ALL TO service_role USING (true) WITH CHECK (true);

-- Disable RLS for super admin tables (anon key has full access)
-- Configure proper RLS policies when enabling production auth
ALTER TABLE IF EXISTS players               DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS clubs                 DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS admin_users           DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS score_corrections     DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS player_field_definitions DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS player_relationships  DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS tournaments           DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS quick_games           DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS friend_requests       DISABLE ROW LEVEL SECURITY;

-- ── Family members (minors and dependents without platform accounts) ──────────

CREATE TABLE family_members (
  id TEXT PRIMARY KEY,               -- "FM-XXXX-1234"
  owner_id TEXT REFERENCES players(id) ON DELETE CASCADE,
  full_name TEXT NOT NULL,
  relation_type TEXT NOT NULL CHECK (relation_type IN ('hijo','hija','esposo','esposa','pareja','dependiente')),
  sex TEXT NOT NULL CHECK (sex IN ('masculino','femenino')),
  birth_date DATE NOT NULL,
  email TEXT,
  linked_player_id TEXT REFERENCES players(id) ON DELETE SET NULL,
  invitation_status TEXT DEFAULT 'none' CHECK (invitation_status IN ('none','invited','accepted')),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ── Family links between two platform users (requires mutual approval) ────────

CREATE TABLE family_links (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
  from_player_id TEXT REFERENCES players(id) ON DELETE CASCADE,
  to_player_id TEXT REFERENCES players(id) ON DELETE CASCADE,
  to_player_email TEXT,
  from_player_name TEXT,
  relation_from_to TEXT NOT NULL,
  relation_to_from TEXT NOT NULL,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending','accepted','rejected')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(from_player_id, to_player_id)
);

ALTER TABLE IF EXISTS family_members DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS family_links   DISABLE ROW LEVEL SECURITY;

-- Family approval requests (guardian must approve a minor's participation invited by someone else)
CREATE TABLE family_approvals (
  id TEXT PRIMARY KEY,
  guardian_id TEXT REFERENCES players(id) ON DELETE CASCADE,
  family_member_id TEXT,
  family_member_name TEXT,
  context TEXT CHECK (context IN ('quick_game','tournament','personalizado')),
  entity_id TEXT,
  entity_name TEXT,
  entity_date TEXT,
  from_player_id TEXT,
  from_player_name TEXT,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending','approved','rejected')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  responded_at TIMESTAMPTZ
);

ALTER TABLE IF EXISTS family_approvals DISABLE ROW LEVEL SECURITY;
