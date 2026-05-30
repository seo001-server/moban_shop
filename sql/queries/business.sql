-- name: ListBusinessBySection :many
SELECT id, section_slug, title, description, sort_order, created_at, updated_at
FROM `business`
WHERE section_slug = ?
ORDER BY sort_order ASC, id ASC;
