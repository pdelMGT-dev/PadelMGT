-- 014_generalize_notifications.sql
-- Generalize tournament_notifications so it can serve BOTH tournament products
-- (Torneo Personalizado + Torneos clásicos) and carry richer progression events.
--
-- Adds:
--   * product  — 'tp' (personalizado) | 'torneo' (clásico)
--   * link     — optional deep-link the bell opens (e.g. the player's tournament page)
-- New `type` values used by the app: 'qualified', 'advanced', 'eliminated', 'next_match'
-- (existing 'schedule_updated' keeps working).
--
-- The old FK pinned tournament_id to personalizado_tournaments, which would reject rows for
-- clásicos tournaments. We drop it and keep tournament_id as a plain TEXT reference instead.

ALTER TABLE public.tournament_notifications
  DROP CONSTRAINT IF EXISTS tournament_notifications_tournament_id_fkey;

ALTER TABLE public.tournament_notifications
  ADD COLUMN IF NOT EXISTS product TEXT NOT NULL DEFAULT 'tp';

ALTER TABLE public.tournament_notifications
  ADD COLUMN IF NOT EXISTS link TEXT;
