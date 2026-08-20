-- plan_changes: SA audit trail of player plan-tier changes. Was
-- localStorage-only (plan-store.ts) — invisible across SA devices/sessions,
-- same as sa_notes/sa_audit_log before their migration.
CREATE TABLE IF NOT EXISTS plan_changes (
  id text PRIMARY KEY,
  user_id text NOT NULL,
  user_name text NOT NULL,
  user_email text NOT NULL,
  from_plan text NOT NULL,
  to_plan text NOT NULL,
  changed_by text NOT NULL,
  changed_at timestamptz NOT NULL DEFAULT now(),
  reason text,
  stripe_subscription_id text
);

CREATE INDEX IF NOT EXISTS plan_changes_user_idx ON plan_changes (user_id);

ALTER TABLE plan_changes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "plan_changes_service" ON plan_changes
  FOR ALL TO service_role USING (true) WITH CHECK (true);
