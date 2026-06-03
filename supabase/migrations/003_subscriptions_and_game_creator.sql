-- Migration 003: Stripe subscriptions table + creator_player_id on quick_games
-- Run in Supabase Dashboard → SQL Editor → New query

-- 1. Add creator_player_id to quick_games (mirrors tournaments)
ALTER TABLE quick_games ADD COLUMN IF NOT EXISTS creator_player_id TEXT;
CREATE INDEX IF NOT EXISTS idx_games_creator ON quick_games(creator_player_id);

-- 2. Subscriptions table — written by the Stripe webhook (server-side, service role)
CREATE TABLE IF NOT EXISTS subscriptions (
  id                      BIGSERIAL PRIMARY KEY,
  stripe_subscription_id  TEXT UNIQUE NOT NULL,
  stripe_customer_id      TEXT,
  plan                    TEXT NOT NULL CHECK (plan IN ('club', 'liga', 'federation')),
  status                  TEXT NOT NULL DEFAULT 'trialing'
                          CHECK (status IN ('trialing', 'active', 'past_due', 'canceled', 'unpaid')),
  email                   TEXT NOT NULL,
  created_at              TIMESTAMPTZ DEFAULT NOW(),
  updated_at              TIMESTAMPTZ DEFAULT NOW()
);

-- Only the service role (webhook) can write; authenticated users can read their own
ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "subscriptions_read_own"    ON subscriptions FOR SELECT TO authenticated
  USING (email = (SELECT email FROM players WHERE user_id = auth.uid() LIMIT 1));
CREATE POLICY "subscriptions_service_rw"  ON subscriptions FOR ALL TO service_role
  USING (true) WITH CHECK (true);
