-- name: CreatePasswordResetToken :execresult
INSERT INTO password_reset_tokens (user_id, token_hash, expires_at)
VALUES (?, ?, ?);

-- name: GetValidPasswordResetToken :one
SELECT id, user_id, token_hash, expires_at, used_at, created_at
FROM password_reset_tokens
WHERE token_hash = ?
  AND used_at IS NULL
  AND expires_at > UTC_TIMESTAMP()
LIMIT 1;

-- name: MarkPasswordResetTokenUsed :exec
UPDATE password_reset_tokens
SET used_at = UTC_TIMESTAMP()
WHERE id = ?;
