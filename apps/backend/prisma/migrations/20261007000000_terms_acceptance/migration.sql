-- Proof of consent: when a person accepted the terms and which version of the text they saw.
-- Accounts created before this migration have no recorded acceptance (NULL).
ALTER TABLE users
  ADD COLUMN terms_accepted_at TIMESTAMPTZ,
  ADD COLUMN terms_version VARCHAR(20);
