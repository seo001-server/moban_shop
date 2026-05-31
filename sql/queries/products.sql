-- name: ListProducts :many

SELECT id, slug, category, title, description, price_minor, currency, image_url, preview_url, download_url, sort_order, recommended, visible, downloads, score, created_at

FROM products

WHERE visible = 1

ORDER BY sort_order ASC, id ASC;



-- name: ListProductsByCategory :many

SELECT id, slug, category, title, description, price_minor, currency, image_url, preview_url, download_url, sort_order, recommended, visible, downloads, score, created_at

FROM products

WHERE category = ? AND visible = 1

ORDER BY sort_order ASC, id ASC;



-- name: GetProductByID :one

SELECT id, slug, category, title, description, price_minor, currency, image_url, preview_url, download_url, sort_order, recommended, visible, downloads, score, created_at

FROM products

WHERE id = ? AND visible = 1

LIMIT 1;



-- name: GetProductByIDInternal :one

SELECT id, slug, category, title, description, price_minor, currency, image_url, preview_url, download_url, sort_order, recommended, visible, downloads, score, created_at

FROM products

WHERE id = ?

LIMIT 1;



-- name: SearchProducts :many

SELECT id, slug, category, title, description, price_minor, currency, image_url, preview_url, download_url, sort_order, recommended, visible, downloads, score, created_at

FROM products

WHERE visible = 1

  AND (? = '' OR category = ?)

  AND (

    title LIKE CONCAT('%', ?, '%')

    OR slug LIKE CONCAT('%', ?, '%')

    OR (description IS NOT NULL AND description LIKE CONCAT('%', ?, '%'))

  )

ORDER BY

  CASE

    WHEN title LIKE CONCAT('%', ?, '%') THEN 0

    WHEN slug LIKE CONCAT('%', ?, '%') THEN 1

    ELSE 2

  END,

  sort_order ASC,

  id ASC;

