-- name: AdminListBusiness :many
SELECT id, section_slug, title, description, sort_order, created_at, updated_at
FROM `business`
ORDER BY id ASC;

-- name: AdminListBusinessBySection :many
SELECT id, section_slug, title, description, sort_order, created_at, updated_at
FROM `business`
WHERE section_slug = ?
ORDER BY id ASC;

-- name: AdminGetBusinessByID :one
SELECT id, section_slug, title, description, sort_order, created_at, updated_at
FROM `business`
WHERE id = ?
LIMIT 1;

-- name: AdminCreateBusiness :execresult
INSERT INTO `business` (section_slug, title, description, sort_order)
VALUES (?, ?, ?, ?);

-- name: AdminUpdateBusiness :exec
UPDATE `business`
SET section_slug = ?, title = ?, description = ?, sort_order = ?
WHERE id = ?;

-- name: AdminDeleteBusiness :exec
DELETE FROM `business`
WHERE id = ?;
