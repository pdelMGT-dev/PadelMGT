-- sa_notes: private SA notes on players/clubs/tournaments. Was localStorage-
-- only (sa-notes-store.ts) — a note added by one SA is invisible to any
-- other admin/device. service_role only; no anon/authenticated policy —
-- always goes through /api/sa/notes.
CREATE TABLE IF NOT EXISTS sa_notes (
  id text PRIMARY KEY,
  target_type text NOT NULL CHECK (target_type IN ('player', 'club', 'tournament')),
  target_id text NOT NULL,
  target_name text NOT NULL DEFAULT '',
  note text NOT NULL,
  created_by text NOT NULL DEFAULT 'Super Admin',
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS sa_notes_target_idx ON sa_notes (target_type, target_id);

ALTER TABLE sa_notes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "sa_notes_service" ON sa_notes
  FOR ALL TO service_role USING (true) WITH CHECK (true);
