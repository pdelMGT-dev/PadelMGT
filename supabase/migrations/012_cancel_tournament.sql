-- 012_cancel_tournament.sql
-- Adds 'cancelled' status and previous_status column to personalizado_tournaments.
-- Cancelled tournaments preserve all data so the organizer can reactivate for a
-- different date or venue without losing registrations.

-- Widen the status CHECK constraint to include 'cancelled'.
ALTER TABLE public.personalizado_tournaments
  DROP CONSTRAINT IF EXISTS personalizado_tournaments_status_check;

ALTER TABLE public.personalizado_tournaments
  ADD CONSTRAINT personalizado_tournaments_status_check
  CHECK (status IN ('draft','registration_open','configured','live','finished','cancelled'));

-- Store the status that was active before cancellation so reactivation can restore it.
ALTER TABLE public.personalizado_tournaments
  ADD COLUMN IF NOT EXISTS previous_status TEXT;
