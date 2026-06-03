-- Migration 002: Supabase Auth integration
-- Run in Supabase Dashboard → SQL Editor → New query

-- 1. Link players to Supabase Auth users
ALTER TABLE players ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS idx_players_user_id ON players(user_id);

-- 2. Add creator_player_id to tournaments for efficient multi-device queries
--    (stores the string player ID like "player-00101" so we can fetch by owner)
ALTER TABLE tournaments ADD COLUMN IF NOT EXISTS creator_player_id TEXT;
CREATE INDEX IF NOT EXISTS idx_tournaments_creator ON tournaments(creator_player_id);

-- 3. Re-enable RLS on players with auth-scoped write policies
--    Reads are public (needed for rankings, player search, invite flows)
--    Writes require the authenticated Supabase user to own the record
ALTER TABLE players ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Super admin full access on players" ON players;
CREATE POLICY "players_read_public"  ON players FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "players_insert_own"   ON players FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
CREATE POLICY "players_update_own"   ON players FOR UPDATE TO authenticated USING (user_id = auth.uid());
CREATE POLICY "players_service_full" ON players FOR ALL TO service_role USING (true) WITH CHECK (true);
-- Allow anon inserts for demo/seed accounts that don't go through Supabase Auth
CREATE POLICY "players_insert_anon"  ON players FOR INSERT TO anon WITH CHECK (user_id IS NULL);

-- 4. Tournaments: require authentication to write (any authenticated user can write their own)
--    RLS was disabled in migration 001 — re-enable with auth guard
ALTER TABLE tournaments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Super admin full access on tournaments" ON tournaments;
CREATE POLICY "tournaments_read_public"  ON tournaments FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "tournaments_write_auth"   ON tournaments FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "tournaments_service_full" ON tournaments FOR ALL TO service_role USING (true) WITH CHECK (true);
-- Keep anon write for now so demo accounts (no Supabase Auth) can still create tournaments
CREATE POLICY "tournaments_write_anon"   ON tournaments FOR ALL TO anon USING (true) WITH CHECK (true);

-- 5. Quick games: same pattern as tournaments
ALTER TABLE quick_games ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Super admin full access on quick_games" ON quick_games;
CREATE POLICY "games_read_public"  ON quick_games FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "games_write_auth"   ON quick_games FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "games_service_full" ON quick_games FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "games_write_anon"   ON quick_games FOR ALL TO anon USING (true) WITH CHECK (true);

-- 6. Friend requests: same pattern
ALTER TABLE friend_requests ENABLE ROW LEVEL SECURITY;
CREATE POLICY "fr_read"         ON friend_requests FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "fr_write_auth"   ON friend_requests FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "fr_write_anon"   ON friend_requests FOR ALL TO anon USING (true) WITH CHECK (true);
CREATE POLICY "fr_service_full" ON friend_requests FOR ALL TO service_role USING (true) WITH CHECK (true);
