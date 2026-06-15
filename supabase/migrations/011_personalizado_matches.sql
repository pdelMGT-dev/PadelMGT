-- 011_personalizado_matches.sql
-- Per-match result storage for PERSONALIZADO tournaments.
--
-- Match scheduling lives in personalizado_tournaments.config (JSONB) because it's
-- generated as a unit by the calendar algorithm. Results, however, are entered one
-- at a time, so atomic per-row writes here prevent concurrent result entries from
-- clobbering each other.
--
-- The match id is shared with the id field in config.matches, so the two can be
-- joined / merged on the client side without an extra lookup.

CREATE TABLE IF NOT EXISTS public.personalizado_matches (
  id            TEXT PRIMARY KEY,               -- same id as config.matches[i].id
  tournament_id TEXT NOT NULL
                REFERENCES public.personalizado_tournaments(id) ON DELETE CASCADE,
  -- result data (all NULL until an organizer enters the result)
  result_sets   JSONB,                          -- [{a:6,b:4},{a:3,6},{a:7,5}] …
  winner_id     TEXT,                           -- teamAId or teamBId
  walkover      BOOLEAN NOT NULL DEFAULT FALSE,
  entered_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_personalizado_matches_tournament
  ON public.personalizado_matches(tournament_id);

ALTER TABLE public.personalizado_matches ENABLE ROW LEVEL SECURITY;

-- Public read so the live standings page works without auth.
DROP POLICY IF EXISTS "personalizado_matches_read" ON public.personalizado_matches;
CREATE POLICY "personalizado_matches_read" ON public.personalizado_matches
  FOR SELECT TO anon, authenticated USING (true);

-- Anon/authenticated fallback (dev / service key absent).
DROP POLICY IF EXISTS "personalizado_matches_insert" ON public.personalizado_matches;
CREATE POLICY "personalizado_matches_insert" ON public.personalizado_matches
  FOR INSERT TO anon, authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "personalizado_matches_update" ON public.personalizado_matches;
CREATE POLICY "personalizado_matches_update" ON public.personalizado_matches
  FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);

-- Service role used by the API route for atomic upserts.
DROP POLICY IF EXISTS "personalizado_matches_service" ON public.personalizado_matches;
CREATE POLICY "personalizado_matches_service" ON public.personalizado_matches
  FOR ALL TO service_role USING (true) WITH CHECK (true);
