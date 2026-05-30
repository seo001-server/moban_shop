-- name: CreateUser :execresult
INSERT INTO users (email, password_hash)
VALUES (?, ?);

-- name: GetUserByEmail :one
SELECT id, email, password_hash, created_at
FROM users
WHERE email = ?
LIMIT 1;

-- name: GetUserByID :one
SELECT id, email, password_hash, created_at
FROM users
WHERE id = ?
LIMIT 1;
