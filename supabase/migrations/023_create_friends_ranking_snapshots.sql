-- friends_ranking_snapshots: a player's saved monthly/annual friends-ranking
-- snapshot. Was localStorage-only (friends-ranking-store.ts) — never synced
-- to Supabase at all, so a snapshot saved on one device/browser was invisible
-- (and permanently lost on cache clear) everywhere else.
CREATE TABLE IF NOT EXISTS friends_ranking_snapshots (
  id text PRIMARY KEY,
  owner_id text NOT NULL,
  year integer NOT NULL,
  month integer,
  entries jsonb NOT NULL DEFAULT '[]'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS friends_ranking_snapshots_owner_idx
  ON friends_ranking_snapshots (owner_id, year, month);

ALTER TABLE friends_ranking_snapshots ENABLE ROW LEVEL SECURITY;

CREATE POLICY "friends_ranking_snapshots_service" ON friends_ranking_snapshots
  FOR ALL TO service_role USING (true) WITH CHECK (true);
