package db

import (
	"context"
	"time"
)

const insertAdminAuditLog = `-- name: InsertAdminAuditLog :exec
INSERT INTO admin_audit_logs (admin_id, action, resource, resource_id, detail, ip)
VALUES (?, ?, ?, ?, ?, ?)
`

type InsertAdminAuditLogParams struct {
	AdminID    uint64
	Action     string
	Resource   string
	ResourceID string
	Detail     string
	Ip         string
}

func (q *Queries) InsertAdminAuditLog(ctx context.Context, arg InsertAdminAuditLogParams) error {
	_, err := q.db.ExecContext(ctx, insertAdminAuditLog,
		arg.AdminID,
		arg.Action,
		arg.Resource,
		arg.ResourceID,
		arg.Detail,
		arg.Ip,
	)
	return err
}

type AdminAuditLogsFilterArgs struct {
	ActionFlag string
	Action     string
	ResourceFlag string
	Resource     string
	FromFlag     string
	From         string
	ToFlag       string
	To           string
}

func NewAdminAuditLogsFilterArgs(action, resource, from, to string) AdminAuditLogsFilterArgs {
	a := AdminAuditLogsFilterArgs{}
	if action != "" {
		a.ActionFlag, a.Action = action, action
	}
	if resource != "" {
		a.ResourceFlag, a.Resource = resource, resource
	}
	if from != "" {
		a.FromFlag, a.From = from, from
	}
	if to != "" {
		a.ToFlag, a.To = to, to
	}
	return a
}

const adminCountAuditLogsFiltered = `-- name: AdminCountAuditLogsFiltered :one
SELECT COUNT(*) AS count
FROM admin_audit_logs l
WHERE (? = '' OR l.action = ?)
  AND (? = '' OR l.resource = ?)
  AND (? = '' OR l.created_at >= ?)
  AND (? = '' OR l.created_at < DATE_ADD(?, INTERVAL 1 DAY))
`

func (q *Queries) AdminCountAuditLogsFiltered(ctx context.Context, arg AdminAuditLogsFilterArgs) (int64, error) {
	row := q.db.QueryRowContext(ctx, adminCountAuditLogsFiltered,
		arg.ActionFlag, arg.Action,
		arg.ResourceFlag, arg.Resource,
		arg.FromFlag, arg.From,
		arg.ToFlag, arg.To,
	)
	var count int64
	err := row.Scan(&count)
	return count, err
}

const adminListAuditLogsFilteredPaged = `-- name: AdminListAuditLogsFilteredPaged :many
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
INNER JOIN ` + "`admin`" + ` a ON a.id = l.admin_id
WHERE (? = '' OR l.action = ?)
  AND (? = '' OR l.resource = ?)
  AND (? = '' OR l.created_at >= ?)
  AND (? = '' OR l.created_at < DATE_ADD(?, INTERVAL 1 DAY))
ORDER BY l.id DESC
LIMIT ?
OFFSET ?
`

type AdminListAuditLogsPagedRow struct {
	ID            uint64    `json:"id"`
	AdminID       uint64    `json:"admin_id"`
	AdminAccount  string    `json:"admin_account"`
	AdminNickname string    `json:"admin_nickname"`
	Action        string    `json:"action"`
	Resource      string    `json:"resource"`
	ResourceID    string    `json:"resource_id"`
	Detail        string    `json:"detail"`
	Ip            string    `json:"ip"`
	CreatedAt     time.Time `json:"created_at"`
}

func (q *Queries) AdminListAuditLogsFilteredPaged(ctx context.Context, arg AdminAuditLogsFilterArgs, limit int32, offset int32) ([]AdminListAuditLogsPagedRow, error) {
	rows, err := q.db.QueryContext(ctx, adminListAuditLogsFilteredPaged,
		arg.ActionFlag, arg.Action,
		arg.ResourceFlag, arg.Resource,
		arg.FromFlag, arg.From,
		arg.ToFlag, arg.To,
		limit, offset,
	)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	items := []AdminListAuditLogsPagedRow{}
	for rows.Next() {
		var i AdminListAuditLogsPagedRow
		if err := rows.Scan(
			&i.ID,
			&i.AdminID,
			&i.AdminAccount,
			&i.AdminNickname,
			&i.Action,
			&i.Resource,
			&i.ResourceID,
			&i.Detail,
			&i.Ip,
			&i.CreatedAt,
		); err != nil {
			return nil, err
		}
		items = append(items, i)
	}
	if err := rows.Close(); err != nil {
		return nil, err
	}
	if err := rows.Err(); err != nil {
		return nil, err
	}
	return items, nil
}
