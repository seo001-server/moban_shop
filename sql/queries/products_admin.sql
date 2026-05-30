-- name: AdminCreateProduct :execresult

INSERT INTO products (slug, category, title, description, price_minor, currency, image_url, preview_url, sort_order, recommended, downloads, score)

VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);



-- name: AdminListProducts :many

SELECT id, slug, category, title, description, price_minor, currency, image_url, preview_url, sort_order, recommended, downloads, score, created_at

FROM products

ORDER BY sort_order ASC, id ASC;



-- name: AdminGetProductByID :one

SELECT id, slug, category, title, description, price_minor, currency, image_url, preview_url, sort_order, recommended, downloads, score, created_at

FROM products

WHERE id = ?

LIMIT 1;



-- name: AdminGetProductBySlug :one

SELECT id, slug, category, title, description, price_minor, currency, image_url, preview_url, sort_order, recommended, downloads, score, created_at

FROM products

WHERE slug = ?

LIMIT 1;



-- name: AdminUpdateProduct :exec

UPDATE products

SET slug = ?, category = ?, title = ?, description = ?, price_minor = ?, currency = ?, image_url = ?, preview_url = ?, sort_order = ?, recommended = ?, downloads = ?, score = ?

WHERE id = ?;



-- name: AdminDeleteProduct :exec

DELETE FROM products

WHERE id = ?;


