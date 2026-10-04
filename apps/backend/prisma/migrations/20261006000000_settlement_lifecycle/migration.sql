-- Settlement lifecycle: pending -> approved -> paid (or cancelled), with who/when recorded as timestamps and the
-- payout reference given by the operator who made the transfer.
ALTER TABLE settlements
  ADD COLUMN approved_at TIMESTAMPTZ,
  ADD COLUMN paid_at TIMESTAMPTZ,
  ADD COLUMN payout_reference VARCHAR(160);

-- Rows written before this migration carry no lifecycle data; give them the closest truthful values first.
UPDATE settlements SET approved_at = created_at WHERE status IN ('approved', 'paid') AND approved_at IS NULL;
UPDATE settlements SET paid_at = created_at, payout_reference = 'legacy-unrecorded' WHERE status = 'paid' AND (paid_at IS NULL OR payout_reference IS NULL);
UPDATE settlements SET status = 'pending' WHERE status NOT IN ('pending', 'approved', 'paid', 'cancelled');

ALTER TABLE settlements ADD CONSTRAINT settlements_status_check
  CHECK (status IN ('pending', 'approved', 'paid', 'cancelled'));
ALTER TABLE settlements ADD CONSTRAINT settlements_lifecycle_check
  CHECK ((status <> 'approved' OR approved_at IS NOT NULL) AND (status <> 'paid' OR (approved_at IS NOT NULL AND paid_at IS NOT NULL AND payout_reference IS NOT NULL)));
