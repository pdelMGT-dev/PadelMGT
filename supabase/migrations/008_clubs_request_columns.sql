-- 008_clubs_request_columns.sql
-- Adds columns needed for the public "suggest a club" flow so that a club
-- suggestion submitted from any device reaches the Super Admin (cross-device,
-- via Supabase) carrying the website / Google Maps link used for verification.
--
-- All columns are ADDITIVE and nullable — existing club rows and existing SA
-- club operations keep working unchanged whether or not this migration is run.

ALTER TABLE public.clubs
  ADD COLUMN IF NOT EXISTS maps_url   TEXT,   -- website OR google maps link
  ADD COLUMN IF NOT EXISTS address    TEXT,
  ADD COLUMN IF NOT EXISTS club_type  TEXT,
  ADD COLUMN IF NOT EXISTS source     TEXT;   -- 'player_suggestion' | 'club_apply' | 'sa_manual' | 'import'

-- Widen the plan CHECK so the SA can sync clubs on the newer plan tiers
-- (club_*, liga_*, fed_*, infinity) — previously only free/basic/pro were
-- allowed, which made any plan change to a club fail to persist to Supabase.
ALTER TABLE public.clubs DROP CONSTRAINT IF EXISTS clubs_plan_check;
ALTER TABLE public.clubs
  ADD CONSTRAINT clubs_plan_check CHECK (plan IN (
    'free','basic','pro',
    'club_starter','club_pro','club_liga',
    'liga_free','liga_basic','liga_pro','liga_unlimited',
    'fed_basic','fed_pro','infinity'
  ));

-- Allow anonymous (logged-out) visitors to submit a suggestion row.
-- Suggestions are always inserted as status='pending' and reviewed by the SA
-- before they ever become visible on the public site (which filters status='active').
DROP POLICY IF EXISTS "Anyone can suggest a pending club" ON public.clubs;
CREATE POLICY "Anyone can suggest a pending club" ON public.clubs
  FOR INSERT
  WITH CHECK (status = 'pending');
