-- 017_tighten_clubs_reviews_joinrequests_corrections_rls.sql
-- Close the anonymous/public WRITE hole on the last four localStorage-first
-- tables. Every write now goes through a service-role API route:
--
--   clubs             → /api/clubs/suggest (public, forces status='pending')
--                       /api/sa/clubs      (SA-guarded upsert + delete)
--   club_reviews      → /api/club-reviews/save   (auth + owns playerId)
--   join_requests     → /api/join-requests       (submit open; update/delete authz)
--   score_corrections → /api/score-corrections/save (auth session)
--
-- service_role bypasses RLS, so those routes keep working after we drop the
-- permissive write policies below. Public SELECT policies are kept so the
-- read-only public pages and cross-device sync still work.
--
-- IMPORTANT: apply only AFTER the app code that routes these writes through the
-- API endpoints is deployed.
--
-- Run in Supabase Dashboard → SQL Editor.

-- ── clubs ────────────────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "clubs_insert" ON public.clubs;
DROP POLICY IF EXISTS "clubs_update" ON public.clubs;
DROP POLICY IF EXISTS "Anyone can suggest a pending club" ON public.clubs;

-- ── club_reviews ─────────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "club_reviews_insert" ON public.club_reviews;
DROP POLICY IF EXISTS "club_reviews_update" ON public.club_reviews;

-- ── join_requests ────────────────────────────────────────────────────────────
-- This table lacks an explicit service_role policy (service_role bypasses RLS
-- anyway, but we add one for clarity / belt-and-suspenders before removing the
-- public write policies).
DROP POLICY IF EXISTS "join_requests_service" ON public.join_requests;
CREATE POLICY "join_requests_service" ON public.join_requests
  FOR ALL TO service_role USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "join_requests_insert" ON public.join_requests;
DROP POLICY IF EXISTS "join_requests_update" ON public.join_requests;
DROP POLICY IF EXISTS "join_requests_delete" ON public.join_requests;

-- ── score_corrections ────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "score_corrections_insert" ON public.score_corrections;
DROP POLICY IF EXISTS "score_corrections_update" ON public.score_corrections;
