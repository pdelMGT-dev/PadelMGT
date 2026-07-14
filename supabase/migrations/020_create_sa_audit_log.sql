-- sa_audit_log: SA action audit trail. Was localStorage-only
-- (audit-log-store.ts) — cleared or lost the moment a browser's storage was
-- cleared, and invisible to any SA on another device. service_role only; no
-- anon/authenticated policy — always goes through /api/sa/audit-log.
CREATE TABLE IF NOT EXISTS sa_audit_log (
  id text PRIMARY KEY,
  action text NOT NULL,
  actor text NOT NULL,
  target_type text,
  target_id text,
  target_name text,
  details text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS sa_audit_log_created_idx ON sa_audit_log (created_at DESC);

ALTER TABLE sa_audit_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "sa_audit_log_service" ON sa_audit_log
  FOR ALL TO service_role USING (true) WITH CHECK (true);
