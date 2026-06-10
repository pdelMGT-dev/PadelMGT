-- 006_auth_rls_tightening.sql  (self-contained — safe if 002/003 never ran)
-- Closes the anonymous-write hole: with the public anon key anyone could
-- UPDATE/DELETE any tournament, game or friend request via the Supabase REST
-- API (falsifying scores, brackets, rankings).
--
-- Pre-requisite: the app now uses @supabase/ssr cookie sessions, so logged-in
-- users' writes carry their JWT (role = authenticated) automatically.
-- Anonymous visitors keep READ access (public pages) but can no longer write.
--
-- Run in Supabase Dashboard → SQL Editor.

-- ── Prerequisite columns (from 002/003, idempotent) ──────────────────────────
ALTER TABLE players      ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id);
CREATE INDEX IF NOT EXISTS idx_players_user_id ON players(user_id);

ALTER TABLE tournaments  ADD COLUMN IF NOT EXISTS creator_player_id TEXT;
CREATE INDEX IF NOT EXISTS idx_tournaments_creator ON tournaments(creator_player_id);

ALTER TABLE quick_games  ADD COLUMN IF NOT EXISTS creator_player_id TEXT;
CREATE INDEX IF NOT EXISTS idx_games_creator ON quick_games(creator_player_id);

-- ── players: ensure RLS with sane policies ───────────────────────────────────
ALTER TABLE players ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "players_read_public" ON players;
CREATE POLICY "players_read_public" ON players
  FOR SELECT TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "players_insert_own" ON players;
CREATE POLICY "players_insert_own" ON players
  FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid() OR user_id IS NULL);

DROP POLICY IF EXISTS "players_insert_anon" ON players;
CREATE POLICY "players_insert_anon" ON players
  FOR INSERT TO anon WITH CHECK (user_id IS NULL);

DROP POLICY IF EXISTS "players_update_own" ON players;
CREATE POLICY "players_update_own" ON players
  FOR UPDATE TO authenticated USING (user_id = auth.uid());

DROP POLICY IF EXISTS "players_service_full" ON players;
CREATE POLICY "players_service_full" ON players
  FOR ALL TO service_role USING (true) WITH CHECK (true);

-- ── tournaments: public read, no anon writes, creator-scoped deletes ─────────
ALTER TABLE tournaments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "tournaments_read_public" ON tournaments;
CREATE POLICY "tournaments_read_public" ON tournaments
  FOR SELECT TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "tournaments_service_full" ON tournaments;
CREATE POLICY "tournaments_service_full" ON tournaments
  FOR ALL TO service_role USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "tournaments_write_anon" ON tournaments;
DROP POLICY IF EXISTS "tournaments_write_auth" ON tournaments;

CREATE POLICY "tournaments_insert_auth" ON tournaments
  FOR INSERT TO authenticated WITH CHECK (true);

-- Authenticated users can update (joins, score entry by participants).
-- NOTE: creator-only updates require moving join flows server-side — phase 2.
CREATE POLICY "tournaments_update_auth" ON tournaments
  FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "tournaments_delete_creator" ON tournaments
  FOR DELETE TO authenticated
  USING (creator_player_id IN (SELECT id FROM players WHERE user_id = auth.uid()));

-- ── quick_games: same model ───────────────────────────────────────────────────
ALTER TABLE quick_games ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "games_read_public" ON quick_games;
CREATE POLICY "games_read_public" ON quick_games
  FOR SELECT TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "games_service_full" ON quick_games;
CREATE POLICY "games_service_full" ON quick_games
  FOR ALL TO service_role USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "games_write_anon" ON quick_games;
DROP POLICY IF EXISTS "games_write_auth" ON quick_games;

CREATE POLICY "games_insert_auth" ON quick_games
  FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "games_update_auth" ON quick_games
  FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "games_delete_creator" ON quick_games
  FOR DELETE TO authenticated
  USING (creator_player_id IN (SELECT id FROM players WHERE user_id = auth.uid()));

-- ── friend_requests: drop anon writes ────────────────────────────────────────
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'friend_requests') THEN
    ALTER TABLE friend_requests ENABLE ROW LEVEL SECURITY;

    DROP POLICY IF EXISTS "fr_read" ON friend_requests;
    CREATE POLICY "fr_read" ON friend_requests
      FOR SELECT TO anon, authenticated USING (true);

    DROP POLICY IF EXISTS "fr_write_anon" ON friend_requests;
    DROP POLICY IF EXISTS "fr_write_auth" ON friend_requests;
    CREATE POLICY "fr_write_auth" ON friend_requests
      FOR ALL TO authenticated USING (true) WITH CHECK (true);

    DROP POLICY IF EXISTS "fr_service_full" ON friend_requests;
    CREATE POLICY "fr_service_full" ON friend_requests
      FOR ALL TO service_role USING (true) WITH CHECK (true);
  END IF;
END $$;
