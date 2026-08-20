-- family_members: a guardian's dependents (children/spouse/etc), used for
-- game/tournament invites and minor-player management. Referenced by
-- /api/family/member and /api/family/lookup since those routes were built,
-- but the table itself was never created — every write has been silently
-- failing (same failure class as score_corrections before migration 018).
CREATE TABLE IF NOT EXISTS family_members (
  id text PRIMARY KEY,
  owner_id text NOT NULL,
  full_name text NOT NULL,
  relation_type text NOT NULL,
  sex text NOT NULL,
  birth_date text NOT NULL,
  email text,
  linked_player_id text,
  invitation_status text NOT NULL DEFAULT 'none',
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS family_members_owner_idx ON family_members (owner_id);

ALTER TABLE family_members ENABLE ROW LEVEL SECURITY;

CREATE POLICY "family_members_service" ON family_members
  FOR ALL TO service_role USING (true) WITH CHECK (true);

-- family_links: cross-guardian link requests between platform users (e.g.
-- linking a spouse's own account as family). Referenced by /api/family/link
-- since that route was built, but likewise never had a backing table.
CREATE TABLE IF NOT EXISTS family_links (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  from_player_id text NOT NULL,
  to_player_id text NOT NULL,
  to_player_email text NOT NULL,
  from_player_name text NOT NULL,
  relation_from_to text NOT NULL,
  relation_to_from text NOT NULL,
  status text NOT NULL DEFAULT 'pending',
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS family_links_from_idx ON family_links (from_player_id);
CREATE INDEX IF NOT EXISTS family_links_to_idx ON family_links (to_player_id);

ALTER TABLE family_links ENABLE ROW LEVEL SECURITY;

CREATE POLICY "family_links_service" ON family_links
  FOR ALL TO service_role USING (true) WITH CHECK (true);
