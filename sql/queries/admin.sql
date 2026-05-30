-- name: GetAdminByAccount :one
SELECT id, account, nickname, password_hash, created_at FROM `admin` WHERE account = ? LIMIT 1;

-- name: GetAdminByID :one
SELECT id, account, nickname, password_hash, created_at FROM `admin` WHERE id = ? LIMIT 1;

-- name: AdminUpdateNickname :exec
UPDATE `admin` SET nickname = ? WHERE id = ?;

-- name: AdminUpdatePassword :exec
UPDATE `admin` SET password_hash = ? WHERE id = ?;
