-- Atomic ranking-points increment, so two concurrent applies (e.g. a player
-- finishing two games around the same time) don't lose an update to a
-- read-then-write race. Clamped at 0, mirroring the existing app-level logic.
CREATE OR REPLACE FUNCTION increment_ranking_points(p_player_id text, p_delta numeric)
RETURNS integer
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  UPDATE players
  SET ranking_points = GREATEST(0, COALESCE(ranking_points, 0) + p_delta)
  WHERE id = p_player_id
  RETURNING ranking_points;
$$;

REVOKE ALL ON FUNCTION increment_ranking_points(text, numeric) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION increment_ranking_points(text, numeric) TO service_role;
