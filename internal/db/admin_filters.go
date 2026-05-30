package db

import (
	"context"
	"database/sql"
	"time"
)

type AdminOrdersFilterArgs struct {
	StatusFlag string
	Status     string
	QueryFlag  string
	Query      string
	FromFlag   string
	From       string
	ToFlag     string
	To         string
}

func NewAdminOrdersFilterArgs(status, query, from, to string) AdminOrdersFilterArgs {
	a := AdminOrdersFilterArgs{}
	if status != "" {
		a.StatusFlag, a.Status = status, status
	}
	if query != "" {
		a.QueryFlag, a.Query = query, query
	}
	if from != "" {
		a.FromFlag, a.From = from, from
	}
	if to != "" {
		a.ToFlag, a.To = to, to
	}
	return a
}

type AdminProductsFilterArgs struct {
	CategoryFlag     string
	Category         string
	RecommendedFlag  string
	RecommendedValue int64
	QueryFlag        string
	Query            string
}

func NewAdminProductsFilterArgs(category, recommended, query string) AdminProductsFilterArgs {
	a := AdminProductsFilterArgs{}
	if category != "" {
		a.CategoryFlag, a.Category = category, category
	}
	switch recommended {
	case "1":
		a.RecommendedFlag = "1"
		a.RecommendedValue = 1
	case "0":
		a.RecommendedFlag = "0"
		a.RecommendedValue = 0
	}
	if query != "" {
		a.QueryFlag, a.Query = query, query
	}
	return a
}

const adminCountOrdersFiltered = `-- name: AdminCountOrdersFiltered :one
SELECT COUNT(DISTINCT o.id) AS count
FROM orders o
INNER JOIN users u ON u.id = o.user_id
WHERE (? = '' OR o.status = ?)
  AND (? = '' OR u.email LIKE CONCAT('%', ?, '%'))
  AND (? = '' OR o.created_at >= ?)
  AND (? = '' OR o.created_at < DATE_ADD(?, INTERVAL 1 DAY))
`

func (q *Queries) AdminCountOrdersFiltered(ctx context.Context, arg AdminOrdersFilterArgs) (int64, error) {
	row := q.db.QueryRowContext(ctx, adminCountOrdersFiltered,
		arg.StatusFlag, arg.Status,
		arg.QueryFlag, arg.Query, arg.Query,
		arg.FromFlag, arg.From,
		arg.ToFlag, arg.To, arg.To,
	)
	var count int64
	err := row.Scan(&count)
	return count, err
}

const adminListOrdersFilteredPaged = `-- name: AdminListOrdersFilteredPaged :many
SELECT
  o.id,
  o.user_id,
  u.email AS user_email,
  o.status,
  o.total_amount_minor,
  o.currency,
  o.created_at,
  o.updated_at,
  COUNT(oi.id) AS item_count,
  GROUP_CONCAT(
    CONCAT(p.title, IF(oi.quantity > 1, CONCAT(' ×', oi.quantity), ''))
    ORDER BY oi.id
    SEPARATOR '、'
  ) AS items_summary
FROM orders o
INNER JOIN users u ON u.id = o.user_id
LEFT JOIN order_items oi ON oi.order_id = o.id
LEFT JOIN products p ON p.id = oi.product_id
WHERE (? = '' OR o.status = ?)
  AND (? = '' OR u.email LIKE CONCAT('%', ?, '%'))
  AND (? = '' OR o.created_at >= ?)
  AND (? = '' OR o.created_at < DATE_ADD(?, INTERVAL 1 DAY))
GROUP BY o.id, o.user_id, u.email, o.status, o.total_amount_minor, o.currency, o.created_at, o.updated_at
ORDER BY o.created_at DESC, o.id DESC
LIMIT ? OFFSET ?
`

func (q *Queries) AdminListOrdersFilteredPaged(ctx context.Context, arg AdminOrdersFilterArgs, limit, offset int32) ([]AdminListOrdersRow, error) {
	rows, err := q.db.QueryContext(ctx, adminListOrdersFilteredPaged,
		arg.StatusFlag, arg.Status,
		arg.QueryFlag, arg.Query, arg.Query,
		arg.FromFlag, arg.From,
		arg.ToFlag, arg.To, arg.To,
		limit, offset,
	)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	return scanAdminListOrdersRows(rows)
}

type AdminListOrdersExportRow struct {
	ID               uint64         `json:"id"`
	UserEmail        string         `json:"user_email"`
	Status           string         `json:"status"`
	TotalAmountMinor int64          `json:"total_amount_minor"`
	Currency         string         `json:"currency"`
	CreatedAt        time.Time      `json:"created_at"`
	UpdatedAt        time.Time      `json:"updated_at"`
	ItemsSummary     sql.NullString `json:"items_summary"`
}

const adminListOrdersForExport = `-- name: AdminListOrdersForExport :many
SELECT
  o.id,
  u.email AS user_email,
  o.status,
  o.total_amount_minor,
  o.currency,
  o.created_at,
  o.updated_at,
  GROUP_CONCAT(
    CONCAT(p.title, IF(oi.quantity > 1, CONCAT(' ×', oi.quantity), ''))
    ORDER BY oi.id
    SEPARATOR '、'
  ) AS items_summary
FROM orders o
INNER JOIN users u ON u.id = o.user_id
LEFT JOIN order_items oi ON oi.order_id = o.id
LEFT JOIN products p ON p.id = oi.product_id
WHERE (? = '' OR o.status = ?)
  AND (? = '' OR u.email LIKE CONCAT('%', ?, '%'))
  AND (? = '' OR o.created_at >= ?)
  AND (? = '' OR o.created_at < DATE_ADD(?, INTERVAL 1 DAY))
GROUP BY o.id, u.email, o.status, o.total_amount_minor, o.currency, o.created_at, o.updated_at
ORDER BY o.created_at DESC, o.id DESC
LIMIT 5000
`

