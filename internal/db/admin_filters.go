package db

import (
	"context"
	"database/sql"
)

type AdminOrdersFilterArgs struct {
	StatusFlag  string
	Status      string
	QueryFlag   string
	Query       string
	OrderNoFlag string
	OrderNo     string
	FromFlag    string
	From        string
	ToFlag      string
	To          string
}

func NewAdminOrdersFilterArgs(status, query, from, to, orderNo string) AdminOrdersFilterArgs {
	a := AdminOrdersFilterArgs{}
	if status != "" {
		a.StatusFlag, a.Status = status, status
	}
	if query != "" {
		a.QueryFlag, a.Query = query, query
	}
	if orderNo != "" {
		a.OrderNoFlag, a.OrderNo = orderNo, orderNo
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
  AND (? = '' OR o.order_no = ?)
  AND (? = '' OR o.created_at >= ?)
  AND (? = '' OR o.created_at < DATE_ADD(?, INTERVAL 1 DAY))
`

func (q *Queries) AdminCountOrdersFiltered(ctx context.Context, arg AdminOrdersFilterArgs) (int64, error) {
	row := q.db.QueryRowContext(ctx, adminCountOrdersFiltered,
		arg.StatusFlag, arg.Status,
		arg.QueryFlag, arg.Query,
		arg.OrderNoFlag, arg.OrderNo,
		arg.FromFlag, arg.From,
		arg.ToFlag, arg.To,
	)
	var count int64
	err := row.Scan(&count)
	return count, err
}

const adminListOrdersFilteredPaged = `-- name: AdminListOrdersFilteredPaged :many
SELECT
  o.id,
  o.order_no,
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
  AND (? = '' OR o.order_no = ?)
  AND (? = '' OR o.created_at >= ?)
  AND (? = '' OR o.created_at < DATE_ADD(?, INTERVAL 1 DAY))
GROUP BY o.id, o.order_no, o.user_id, u.email, o.status, o.total_amount_minor, o.currency, o.created_at, o.updated_at
ORDER BY o.created_at DESC, o.id DESC
LIMIT ? OFFSET ?
`

func (q *Queries) AdminListOrdersFilteredPaged(ctx context.Context, arg AdminOrdersFilterArgs, limit, offset int32) ([]AdminListOrdersRow, error) {
	rows, err := q.db.QueryContext(ctx, adminListOrdersFilteredPaged,
		arg.StatusFlag, arg.Status,
		arg.QueryFlag, arg.Query,
		arg.OrderNoFlag, arg.OrderNo,
		arg.FromFlag, arg.From,
		arg.ToFlag, arg.To,
		limit, offset,
	)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	return scanAdminListOrdersRows(rows)
}

const adminCountUsersFiltered = `-- name: AdminCountUsersFiltered :one
SELECT COUNT(*) AS count FROM users
WHERE (? = '' OR email LIKE CONCAT('%', ?, '%') OR user_no = ?)
`

func (q *Queries) AdminCountUsersFiltered(ctx context.Context, query, userNoQuery string) (int64, error) {
	row := q.db.QueryRowContext(ctx, adminCountUsersFiltered, query, query, userNoQuery)
	var count int64
	err := row.Scan(&count)
	return count, err
}

const adminListUsersFilteredPaged = `-- name: AdminListUsersFilteredPaged :many
SELECT id, user_no, email, created_at FROM users
WHERE (? = '' OR email LIKE CONCAT('%', ?, '%') OR user_no = ?)
ORDER BY id DESC
LIMIT ? OFFSET ?
`

func (q *Queries) AdminListUsersFilteredPaged(ctx context.Context, query, userNoQuery string, limit, offset int32) ([]AdminListUsersRow, error) {
	rows, err := q.db.QueryContext(ctx, adminListUsersFilteredPaged, query, query, userNoQuery, limit, offset)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	items := []AdminListUsersRow{}
	for rows.Next() {
		var i AdminListUsersRow
		if err := rows.Scan(&i.ID, &i.UserNo, &i.Email, &i.CreatedAt); err != nil {
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
SELECT id, slug, category, title, description, price_minor, currency, image_url, preview_url, download_url, sort_order, recommended, visible, downloads, score, created_at
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
		if err := rows.Scan(scanProductFields(&i)...); err != nil {
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
			&i.OrderNo,
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
