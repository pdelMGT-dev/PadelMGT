-- Platform-wide configuration: published pricing plans and homepage stats
CREATE TABLE IF NOT EXISTS platform_config (
  key        VARCHAR(64)  PRIMARY KEY,
  value      JSONB        NOT NULL DEFAULT '{}'::jsonb,
  updated_by VARCHAR(255),
  updated_at TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

ALTER TABLE platform_config ENABLE ROW LEVEL SECURITY;
CREATE POLICY "service_all" ON platform_config FOR ALL    TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "anon_read"   ON platform_config FOR SELECT TO anon          USING (true);
