-- name: UserOwnsPaidProduct :one
SELECT EXISTS(
  SELECT 1
  FROM order_items oi
  INNER JOIN orders o ON o.id = oi.order_id
  WHERE o.user_id = ? AND oi.product_id = ? AND o.status = 'paid'
) AS owned;
