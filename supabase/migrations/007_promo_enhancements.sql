-- Enhance promo_codes table with new fields for display and eligibility
-- Create table if it doesn't exist yet
CREATE TABLE IF NOT EXISTS promo_codes (
  id          UUID         PRIMARY KEY,
  code        TEXT         UNIQUE NOT NULL,
  type        TEXT         CHECK (type IN ('percent_off','fixed_off','free_trial','feature_unlock')),
  value       NUMERIC      DEFAULT 0,
  description TEXT,
  max_uses    INTEGER,
  used_count  INTEGER      DEFAULT 0,
  expires_at  TIMESTAMPTZ,
  is_active   BOOLEAN      DEFAULT TRUE,
  created_by  TEXT,
  created_at  TIMESTAMPTZ  DEFAULT NOW()
);

-- Add new columns (idempotent)
ALTER TABLE promo_codes ADD COLUMN IF NOT EXISTS eligibility        TEXT        DEFAULT 'all' CHECK (eligibility IN ('all','new_users','existing_users'));
ALTER TABLE promo_codes ADD COLUMN IF NOT EXISTS unlock_plan        TEXT;
ALTER TABLE promo_codes ADD COLUMN IF NOT EXISTS unlock_months      INTEGER;
ALTER TABLE promo_codes ADD COLUMN IF NOT EXISTS display_on_pricing BOOLEAN     DEFAULT FALSE;
ALTER TABLE promo_codes ADD COLUMN IF NOT EXISTS display_text       TEXT;
ALTER TABLE promo_codes ADD COLUMN IF NOT EXISTS display_badge      TEXT;
ALTER TABLE promo_codes ADD COLUMN IF NOT EXISTS stripe_coupon_id   TEXT;
ALTER TABLE promo_codes ADD COLUMN IF NOT EXISTS stripe_promo_code_id TEXT;

-- RLS
ALTER TABLE promo_codes ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'promo_codes' AND policyname = 'service_all') THEN
    CREATE POLICY "service_all" ON promo_codes FOR ALL TO service_role USING (true) WITH CHECK (true);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'promo_codes' AND policyname = 'anon_read_active') THEN
    CREATE POLICY "anon_read_active" ON promo_codes FOR SELECT TO anon USING (is_active = true);
  END IF;
END $$;

-- Redemptions table
CREATE TABLE IF NOT EXISTS promo_redemptions (
  id          UUID         PRIMARY KEY,
  promo_id    UUID         REFERENCES promo_codes(id),
  promo_code  TEXT         NOT NULL,
  user_id     TEXT         NOT NULL,
  user_email  TEXT,
  user_name   TEXT,
  redeemed_at TIMESTAMPTZ  DEFAULT NOW()
);

ALTER TABLE promo_redemptions ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'promo_redemptions' AND policyname = 'service_all') THEN
    CREATE POLICY "service_all" ON promo_redemptions FOR ALL TO service_role USING (true) WITH CHECK (true);
  END IF;
END $$;
