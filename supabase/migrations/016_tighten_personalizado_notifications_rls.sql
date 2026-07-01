-- 016_tighten_personalizado_notifications_rls.sql
-- Close the anonymous/public WRITE hole on the PERSONALIZADO tables and the
-- notifications table. Every write to these tables now goes through a
-- service-role API route:
--
--   personalizado_tournaments  → /api/personalizado/{save,status,cancel,reactivate,delete}
--   personalizado_teams        → /api/personalizado/{register,team-status,team-delete,accept-invitation,save}
--   personalizado_matches      → /api/personalizado/{match-result,save,seed}
--   tournament_notifications   → /api/notifications/create
--
-- service_role bypasses RLS, so those API paths keep working after we drop the
-- permissive anon/authenticated INSERT/UPDATE policies below. Public SELECT
-- policies are intentionally kept so the read-only public pages still work.
--
-- IMPORTANT: apply this only AFTER the app code that routes these writes through
-- the API endpoints is deployed. Applying it earlier would make in-app
-- notifications and SA status changes fail until the deploy lands.
--
-- Run in Supabase Dashboard → SQL Editor.

-- ── personalizado_tournaments ────────────────────────────────────────────────
DROP POLICY IF EXISTS "personalizado_tournaments_insert" ON public.personalizado_tournaments;
DROP POLICY IF EXISTS "personalizado_tournaments_update" ON public.personalizado_tournaments;

-- ── personalizado_teams ──────────────────────────────────────────────────────
DROP POLICY IF EXISTS "personalizado_teams_insert" ON public.personalizado_teams;
DROP POLICY IF EXISTS "personalizado_teams_update" ON public.personalizado_teams;

-- ── personalizado_matches ────────────────────────────────────────────────────
DROP POLICY IF EXISTS "personalizado_matches_insert" ON public.personalizado_matches;
DROP POLICY IF EXISTS "personalizado_matches_update" ON public.personalizado_matches;

-- ── tournament_notifications ─────────────────────────────────────────────────
DROP POLICY IF EXISTS "tournament_notifications_insert" ON public.tournament_notifications;
DROP POLICY IF EXISTS "tournament_notifications_update" ON public.tournament_notifications;
