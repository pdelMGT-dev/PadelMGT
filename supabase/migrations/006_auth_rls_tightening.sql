-- 006_auth_rls_tightening.sql
-- Closes the anonymous-write hole: with the public anon key anyone could
-- UPDATE/DELETE any tournament, game or friend request via the Supabase REST
-- API (falsifying scores, brackets, rankings).
--
-- Pre-requisite: the app now uses @supabase/ssr cookie sessions, so logged-in
-- users' writes carry their JWT (role = authenticated) automatically.
-- Anonymous visitors keep READ access (public pages) but can no longer write.
--
-- Run in Supabase Dashboard → SQL Editor.

-- ── tournaments: drop anon writes, creator-scoped deletes ────────────────────
DROP POLICY IF EXISTS "tournaments_write_anon" ON tournaments;
DROP POLICY IF EXISTS "tournaments_write_auth" ON tournaments;

-- Authenticated users can create tournaments
CREATE POLICY "tournaments_insert_auth" ON tournaments
  FOR INSERT TO authenticated WITH CHECK (true);

-- Authenticated users can update (joins, score entry by participants).
-- NOTE: creator-only updates require moving join flows server-side — phase 2.
CREATE POLICY "tournaments_update_auth" ON tournaments
  FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

-- Only the creator can delete their tournament
CREATE POLICY "tournaments_delete_creator" ON tournaments
  FOR DELETE TO authenticated
  USING (creator_player_id IN (SELECT id FROM players WHERE user_id = auth.uid()));

-- ── quick_games: same model ───────────────────────────────────────────────────
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
DROP POLICY IF EXISTS "fr_write_anon" ON friend_requests;
-- fr_write_auth (authenticated FOR ALL) stays: both parties mutate the row.
