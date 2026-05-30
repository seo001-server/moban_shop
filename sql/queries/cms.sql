-- Business section metadata

-- name: ListBusinessSections :many
SELECT slug, label, icon, tagline, description, sort_order, enabled, created_at, updated_at
FROM business_sections
WHERE enabled = 1
ORDER BY sort_order ASC, slug ASC;

-- name: AdminListBusinessSections :many
SELECT slug, label, icon, tagline, description, sort_order, enabled, created_at, updated_at
FROM business_sections
ORDER BY sort_order ASC, slug ASC;

-- name: AdminGetBusinessSection :one
SELECT slug, label, icon, tagline, description, sort_order, enabled, created_at, updated_at
FROM business_sections
WHERE slug = ?
LIMIT 1;

-- name: AdminUpdateBusinessSection :exec
UPDATE business_sections
SET label = ?, icon = ?, tagline = ?, description = ?, sort_order = ?, enabled = ?
WHERE slug = ?;

-- Site content (key-value JSON)

-- name: GetSiteContent :one
SELECT content_key, content_json, updated_at
FROM site_content
WHERE content_key = ?
LIMIT 1;

-- name: UpsertSiteContent :exec
INSERT INTO site_content (content_key, content_json)
VALUES (?, ?)
ON DUPLICATE KEY UPDATE content_json = VALUES(content_json);

-- Docs

-- name: GetDocBySlug :one
SELECT slug, title, markdown, created_at, updated_at
FROM docs
WHERE slug = ?
LIMIT 1;

-- name: AdminListDocs :many
SELECT slug, title, updated_at
FROM docs
ORDER BY slug ASC;

-- name: AdminGetDoc :one
SELECT slug, title, markdown, created_at, updated_at
FROM docs
WHERE slug = ?
LIMIT 1;

-- name: UpsertDoc :exec
INSERT INTO docs (slug, title, markdown)
VALUES (?, ?, ?)
ON DUPLICATE KEY UPDATE title = VALUES(title), markdown = VALUES(markdown);

-- Dashboard with configurable day window

-- name: AdminDailyNewUsersSince :many
SELECT DATE(created_at) AS day, COUNT(*) AS count
FROM users
WHERE created_at >= DATE_SUB(CURDATE(), INTERVAL ? DAY)
GROUP BY DATE(created_at)
ORDER BY day ASC;

-- name: AdminDailyNewOrdersSince :many
SELECT DATE(created_at) AS day, COUNT(*) AS count
FROM orders
WHERE created_at >= DATE_SUB(CURDATE(), INTERVAL ? DAY)
GROUP BY DATE(created_at)
ORDER BY day ASC;
