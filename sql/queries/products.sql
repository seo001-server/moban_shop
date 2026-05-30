-- name: ListProducts :many

SELECT id, slug, category, title, description, price_minor, currency, image_url, preview_url, sort_order, recommended, downloads, score, created_at

FROM products

ORDER BY sort_order ASC, id ASC;



-- name: ListProductsByCategory :many

SELECT id, slug, category, title, description, price_minor, currency, image_url, preview_url, sort_order, recommended, downloads, score, created_at

FROM products

WHERE category = ?

ORDER BY sort_order ASC, id ASC;



-- name: GetProductByID :one

SELECT id, slug, category, title, description, price_minor, currency, image_url, preview_url, sort_order, recommended, downloads, score, created_at

FROM products

WHERE id = ?

LIMIT 1;


