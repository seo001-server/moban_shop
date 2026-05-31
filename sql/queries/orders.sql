-- name: CreateOrder :execresult
INSERT INTO orders (order_no, user_id, status, total_amount_minor, currency)
VALUES (?, ?, ?, ?, ?);

-- name: CreateOrderItem :execresult
INSERT INTO order_items (order_id, product_id, quantity, unit_price_minor)
VALUES (?, ?, ?, ?);

-- name: CountOrdersByUser :one
SELECT COUNT(*) AS count FROM orders WHERE user_id = ?;

-- name: ListOrdersByUserPaged :many
SELECT
  o.id,
  o.order_no,
  o.status,
  o.total_amount_minor,
  o.currency,
  o.created_at,
  COUNT(oi.id) AS item_count,
  GROUP_CONCAT(
    CONCAT(p.title, IF(oi.quantity > 1, CONCAT(' ×', oi.quantity), ''))
    ORDER BY oi.id
    SEPARATOR '、'
  ) AS items_summary
FROM orders o
LEFT JOIN order_items oi ON oi.order_id = o.id
LEFT JOIN products p ON p.id = oi.product_id
WHERE o.user_id = ?
GROUP BY o.id, o.status, o.total_amount_minor, o.currency, o.created_at
ORDER BY o.created_at DESC, o.id DESC
LIMIT ? OFFSET ?;

-- name: GetOrderHeaderForUser :one
SELECT
  o.id,
  o.order_no,
  o.user_id,
  o.status,
  o.total_amount_minor,
  o.currency,
  o.created_at
FROM orders o
WHERE o.id = ? AND o.user_id = ?
LIMIT 1;

-- name: ListOrderItemsByOrderID :many
SELECT
  oi.id,
  oi.order_id,
  oi.product_id,
  p.slug AS product_slug,
  p.title AS product_title,
  p.preview_url AS product_preview_url,
  p.download_url AS product_download_url,
  p.image_url AS product_image_url,
  p.visible AS product_visible,
  oi.quantity,
  oi.unit_price_minor
FROM order_items oi
INNER JOIN products p ON p.id = oi.product_id
WHERE oi.order_id = ?
ORDER BY oi.id ASC;

-- name: UpdateOrderStatusByID :execrows
UPDATE orders SET status = ? WHERE id = ? AND status = ?;

-- name: PayOrderIfPending :execrows
UPDATE orders SET status = 'paid' WHERE id = ? AND user_id = ? AND status = 'pending';
