-- name: InsertAdminAuditLog :exec
INSERT INTO admin_audit_logs (admin_id, action, resource, resource_id, detail, ip)
VALUES (?, ?, ?, ?, ?, ?);

-- name: AdminCountAuditLogsFiltered :one
SELECT COUNT(*) AS count
FROM admin_audit_logs l
WHERE (? = '' OR l.action = ?)
  AND (? = '' OR l.resource = ?)
  AND (? = '' OR l.created_at >= ?)
  AND (? = '' OR l.created_at < DATE_ADD(?, INTERVAL 1 DAY));

-- name: AdminListAuditLogsFilteredPaged :many
SELECT
  l.id,
  l.admin_id,
  a.account AS admin_account,
  COALESCE(NULLIF(TRIM(a.nickname), ''), a.account) AS admin_nickname,
  l.action,
  l.resource,
  l.resource_id,
  l.detail,
  l.ip,
  l.created_at
FROM admin_audit_logs l
INNER JOIN `admin` a ON a.id = l.admin_id
WHERE (? = '' OR l.action = ?)
  AND (? = '' OR l.resource = ?)
  AND (? = '' OR l.created_at >= ?)
  AND (? = '' OR l.created_at < DATE_ADD(?, INTERVAL 1 DAY))
ORDER BY l.id DESC
LIMIT ?
OFFSET ?;
