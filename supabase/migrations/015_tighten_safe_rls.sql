-- 015_tighten_safe_rls.sql
-- Remove over-permissive ("always true") anon/public WRITE policies on the two
-- tables that are NEVER written directly from the browser client:
--
--   * club_ratings        — written only by /api/clubs/rating + ratings-bulk
--                           (service-role). The public INSERT/UPDATE policies
--                           let anyone with the public anon key ballot-stuff a
--                           club's rating. service_role bypasses RLS, so the
--                           API write paths keep working after we drop them.
--   * player_relationships — the Supabase table is unused by the app (only
--                           localStorage keys of the same name exist); a
--                           service_role ALL policy already covers any future
--                           server write, so the anon INSERT policy is pure
--                           attack surface.
--
-- SELECT policies are intentionally kept so public reads still work.
--
-- NOTE: the other tables the linter flags (clubs, club_reviews, join_requests,
-- quick_games, score_corrections, tournament_notifications, tournaments,
-- personalizado_tournaments, personalizado_teams) are written DIRECTLY from the
-- browser client under the current localStorage-first architecture. Tightening
-- them safely requires first routing those writes through authenticated server
-- endpoints — a separate refactor — so they are deliberately left untouched
-- here to avoid breaking tournament creation, club suggestions, reviews, quick
-- games, score corrections and in-app notifications.

DROP POLICY IF EXISTS "Players can upsert own rating" ON public.club_ratings;
DROP POLICY IF EXISTS "Players can update own rating" ON public.club_ratings;

DROP POLICY IF EXISTS "player_relationships_write" ON public.player_relationships;
