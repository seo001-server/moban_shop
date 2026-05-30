ALTER TABLE admin_audit_logs
  ADD COLUMN detail VARCHAR(512) NOT NULL DEFAULT '' AFTER resource_id;
