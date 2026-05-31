-- name: ListCartItemsByUser :many
SELECT
  ci.product_id,
  ci.quantity,
  p.slug,
  p.title,
  p.price_minor,
  p.currency,
  p.image_url,
  p.visible AS product_visible
FROM cart_items ci
INNER JOIN products p ON p.id = ci.product_id
WHERE ci.user_id = ?
ORDER BY ci.updated_at DESC, ci.id DESC;

-- name: GetCartItemByUserProduct :one
SELECT id, user_id, product_id, quantity, created_at, updated_at
FROM cart_items
WHERE user_id = ? AND product_id = ?;

-- name: InsertCartItem :execresult
INSERT INTO cart_items (user_id, product_id, quantity)
VALUES (?, ?, ?);

-- name: UpdateCartItemQuantity :execrows
UPDATE cart_items
SET quantity = ?
WHERE user_id = ? AND product_id = ?;

-- name: DeleteCartItem :execrows
DELETE FROM cart_items
WHERE user_id = ? AND product_id = ?;

-- name: ClearCartByUser :execrows
DELETE FROM cart_items
WHERE user_id = ?;
