ALTER TABLE users
  ADD COLUMN mfa_secret TEXT,
  ADD COLUMN mfa_enabled_at TIMESTAMPTZ,
  ADD COLUMN mfa_last_step BIGINT,
  ADD COLUMN failed_login_count INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN locked_until TIMESTAMPTZ;

CREATE TABLE mfa_backup_codes (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  code_hash VARCHAR(64) NOT NULL,
  used_at TIMESTAMPTZ
);
CREATE INDEX mfa_backup_codes_user_id_idx ON mfa_backup_codes(user_id);

CREATE TABLE audit_logs (
  id TEXT PRIMARY KEY,
  user_id TEXT REFERENCES users(id) ON DELETE SET NULL,
  action VARCHAR(80) NOT NULL,
  resource_type VARCHAR(50),
  resource_id VARCHAR(100),
  ip_address VARCHAR(64),
  user_agent VARCHAR(500),
  metadata JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX audit_logs_action_created_at_idx ON audit_logs(action, created_at);
CREATE INDEX audit_logs_user_id_created_at_idx ON audit_logs(user_id, created_at);
CREATE INDEX audit_logs_resource_type_resource_id_idx ON audit_logs(resource_type, resource_id);