func (q *Queries) AdminListOrdersForExport(ctx context.Context, arg AdminOrdersFilterArgs) ([]AdminListOrdersExportRow, error) {
	rows, err := q.db.QueryContext(ctx, adminListOrdersForExport,
		arg.StatusFlag, arg.Status,
		arg.QueryFlag, arg.Query, arg.Query,
		arg.FromFlag, arg.From,
		arg.ToFlag, arg.To, arg.To,
	)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	items := []AdminListOrdersExportRow{}
	for rows.Next() {
		var i AdminListOrdersExportRow
		if err := rows.Scan(
			&i.ID,
			&i.UserEmail,
			&i.Status,
			&i.TotalAmountMinor,
			&i.Currency,
			&i.CreatedAt,
			&i.UpdatedAt,
			&i.ItemsSummary,
		); err != nil {
			return nil, err
		}
		items = append(items, i)
	}
	return items, rows.Err()
}

const adminCountUsersFiltered = `-- name: AdminCountUsersFiltered :one
SELECT COUNT(*) AS count FROM users
WHERE (? = '' OR email LIKE CONCAT('%', ?, '%'))
`

func (q *Queries) AdminCountUsersFiltered(ctx context.Context, query string) (int64, error) {
	row := q.db.QueryRowContext(ctx, adminCountUsersFiltered, query, query)
	var count int64
	err := row.Scan(&count)
	return count, err
}

const adminListUsersFilteredPaged = `-- name: AdminListUsersFilteredPaged :many
SELECT id, email, created_at FROM users
WHERE (? = '' OR email LIKE CONCAT('%', ?, '%'))
ORDER BY id DESC
LIMIT ? OFFSET ?
`

func (q *Queries) AdminListUsersFilteredPaged(ctx context.Context, query string, limit, offset int32) ([]AdminListUsersRow, error) {
	rows, err := q.db.QueryContext(ctx, adminListUsersFilteredPaged, query, query, limit, offset)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	items := []AdminListUsersRow{}
	for rows.Next() {
		var i AdminListUsersRow
		if err := rows.Scan(&i.ID, &i.Email, &i.CreatedAt); err != nil {
			return nil, err
		}
		items = append(items, i)
	}
	return items, rows.Err()
}

const adminCountProductsFiltered = `-- name: AdminCountProductsFiltered :one
SELECT COUNT(*) AS count FROM products
WHERE (? = '' OR category = ?)
  AND (? = '' OR recommended = ?)
  AND (? = '' OR title LIKE CONCAT('%', ?, '%') OR slug LIKE CONCAT('%', ?, '%'))
`

func (q *Queries) AdminCountProductsFiltered(ctx context.Context, arg AdminProductsFilterArgs) (int64, error) {
	row := q.db.QueryRowContext(ctx, adminCountProductsFiltered,
		arg.CategoryFlag, arg.Category,
		arg.RecommendedFlag, arg.RecommendedValue,
		arg.QueryFlag, arg.Query, arg.Query,
	)
	var count int64
	err := row.Scan(&count)
	return count, err
}

const adminListProductsFilteredPaged = `-- name: AdminListProductsFilteredPaged :many
SELECT id, slug, category, title, description, price_minor, currency, image_url, preview_url, sort_order, recommended, downloads, score, created_at
FROM products
WHERE (? = '' OR category = ?)
  AND (? = '' OR recommended = ?)
  AND (? = '' OR title LIKE CONCAT('%', ?, '%') OR slug LIKE CONCAT('%', ?, '%'))
ORDER BY sort_order ASC, id ASC
LIMIT ? OFFSET ?
`

func (q *Queries) AdminListProductsFilteredPaged(ctx context.Context, arg AdminProductsFilterArgs, limit, offset int32) ([]Product, error) {
	rows, err := q.db.QueryContext(ctx, adminListProductsFilteredPaged,
		arg.CategoryFlag, arg.Category,
		arg.RecommendedFlag, arg.RecommendedValue,
		arg.QueryFlag, arg.Query, arg.Query,
		limit, offset,
	)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	items := []Product{}
	for rows.Next() {
		var i Product
		if err := rows.Scan(
			&i.ID,
			&i.Slug,
			&i.Category,
			&i.Title,
			&i.Description,
			&i.PriceMinor,
			&i.Currency,
			&i.ImageUrl,
			&i.PreviewUrl,
			&i.SortOrder,
			&i.Recommended,
			&i.Downloads,
			&i.Score,
			&i.CreatedAt,
		); err != nil {
			return nil, err
		}
		items = append(items, i)
	}
	return items, rows.Err()
}

func scanAdminListOrdersRows(rows *sql.Rows) ([]AdminListOrdersRow, error) {
	items := []AdminListOrdersRow{}
	for rows.Next() {
		var i AdminListOrdersRow
		if err := rows.Scan(
			&i.ID,
			&i.UserID,
			&i.UserEmail,
			&i.Status,
			&i.TotalAmountMinor,
			&i.Currency,
			&i.CreatedAt,
			&i.UpdatedAt,
			&i.ItemCount,
			&i.ItemsSummary,
		); err != nil {
			return nil, err
		}
		items = append(items, i)
	}
	return items, rows.Err()
}
