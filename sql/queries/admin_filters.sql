-- Filtered admin list queries (empty string param = no filter)

-- name: AdminCountOrdersFiltered :one
SELECT COUNT(DISTINCT o.id) AS count
FROM orders o
INNER JOIN users u ON u.id = o.user_id
WHERE (? = '' OR o.status = ?)
  AND (? = '' OR u.email LIKE CONCAT('%', ?, '%'))
  AND (? = '' OR o.order_no = ?)
  AND (? = '' OR o.created_at >= ?)
  AND (? = '' OR o.created_at < DATE_ADD(?, INTERVAL 1 DAY));

-- name: AdminListOrdersFilteredPaged :many
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
LIMIT ? OFFSET ?;

-- name: AdminCountUsersFiltered :one
SELECT COUNT(*) AS count FROM users
WHERE (? = '' OR email LIKE CONCAT('%', ?, '%') OR user_no = ?);

-- name: AdminListUsersFilteredPaged :many
SELECT id, user_no, email, created_at FROM users
WHERE (? = '' OR email LIKE CONCAT('%', ?, '%') OR user_no = ?)
ORDER BY id DESC
LIMIT ? OFFSET ?;

-- name: AdminCountProductsFiltered :one
SELECT COUNT(*) AS count FROM products
WHERE (? = '' OR category = ?)
  AND (? = '' OR recommended = ?)
  AND (? = '' OR title LIKE CONCAT('%', ?, '%') OR slug LIKE CONCAT('%', ?, '%'));

-- name: AdminListProductsFilteredPaged :many
SELECT id, slug, category, title, description, price_minor, currency, image_url, preview_url, sort_order, recommended, visible, downloads, score, created_at
FROM products
WHERE (? = '' OR category = ?)
  AND (? = '' OR recommended = ?)
  AND (? = '' OR title LIKE CONCAT('%', ?, '%') OR slug LIKE CONCAT('%', ?, '%'))
ORDER BY sort_order ASC, id ASC
LIMIT ? OFFSET ?;
