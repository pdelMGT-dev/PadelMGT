-- Email templates configurable by the SA dashboard
CREATE TABLE IF NOT EXISTS email_templates (
  id          UUID         DEFAULT gen_random_uuid() PRIMARY KEY,
  type        VARCHAR(64)  NOT NULL UNIQUE,
  name        VARCHAR(128) NOT NULL,
  description TEXT         NOT NULL DEFAULT '',
  subject     TEXT         NOT NULL,
  html_body   TEXT         NOT NULL,
  variables   JSONB        NOT NULL DEFAULT '[]'::jsonb,
  is_active   BOOLEAN      NOT NULL DEFAULT true,
  updated_by  VARCHAR(255),
  created_at  TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

ALTER TABLE email_templates ENABLE ROW LEVEL SECURITY;

-- Service role has full access (used by API routes)
CREATE POLICY "service_all" ON email_templates
  FOR ALL TO service_role USING (true) WITH CHECK (true);

-- Anon can read templates (email send route uses anon key for reads)
CREATE POLICY "anon_read" ON email_templates
  FOR SELECT TO anon USING (true);
