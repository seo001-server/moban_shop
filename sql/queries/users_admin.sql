-- name: AdminListUsers :many
SELECT id, user_no, email, created_at
FROM users
ORDER BY id DESC;

-- name: AdminGetUserByID :one
SELECT id, user_no, email, created_at
FROM users
WHERE id = ?
LIMIT 1;
