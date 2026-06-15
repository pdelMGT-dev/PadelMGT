-- 010_personalizado_tournaments.sql
-- PERSONALIZADO multi-category tournaments for tournament organizers.
--
-- Two tables so registration slot-counting is atomic across devices:
--   * personalizado_tournaments — metadata + control-panel config (JSONB)
--   * personalizado_teams       — one row per registered team (status-driven)
--
-- The public registration page (/inscripcion/[code]) reads slot counts straight
-- from personalizado_teams, and the registration write goes through a
-- service-role API route that does COUNT-then-INSERT, so two players on
-- different devices can't both grab the last slot.

-- ── Tournaments ──────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.personalizado_tournaments (
  id                TEXT PRIMARY KEY,
  code              TEXT NOT NULL UNIQUE,
  name              TEXT NOT NULL,
  date              TEXT,
  time              TEXT,
  location_name     TEXT,
  city              TEXT,
  country           TEXT DEFAULT 'ES',
  courts            INT  NOT NULL DEFAULT 2,
  -- [{ id, name, gender, maxTeams }]
  categories        JSONB NOT NULL DEFAULT '[]'::jsonb,
  -- control-panel configuration (substitution, score type, points table,
  -- forfeit rules, groups per category, court names, schedule). Free-form so the
  -- panel can evolve without migrations.
  config            JSONB NOT NULL DEFAULT '{}'::jsonb,
  status            TEXT NOT NULL DEFAULT 'draft'
                    CHECK (status IN ('draft','registration_open','configured','live','finished')),
  creator_player_id TEXT,
  creator_name      TEXT NOT NULL DEFAULT '',
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  opened_at         TIMESTAMPTZ,
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_personalizado_tournaments_code    ON public.personalizado_tournaments(code);
CREATE INDEX IF NOT EXISTS idx_personalizado_tournaments_creator ON public.personalizado_tournaments(creator_player_id);

ALTER TABLE public.personalizado_tournaments ENABLE ROW LEVEL SECURITY;

-- Public read so the registration page works without auth.
DROP POLICY IF EXISTS "personalizado_tournaments_read" ON public.personalizado_tournaments;
CREATE POLICY "personalizado_tournaments_read" ON public.personalizado_tournaments
  FOR SELECT TO anon, authenticated USING (true);

-- Anon/authenticated insert+update (same client-write model as tournaments/clubs;
-- app-level auth scopes the creator). Service role for API routes.
DROP POLICY IF EXISTS "personalizado_tournaments_insert" ON public.personalizado_tournaments;
CREATE POLICY "personalizado_tournaments_insert" ON public.personalizado_tournaments
  FOR INSERT TO anon, authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "personalizado_tournaments_update" ON public.personalizado_tournaments;
CREATE POLICY "personalizado_tournaments_update" ON public.personalizado_tournaments
  FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "personalizado_tournaments_service" ON public.personalizado_tournaments;
CREATE POLICY "personalizado_tournaments_service" ON public.personalizado_tournaments
  FOR ALL TO service_role USING (true) WITH CHECK (true);

-- ── Teams ────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.personalizado_teams (
  id             TEXT PRIMARY KEY,
  tournament_id  TEXT NOT NULL REFERENCES public.personalizado_tournaments(id) ON DELETE CASCADE,
  category_id    TEXT NOT NULL,
  player1_name   TEXT NOT NULL,
  player1_email  TEXT,
  player1_id     TEXT,
  player2_name   TEXT,
  player2_email  TEXT,
  player2_id     TEXT,
  -- group assignment for the control-panel drag & drop (null until assigned)
  group_id       TEXT,
  status         TEXT NOT NULL DEFAULT 'pending'
                 CHECK (status IN ('pending','confirmed','rejected','waitlisted')),
  payment_status TEXT NOT NULL DEFAULT 'free'
                 CHECK (payment_status IN ('unpaid','paid','free')),
  registered_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_personalizado_teams_tournament ON public.personalizado_teams(tournament_id);
CREATE INDEX IF NOT EXISTS idx_personalizado_teams_category   ON public.personalizado_teams(tournament_id, category_id);
CREATE INDEX IF NOT EXISTS idx_personalizado_teams_status     ON public.personalizado_teams(tournament_id, category_id, status);

ALTER TABLE public.personalizado_teams ENABLE ROW LEVEL SECURITY;

-- Public read so the registration page can show live slot counts.
DROP POLICY IF EXISTS "personalizado_teams_read" ON public.personalizado_teams;
CREATE POLICY "personalizado_teams_read" ON public.personalizado_teams
  FOR SELECT TO anon, authenticated USING (true);

-- Writes are funneled through service-role API routes (atomic COUNT-then-INSERT
-- for slot/waitlist assignment), but allow anon/authenticated insert+update as a
-- graceful-degradation fallback when the service key is absent in dev.
DROP POLICY IF EXISTS "personalizado_teams_insert" ON public.personalizado_teams;
CREATE POLICY "personalizado_teams_insert" ON public.personalizado_teams
  FOR INSERT TO anon, authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "personalizado_teams_update" ON public.personalizado_teams;
CREATE POLICY "personalizado_teams_update" ON public.personalizado_teams
  FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "personalizado_teams_service" ON public.personalizado_teams;
CREATE POLICY "personalizado_teams_service" ON public.personalizado_teams
  FOR ALL TO service_role USING (true) WITH CHECK (true);
