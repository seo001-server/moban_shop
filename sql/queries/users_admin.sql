-- name: AdminListUsers :many
SELECT id, email, created_at
FROM users
ORDER BY id DESC;

-- name: AdminGetUserByID :one
SELECT id, email, created_at
FROM users
WHERE id = ?
LIMIT 1;
