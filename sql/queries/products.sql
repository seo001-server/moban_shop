-- name: ListProducts :many

SELECT id, slug, category, title, description, price_minor, currency, image_url, preview_url, sort_order, recommended, visible, downloads, score, created_at

FROM products

WHERE visible = 1

ORDER BY sort_order ASC, id ASC;



-- name: ListProductsByCategory :many

SELECT id, slug, category, title, description, price_minor, currency, image_url, preview_url, sort_order, recommended, visible, downloads, score, created_at

FROM products

WHERE category = ? AND visible = 1

ORDER BY sort_order ASC, id ASC;



-- name: GetProductByID :one

SELECT id, slug, category, title, description, price_minor, currency, image_url, preview_url, sort_order, recommended, visible, downloads, score, created_at

FROM products

WHERE id = ? AND visible = 1

LIMIT 1;

