-- 013_tournament_notifications.sql
-- In-app notifications for tournament participants.
-- Used to alert players when an organizer updates the match schedule.

CREATE TABLE IF NOT EXISTS public.tournament_notifications (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  player_id     TEXT NOT NULL,      -- references player_profiles(id)
  tournament_id TEXT NOT NULL
                REFERENCES public.personalizado_tournaments(id) ON DELETE CASCADE,
  type          TEXT NOT NULL,      -- 'schedule_updated'
  message       TEXT NOT NULL,
  read          BOOLEAN NOT NULL DEFAULT FALSE,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_tournament_notifications_player
  ON public.tournament_notifications(player_id, read, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_tournament_notifications_tournament
  ON public.tournament_notifications(tournament_id);

ALTER TABLE public.tournament_notifications ENABLE ROW LEVEL SECURITY;

-- Players can read their own notifications
DROP POLICY IF EXISTS "tournament_notifications_read" ON public.tournament_notifications;
CREATE POLICY "tournament_notifications_read" ON public.tournament_notifications
  FOR SELECT TO anon, authenticated USING (true);

-- Notifications are inserted by the API (service role) or client
DROP POLICY IF EXISTS "tournament_notifications_insert" ON public.tournament_notifications;
CREATE POLICY "tournament_notifications_insert" ON public.tournament_notifications
  FOR INSERT TO anon, authenticated WITH CHECK (true);

-- Players can mark their own notifications as read
DROP POLICY IF EXISTS "tournament_notifications_update" ON public.tournament_notifications;
CREATE POLICY "tournament_notifications_update" ON public.tournament_notifications
  FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "tournament_notifications_service" ON public.tournament_notifications;
CREATE POLICY "tournament_notifications_service" ON public.tournament_notifications
  FOR ALL TO service_role USING (true) WITH CHECK (true);
