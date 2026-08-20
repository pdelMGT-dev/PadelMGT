-- club_content: the club-manager dashboard's gallery/courts/announcements
-- (each a JSON blob per club). Was localStorage-only, single-tenant (no
-- clubId at all) — content edited by one club manager was invisible on any
-- other device and, worse, shared across every club manager's browser as if
-- there were only one club.
CREATE TABLE IF NOT EXISTS club_content (
  club_id text NOT NULL,
  content_type text NOT NULL CHECK (content_type IN ('gallery', 'courts', 'announcements', 'roster')),
  data jsonb NOT NULL DEFAULT '[]'::jsonb,
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (club_id, content_type)
);

ALTER TABLE club_content ENABLE ROW LEVEL SECURITY;

CREATE POLICY "club_content_service" ON club_content
  FOR ALL TO service_role USING (true) WITH CHECK (true);
