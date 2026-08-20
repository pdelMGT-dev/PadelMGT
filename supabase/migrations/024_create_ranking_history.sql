-- ranking_history: per-game/tournament ranking point deltas (RankingEntry).
-- Was localStorage-only (ranking-store.ts) — a player's "why did I get these
-- points" history was invisible from any device other than the one where the
-- game/tournament was scored, and permanently lost on cache clear.
CREATE TABLE IF NOT EXISTS ranking_history (
  id text PRIMARY KEY,
  game_id text NOT NULL,
  game_name text NOT NULL,
  game_date text,
  player_id text NOT NULL,
  player_name text NOT NULL,
  result text NOT NULL,
  delta numeric NOT NULL,
  new_total numeric NOT NULL,
  league_id text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS ranking_history_player_idx ON ranking_history (player_id);
CREATE INDEX IF NOT EXISTS ranking_history_game_idx ON ranking_history (game_id);

ALTER TABLE ranking_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "ranking_history_service" ON ranking_history
  FOR ALL TO service_role USING (true) WITH CHECK (true);
