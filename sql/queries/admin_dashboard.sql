-- name: AdminCountUsers :one
SELECT COUNT(*) AS count FROM users;

-- name: AdminCountProducts :one
SELECT COUNT(*) AS count FROM products;

-- name: AdminCountOrders :one
SELECT COUNT(*) AS count FROM orders;

-- name: AdminCountOrdersByStatus :one
SELECT COUNT(*) AS count FROM orders WHERE status = ?;

-- name: AdminSumPaidAmount :one
SELECT COALESCE(SUM(total_amount_minor), 0) AS total
FROM orders
WHERE status = 'paid';

-- name: AdminCountUsersToday :one
SELECT COUNT(*) AS count FROM users WHERE DATE(created_at) = CURDATE();

-- name: AdminCountUsersYesterday :one
SELECT COUNT(*) AS count FROM users WHERE DATE(created_at) = DATE_SUB(CURDATE(), INTERVAL 1 DAY);

-- name: AdminCountOrdersToday :one
SELECT COUNT(*) AS count FROM orders WHERE DATE(created_at) = CURDATE();

-- name: AdminCountOrdersYesterday :one
SELECT COUNT(*) AS count FROM orders WHERE DATE(created_at) = DATE_SUB(CURDATE(), INTERVAL 1 DAY);

-- name: AdminDailyNewUsers :many
SELECT DATE(created_at) AS day, COUNT(*) AS count
FROM users
WHERE created_at >= DATE_SUB(CURDATE(), INTERVAL 6 DAY)
GROUP BY DATE(created_at)
ORDER BY day ASC;

-- name: AdminDailyNewOrders :many
SELECT DATE(created_at) AS day, COUNT(*) AS count
FROM orders
WHERE created_at >= DATE_SUB(CURDATE(), INTERVAL 6 DAY)
GROUP BY DATE(created_at)
ORDER BY day ASC;

-- name: AdminTopProductSales :many
SELECT
  p.id AS product_id,
  p.title AS product_title,
  COALESCE(SUM(oi.quantity), 0) AS sales_qty
FROM order_items oi
JOIN products p ON p.id = oi.product_id
JOIN orders o ON o.id = oi.order_id
WHERE o.status = 'paid'
GROUP BY p.id, p.title
ORDER BY sales_qty DESC, p.id ASC
LIMIT 5;

-- name: AdminDailyPaidRevenue :many
SELECT DATE(updated_at) AS day, COALESCE(SUM(total_amount_minor), 0) AS amount
FROM orders
WHERE status = 'paid'
  AND updated_at >= DATE_SUB(CURDATE(), INTERVAL 6 DAY)
GROUP BY DATE(updated_at)
ORDER BY day ASC;
