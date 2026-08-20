-- club_invitations: club-manager roster invites (padelmgt.com/join/[token]).
-- Was localStorage-only — needs its own table (not the generic club_content
-- blob) because the invitee looks it up by token BEFORE having any session,
-- so the read side must be public-by-token rather than scoped to "my club".
CREATE TABLE IF NOT EXISTS club_invitations (
  id text PRIMARY KEY,
  club_id text NOT NULL,
  club_name text NOT NULL,
  token text NOT NULL UNIQUE,
  email text NOT NULL,
  player_name text NOT NULL,
  level text,
  points integer NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'pending',
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS club_invitations_club_idx ON club_invitations (club_id);

ALTER TABLE club_invitations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "club_invitations_service" ON club_invitations
  FOR ALL TO service_role USING (true) WITH CHECK (true);
