// Code generated manually for cart.sql (sqlc generate blocked by schema ALTER duplicates).

package db

import (
	"context"
	"database/sql"
	"time"
)

type CartItem struct {
	ID        uint64    `json:"id"`
	UserID    uint64    `json:"user_id"`
	ProductID uint64    `json:"product_id"`
	Quantity  uint32    `json:"quantity"`
	CreatedAt time.Time `json:"created_at"`
	UpdatedAt time.Time `json:"updated_at"`
}

const listCartItemsByUser = `-- name: ListCartItemsByUser :many
SELECT
  ci.product_id,
  ci.quantity,
  p.slug,
  p.title,
  p.price_minor,
  p.currency,
  p.image_url
FROM cart_items ci
INNER JOIN products p ON p.id = ci.product_id
WHERE ci.user_id = ?
ORDER BY ci.updated_at DESC, ci.id DESC
`

type ListCartItemsByUserRow struct {
	ProductID  uint64         `json:"product_id"`
	Quantity   uint32         `json:"quantity"`
	Slug       string         `json:"slug"`
	Title      string         `json:"title"`
	PriceMinor int64          `json:"price_minor"`
	Currency   string         `json:"currency"`
	ImageUrl   sql.NullString `json:"image_url"`
}

func (q *Queries) ListCartItemsByUser(ctx context.Context, userID uint64) ([]ListCartItemsByUserRow, error) {
	rows, err := q.db.QueryContext(ctx, listCartItemsByUser, userID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	items := []ListCartItemsByUserRow{}
	for rows.Next() {
		var i ListCartItemsByUserRow
		if err := rows.Scan(
			&i.ProductID,
			&i.Quantity,
			&i.Slug,
			&i.Title,
			&i.PriceMinor,
			&i.Currency,
			&i.ImageUrl,
		); err != nil {
			return nil, err
		}
		items = append(items, i)
	}
	return items, rows.Err()
}

const getCartItemByUserProduct = `-- name: GetCartItemByUserProduct :one
SELECT id, user_id, product_id, quantity, created_at, updated_at
FROM cart_items
WHERE user_id = ? AND product_id = ?
`

type GetCartItemByUserProductParams struct {
	UserID    uint64 `json:"user_id"`
	ProductID uint64 `json:"product_id"`
}

func (q *Queries) GetCartItemByUserProduct(ctx context.Context, arg GetCartItemByUserProductParams) (CartItem, error) {
	row := q.db.QueryRowContext(ctx, getCartItemByUserProduct, arg.UserID, arg.ProductID)
	var i CartItem
	err := row.Scan(
		&i.ID,
		&i.UserID,
		&i.ProductID,
		&i.Quantity,
		&i.CreatedAt,
		&i.UpdatedAt,
	)
	return i, err
}

const insertCartItem = `-- name: InsertCartItem :execresult
INSERT INTO cart_items (user_id, product_id, quantity)
VALUES (?, ?, ?)
`

type InsertCartItemParams struct {
	UserID    uint64 `json:"user_id"`
	ProductID uint64 `json:"product_id"`
	Quantity  uint32 `json:"quantity"`
}

func (q *Queries) InsertCartItem(ctx context.Context, arg InsertCartItemParams) (sql.Result, error) {
	return q.db.ExecContext(ctx, insertCartItem, arg.UserID, arg.ProductID, arg.Quantity)
}

const updateCartItemQuantity = `-- name: UpdateCartItemQuantity :execrows
UPDATE cart_items
SET quantity = ?
WHERE user_id = ? AND product_id = ?
`

type UpdateCartItemQuantityParams struct {
	Quantity  uint32 `json:"quantity"`
	UserID    uint64 `json:"user_id"`
	ProductID uint64 `json:"product_id"`
}

func (q *Queries) UpdateCartItemQuantity(ctx context.Context, arg UpdateCartItemQuantityParams) (int64, error) {
	res, err := q.db.ExecContext(ctx, updateCartItemQuantity, arg.Quantity, arg.UserID, arg.ProductID)
	if err != nil {
		return 0, err
	}
	return res.RowsAffected()
}

const deleteCartItem = `-- name: DeleteCartItem :execrows
DELETE FROM cart_items
WHERE user_id = ? AND product_id = ?
`

type DeleteCartItemParams struct {
	UserID    uint64 `json:"user_id"`
	ProductID uint64 `json:"product_id"`
}

func (q *Queries) DeleteCartItem(ctx context.Context, arg DeleteCartItemParams) (int64, error) {
	res, err := q.db.ExecContext(ctx, deleteCartItem, arg.UserID, arg.ProductID)
	if err != nil {
		return 0, err
	}
	return res.RowsAffected()
}

const clearCartByUser = `-- name: ClearCartByUser :execrows
DELETE FROM cart_items
WHERE user_id = ?
`

func (q *Queries) ClearCartByUser(ctx context.Context, userID uint64) (int64, error) {
	res, err := q.db.ExecContext(ctx, clearCartByUser, userID)
	if err != nil {
		return 0, err
	}
	return res.RowsAffected()
}
