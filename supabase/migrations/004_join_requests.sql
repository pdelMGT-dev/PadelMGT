-- Migration 004: join_requests table for cross-device QR join flow
-- Run in Supabase Dashboard → SQL Editor → New query

CREATE TABLE IF NOT EXISTS join_requests (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_id     TEXT NOT NULL,          -- game.id or tournament.id
  entity_type   TEXT NOT NULL CHECK (entity_type IN ('game', 'tournament')),
  player_id     TEXT NOT NULL,          -- submitter's player ID
  player_name   TEXT NOT NULL,
  player_email  TEXT,
  status        TEXT NOT NULL DEFAULT 'pending'
                CHECK (status IN ('pending', 'approved', 'rejected')),
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  updated_at    TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_join_requests_entity  ON join_requests(entity_id);
CREATE INDEX IF NOT EXISTS idx_join_requests_player  ON join_requests(player_id);
CREATE INDEX IF NOT EXISTS idx_join_requests_status  ON join_requests(entity_id, status);

-- Unique: one pending/approved request per player per entity
CREATE UNIQUE INDEX IF NOT EXISTS idx_join_requests_unique
  ON join_requests(entity_id, player_id);

-- RLS: open insert + open read (app-level auth handles scoping)
ALTER TABLE join_requests ENABLE ROW LEVEL SECURITY;

-- Anyone (including anon) can insert a join request
CREATE POLICY "join_requests_insert" ON join_requests
  FOR INSERT WITH CHECK (true);

-- Anyone can read join requests (creator reads by entity_id, submitter reads their own)
CREATE POLICY "join_requests_select" ON join_requests
  FOR SELECT USING (true);

-- Anyone can update status (creator approves/rejects; submitter cancels)
CREATE POLICY "join_requests_update" ON join_requests
  FOR UPDATE USING (true) WITH CHECK (true);

-- Allow delete (cancel request)
CREATE POLICY "join_requests_delete" ON join_requests
  FOR DELETE USING (true);
