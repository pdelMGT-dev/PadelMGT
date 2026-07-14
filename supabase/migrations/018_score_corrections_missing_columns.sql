-- score_corrections was missing several columns the app has always tried to
-- write (requested_by_id, reviewed_by, reviewed_at, review_notes,
-- affected_player_ids, ranking_adjusted) — every upsert from
-- /api/score-corrections/save has been silently failing against the live
-- schema, so no correction request has ever actually reached Supabase.
-- Also adds the structured set-score fields (requested_pair1_score/
-- requested_pair2_score) needed to programmatically apply an approved
-- correction (patch the real match score + recompute ranking points),
-- replacing the free-text-only requested_score which can't be parsed
-- reliably.
ALTER TABLE score_corrections
  ADD COLUMN IF NOT EXISTS requested_by_id text,
  ADD COLUMN IF NOT EXISTS reviewed_by text,
  ADD COLUMN IF NOT EXISTS reviewed_at timestamptz,
  ADD COLUMN IF NOT EXISTS review_notes text,
  ADD COLUMN IF NOT EXISTS affected_player_ids jsonb,
  ADD COLUMN IF NOT EXISTS ranking_adjusted boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS requested_pair1_score integer,
  ADD COLUMN IF NOT EXISTS requested_pair2_score integer;
