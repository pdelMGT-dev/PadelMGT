-- Migration 001: Fix RLS and add data JSONB columns
-- Run this in your Supabase SQL Editor (Dashboard → SQL Editor → New query)

-- 1. Disable RLS for tournaments and quick_games so the anon key can write
ALTER TABLE IF EXISTS tournaments  DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS quick_games  DISABLE ROW LEVEL SECURITY;

-- 2. Add data JSONB column to store the full tournament/game state (rounds, standings, players)
ALTER TABLE tournaments  ADD COLUMN IF NOT EXISTS data JSONB DEFAULT '{}';
ALTER TABLE quick_games  ADD COLUMN IF NOT EXISTS data JSONB DEFAULT '{}';

-- 3. Add friend_requests table (used by friend-request-store.ts)
CREATE TABLE IF NOT EXISTS friend_requests (
  id          TEXT PRIMARY KEY,
  from_id     TEXT NOT NULL,
  from_name   TEXT,
  to_id       TEXT NOT NULL,
  to_name     TEXT,
  status      TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'rejected')),
  created_at  TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE IF EXISTS friend_requests DISABLE ROW LEVEL SECURITY;
