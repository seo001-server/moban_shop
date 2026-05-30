package db

import (
	"context"
)

const adminListProductsPaged = `-- name: AdminListProductsPaged :many
SELECT id, slug, category, title, description, price_minor, currency, image_url, preview_url, sort_order, recommended, visible, downloads, score, created_at
FROM products
ORDER BY sort_order ASC, id ASC
LIMIT ? OFFSET ?
`

func (q *Queries) AdminListProductsPaged(ctx context.Context, limit, offset int32) ([]Product, error) {
	rows, err := q.db.QueryContext(ctx, adminListProductsPaged, limit, offset)
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
	return items, rows.Close()
}

const adminListUsersPaged = `-- name: AdminListUsersPaged :many
SELECT id, user_no, email, created_at
FROM users
ORDER BY id DESC
LIMIT ? OFFSET ?
`

func (q *Queries) AdminListUsersPaged(ctx context.Context, limit, offset int32) ([]AdminListUsersRow, error) {
	rows, err := q.db.QueryContext(ctx, adminListUsersPaged, limit, offset)
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
	return items, rows.Close()
}

const adminListOrdersPaged = `-- name: AdminListOrdersPaged :many
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
GROUP BY o.id, o.order_no, o.user_id, u.email, o.status, o.total_amount_minor, o.currency, o.created_at, o.updated_at
ORDER BY o.created_at DESC, o.id DESC
LIMIT ? OFFSET ?
`

func (q *Queries) AdminListOrdersPaged(ctx context.Context, limit, offset int32) ([]AdminListOrdersRow, error) {
	rows, err := q.db.QueryContext(ctx, adminListOrdersPaged, limit, offset)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
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
	return items, rows.Close()
}

const adminCountOrdersByUser = `-- name: AdminCountOrdersByUser :one
SELECT COUNT(*) AS count FROM orders WHERE user_id = ?
`

func (q *Queries) AdminCountOrdersByUser(ctx context.Context, userID uint64) (int64, error) {
	row := q.db.QueryRowContext(ctx, adminCountOrdersByUser, userID)
	var count int64
	err := row.Scan(&count)
	return count, err
}

const adminListOrdersByUserPaged = `-- name: AdminListOrdersByUserPaged :many
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
WHERE o.user_id = ?
GROUP BY o.id, o.order_no, o.user_id, u.email, o.status, o.total_amount_minor, o.currency, o.created_at, o.updated_at
ORDER BY o.created_at DESC, o.id DESC
LIMIT ? OFFSET ?
`

func (q *Queries) AdminListOrdersByUserPaged(ctx context.Context, userID uint64, limit, offset int32) ([]AdminListOrdersRow, error) {
	rows, err := q.db.QueryContext(ctx, adminListOrdersByUserPaged, userID, limit, offset)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
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
	return items, rows.Close()
}

const adminCountBusiness = `-- name: AdminCountBusiness :one
SELECT COUNT(*) FROM ` + "`" + `business` + "`"

const adminCountBusinessBySection = `-- name: AdminCountBusinessBySection :one
SELECT COUNT(*) FROM ` + "`" + `business` + "`" + ` WHERE section_slug = ?
`

func (q *Queries) AdminCountBusiness(ctx context.Context) (int64, error) {
	row := q.db.QueryRowContext(ctx, adminCountBusiness)
	var count int64
	err := row.Scan(&count)
	return count, err
}

func (q *Queries) AdminCountBusinessBySection(ctx context.Context, sectionSlug string) (int64, error) {
	row := q.db.QueryRowContext(ctx, adminCountBusinessBySection, sectionSlug)
	var count int64
	err := row.Scan(&count)
	return count, err
}

const adminListBusinessPaged = `-- name: AdminListBusinessPaged :many
SELECT id, section_slug, title, description, sort_order, created_at, updated_at
FROM ` + "`" + `business` + "`" + `
ORDER BY id ASC
LIMIT ? OFFSET ?
`

func (q *Queries) AdminListBusinessPaged(ctx context.Context, limit, offset int32) ([]Business, error) {
	rows, err := q.db.QueryContext(ctx, adminListBusinessPaged, limit, offset)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	items := []Business{}
	for rows.Next() {
		var i Business
		if err := rows.Scan(
			&i.ID,
			&i.SectionSlug,
			&i.Title,
			&i.Description,
			&i.SortOrder,
			&i.CreatedAt,
			&i.UpdatedAt,
		); err != nil {
			return nil, err
		}
		items = append(items, i)
	}
	return items, rows.Close()
}

const adminListBusinessBySectionPaged = `-- name: AdminListBusinessBySectionPaged :many
SELECT id, section_slug, title, description, sort_order, created_at, updated_at
FROM ` + "`" + `business` + "`" + `
WHERE section_slug = ?
ORDER BY id ASC
LIMIT ? OFFSET ?
`

func (q *Queries) AdminListBusinessBySectionPaged(ctx context.Context, sectionSlug string, limit, offset int32) ([]Business, error) {
	rows, err := q.db.QueryContext(ctx, adminListBusinessBySectionPaged, sectionSlug, limit, offset)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	items := []Business{}
	for rows.Next() {
		var i Business
		if err := rows.Scan(
			&i.ID,
			&i.SectionSlug,
			&i.Title,
			&i.Description,
			&i.SortOrder,
			&i.CreatedAt,
			&i.UpdatedAt,
		); err != nil {
			return nil, err
		}
		items = append(items, i)
	}
	return items, rows.Close()
}
