-- name: AdminListOrders :many
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
GROUP BY o.id, o.user_id, u.email, o.status, o.total_amount_minor, o.currency, o.created_at, o.updated_at
ORDER BY o.created_at DESC, o.id DESC;

-- name: AdminListRecentOrders :many
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
GROUP BY o.id, o.user_id, u.email, o.status, o.total_amount_minor, o.currency, o.created_at, o.updated_at
ORDER BY o.created_at DESC, o.id DESC
LIMIT ?;

-- name: AdminGetOrderByID :one
SELECT
  o.id,
  o.user_id,
  u.email AS user_email,
  o.status,
  o.total_amount_minor,
  o.currency,
  o.created_at,
  o.updated_at
FROM orders o
INNER JOIN users u ON u.id = o.user_id
WHERE o.id = ?
LIMIT 1;

-- name: AdminListOrderItems :many
SELECT
  oi.id,
  oi.order_id,
  oi.product_id,
  p.title AS product_title,
  oi.quantity,
  oi.unit_price_minor
FROM order_items oi
INNER JOIN products p ON p.id = oi.product_id
WHERE oi.order_id = ?
ORDER BY oi.id ASC;

-- name: AdminCountOrdersByUser :one
SELECT COUNT(*) AS count FROM orders WHERE user_id = ?;

-- name: AdminGetOrderUserID :one
SELECT user_id FROM orders WHERE id = ? LIMIT 1;
