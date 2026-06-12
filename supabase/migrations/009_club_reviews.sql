-- 009_club_reviews.sql
-- Player-generated club ratings: each player can rate a club (1-5 stars) once,
-- with an optional comment. The public club pages show the real average and
-- vote count instead of a hardcoded rating. This data feeds future club-plan
-- sales (engagement stats per club).

CREATE TABLE IF NOT EXISTS public.club_reviews (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  club_id     TEXT NOT NULL,
  player_id   TEXT NOT NULL,
  player_name TEXT NOT NULL DEFAULT '',
  rating      INT  NOT NULL CHECK (rating BETWEEN 1 AND 5),
  comment     TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (club_id, player_id)
);

CREATE INDEX IF NOT EXISTS idx_club_reviews_club ON public.club_reviews(club_id);

ALTER TABLE public.club_reviews ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "club_reviews_read" ON public.club_reviews;
CREATE POLICY "club_reviews_read" ON public.club_reviews
  FOR SELECT TO anon, authenticated USING (true);

-- Same write model as clubs (anon-key client writes until user→row ownership
-- lands): allow insert/update, no delete except service role.
DROP POLICY IF EXISTS "club_reviews_insert" ON public.club_reviews;
CREATE POLICY "club_reviews_insert" ON public.club_reviews
  FOR INSERT TO anon, authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "club_reviews_update" ON public.club_reviews;
CREATE POLICY "club_reviews_update" ON public.club_reviews
  FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "club_reviews_service" ON public.club_reviews;
CREATE POLICY "club_reviews_service" ON public.club_reviews
  FOR ALL TO service_role USING (true) WITH CHECK (true);
