-- family_approvals: guardian approval requests for a minor family member's
-- participation in a game/tournament invited by someone other than the
-- guardian. Referenced by family-approval-store.ts (writes go straight from
-- the browser using the authenticated Supabase session) since that store was
-- built, but the table itself was never created — every write has been
-- silently failing (same failure class as family_members/family_links).
CREATE TABLE IF NOT EXISTS family_approvals (
  id text PRIMARY KEY,
  guardian_id text NOT NULL,
  family_member_id text NOT NULL,
  family_member_name text NOT NULL,
  context text NOT NULL,
  entity_id text NOT NULL,
  entity_name text NOT NULL,
  entity_date text,
  from_player_id text NOT NULL,
  from_player_name text NOT NULL,
  status text NOT NULL DEFAULT 'pending',
  created_at timestamptz NOT NULL DEFAULT now(),
  responded_at timestamptz
);

CREATE INDEX IF NOT EXISTS family_approvals_guardian_idx ON family_approvals (guardian_id);

ALTER TABLE family_approvals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "family_approvals_read_auth" ON family_approvals
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "family_approvals_write_auth" ON family_approvals
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "family_approvals_service" ON family_approvals
  FOR ALL TO service_role USING (true) WITH CHECK (true);
