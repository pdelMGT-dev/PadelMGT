-- 007_player_profile_updates.sql
-- Changes:
--   1. Add photoUrl column to players table
--   2. Change level column to support numeric sub-levels (1.0–7.0)
--   3. Add federationLevel column (set by federation, read-only for player)
--   4. Add city column (was missing from some deployments)
--   5. Expand subscriptions table to support player-level plans
--   6. Create player_subscriptions table for multi-plan tracking

-- ── players table ─────────────────────────────────────────────────────────────

ALTER TABLE public.players
  ADD COLUMN IF NOT EXISTS photo_url     TEXT,
  ADD COLUMN IF NOT EXISTS city          TEXT,
  ADD COLUMN IF NOT EXISTS federation_level TEXT;

-- Rename level column check constraint to support new values
-- Drop old constraint if it exists
ALTER TABLE public.players
  DROP CONSTRAINT IF EXISTS players_level_check;

-- Re-add with expanded values
ALTER TABLE public.players
  ADD CONSTRAINT players_level_check CHECK (
    level IS NULL OR level IN (
      '1.0','1.5','2.0','2.5','3.0','3.5',
      '4.0','4.5','5.0','5.5','6.0','7.0',
      -- keep legacy values for backwards compat during migration
      'beginner','intermediate','advanced'
    )
  );

-- ── player_subscriptions table ────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.player_subscriptions (
  id             BIGSERIAL PRIMARY KEY,
  player_id      TEXT NOT NULL,
  plan_id        TEXT NOT NULL CHECK (plan_id IN (
    'free','player_pro',
    'liga_free','liga_basic','liga_pro','liga_unlimited',
    'club_starter','club_pro','club_liga',
    'fed_basic','fed_pro','infinity'
  )),
  status         TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active','canceled','expired')),
  stripe_subscription_id TEXT UNIQUE,
  started_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at     TIMESTAMPTZ,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_player_subscriptions_player_id
  ON public.player_subscriptions (player_id);

CREATE INDEX IF NOT EXISTS idx_player_subscriptions_status
  ON public.player_subscriptions (player_id, status);

-- Auto-insert a free plan row for every existing player that doesn't have one
INSERT INTO public.player_subscriptions (player_id, plan_id, status)
SELECT id, 'free', 'active'
FROM public.players
WHERE id NOT IN (SELECT player_id FROM public.player_subscriptions WHERE plan_id = 'free')
ON CONFLICT DO NOTHING;

-- ── Storage bucket for avatars ─────────────────────────────────────────────────
-- This DDL only works if you run it via Supabase dashboard or CLI;
-- storage.buckets is managed by the Storage API, not SQL migrations.
-- Created manually in Supabase dashboard: bucket name = "avatars", public = true

-- ── RLS for player_subscriptions ─────────────────────────────────────────────

ALTER TABLE public.player_subscriptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Players read own subscriptions" ON public.player_subscriptions
  FOR SELECT USING (auth.uid()::text = player_id OR auth.uid() IS NULL);

CREATE POLICY "Service role manages subscriptions" ON public.player_subscriptions
  FOR ALL USING (auth.role() = 'service_role');
