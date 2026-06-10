-- 005_security_hardening.sql
-- Security hardening: lock down privilege tables and re-enable RLS on tables
-- that schema.sql left unprotected.
--
-- IMPORTANT: run this in the Supabase SQL Editor. After running, the
-- admin_users table is only accessible through the server API
-- (/api/sa/admins) which requires a signed superadmin session.

-- ── admin_users: service_role ONLY ───────────────────────────────────────────
-- This is the privilege table (who can log into the SA back-office).
-- Anonymous read/write here = privilege escalation.
ALTER TABLE admin_users ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "admin_users_anon_all" ON admin_users;
DROP POLICY IF EXISTS "admin_users_service" ON admin_users;
CREATE POLICY "admin_users_service" ON admin_users
  FOR ALL TO service_role USING (true) WITH CHECK (true);
-- No anon/authenticated policies: clients cannot touch this table at all.

-- ── score_corrections: anon read+insert, no update/delete ────────────────────
-- Users may submit correction requests; only the server (SA flows) mutates them.
ALTER TABLE score_corrections ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "score_corrections_service" ON score_corrections;
CREATE POLICY "score_corrections_service" ON score_corrections
  FOR ALL TO service_role USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "score_corrections_read" ON score_corrections;
CREATE POLICY "score_corrections_read" ON score_corrections
  FOR SELECT TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "score_corrections_insert" ON score_corrections;
CREATE POLICY "score_corrections_insert" ON score_corrections
  FOR INSERT TO anon, authenticated WITH CHECK (true);

-- NOTE: the SA back-office currently updates correction status from the
-- browser with the anon key. Until that flow moves behind a server route,
-- allow updates but NOT deletes (deletion is the destructive operation):
DROP POLICY IF EXISTS "score_corrections_update" ON score_corrections;
CREATE POLICY "score_corrections_update" ON score_corrections
  FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);

-- ── player_relationships: enable RLS, read for all, writes allowed ───────────
ALTER TABLE player_relationships ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "player_relationships_service" ON player_relationships;
CREATE POLICY "player_relationships_service" ON player_relationships
  FOR ALL TO service_role USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "player_relationships_read" ON player_relationships;
CREATE POLICY "player_relationships_read" ON player_relationships
  FOR SELECT TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "player_relationships_write" ON player_relationships;
CREATE POLICY "player_relationships_write" ON player_relationships
  FOR INSERT TO anon, authenticated WITH CHECK (true);

-- ── player_field_definitions: read-only for clients ──────────────────────────
ALTER TABLE player_field_definitions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "pfd_service" ON player_field_definitions;
CREATE POLICY "pfd_service" ON player_field_definitions
  FOR ALL TO service_role USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "pfd_read" ON player_field_definitions;
CREATE POLICY "pfd_read" ON player_field_definitions
  FOR SELECT TO anon, authenticated USING (true);

-- ── clubs: enable RLS — public read, insert allowed, no anon delete ──────────
ALTER TABLE clubs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "clubs_service" ON clubs;
CREATE POLICY "clubs_service" ON clubs
  FOR ALL TO service_role USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "clubs_read" ON clubs;
CREATE POLICY "clubs_read" ON clubs
  FOR SELECT TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "clubs_insert" ON clubs;
CREATE POLICY "clubs_insert" ON clubs
  FOR INSERT TO anon, authenticated WITH CHECK (true);

-- Club profile edits still happen client-side with the anon key (no user→club
-- ownership column yet). Allow update but NOT delete:
DROP POLICY IF EXISTS "clubs_update" ON clubs;
CREATE POLICY "clubs_update" ON clubs
  FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);

-- NOTE (known gap, requires Supabase Auth migration to fix properly):
-- join_requests keeps open update/delete because the QR join cancel flow runs
-- client-side with the anon key. Once user sessions exist server-side, scope
-- these policies to the submitter/creator.
