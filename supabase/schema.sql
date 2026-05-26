-- PadelMGT Supabase Schema
-- Generated for migration from localStorage when backend is ready

-- Players
CREATE TABLE players (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
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
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
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
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  player_id UUID REFERENCES players(id) ON DELETE CASCADE,
  related_player_id UUID REFERENCES players(id) ON DELETE CASCADE,
  relationship_type TEXT CHECK (relationship_type IN ('friend', 'rival', 'teammate')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(player_id, related_player_id)
);

-- Admin users
CREATE TABLE admin_users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
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
  current_score TEXT,
  requested_score TEXT,
  reason TEXT,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  created_at TIMESTAMPTZ DEFAULT NOW()
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
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  club TEXT,
  city TEXT,
  country TEXT DEFAULT 'ES',
  format TEXT,
  status TEXT DEFAULT 'upcoming' CHECK (status IN ('upcoming', 'ongoing', 'completed', 'cancelled')),
  start_date DATE,
  end_date DATE,
  max_players INTEGER DEFAULT 16,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Quick games
CREATE TABLE quick_games (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT,
  format TEXT,
  score_config TEXT DEFAULT 'puntos',
  status TEXT DEFAULT 'ongoing' CHECK (status IN ('ongoing', 'completed', 'cancelled')),
  rounds_played INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
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
