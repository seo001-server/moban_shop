package db

import (
	"context"
	"database/sql"
	"encoding/json"
	"time"
)

type BusinessSection struct {
	Slug        string    `json:"slug"`
	Label       string    `json:"label"`
	Icon        string    `json:"icon"`
	Tagline     string    `json:"tagline"`
	Description string    `json:"description"`
	SortOrder   int32     `json:"sort_order"`
	Enabled     bool      `json:"enabled"`
	CreatedAt   time.Time `json:"created_at"`
	UpdatedAt   time.Time `json:"updated_at"`
}

type SiteContent struct {
	ContentKey  string          `json:"content_key"`
	ContentJson json.RawMessage `json:"content_json"`
	UpdatedAt   time.Time       `json:"updated_at"`
}

type Doc struct {
	Slug      string    `json:"slug"`
	Title     string    `json:"title"`
	Markdown  string    `json:"markdown"`
	CreatedAt time.Time `json:"created_at"`
	UpdatedAt time.Time `json:"updated_at"`
}

type AdminListDocsRow struct {
	Slug      string    `json:"slug"`
	Title     string    `json:"title"`
	UpdatedAt time.Time `json:"updated_at"`
}

type AdminUpdateBusinessSectionParams struct {
	Label       string
	Icon        string
	Tagline     string
	Description string
	SortOrder   int32
	Enabled     bool
	Slug        string
}

const listBusinessSections = `-- name: ListBusinessSections :many
SELECT slug, label, icon, tagline, description, sort_order, enabled, created_at, updated_at
FROM business_sections
WHERE enabled = 1
ORDER BY sort_order ASC, slug ASC
`

func (q *Queries) ListBusinessSections(ctx context.Context) ([]BusinessSection, error) {
	return scanBusinessSections(q.db.QueryContext(ctx, listBusinessSections))
}

const adminListBusinessSections = `-- name: AdminListBusinessSections :many
SELECT slug, label, icon, tagline, description, sort_order, enabled, created_at, updated_at
FROM business_sections
ORDER BY sort_order ASC, slug ASC
`

func (q *Queries) AdminListBusinessSections(ctx context.Context) ([]BusinessSection, error) {
	return scanBusinessSections(q.db.QueryContext(ctx, adminListBusinessSections))
}

const adminGetBusinessSection = `-- name: AdminGetBusinessSection :one
SELECT slug, label, icon, tagline, description, sort_order, enabled, created_at, updated_at
FROM business_sections
WHERE slug = ?
LIMIT 1
`

func (q *Queries) AdminGetBusinessSection(ctx context.Context, slug string) (BusinessSection, error) {
	row := q.db.QueryRowContext(ctx, adminGetBusinessSection, slug)
	return scanBusinessSectionRow(row)
}

const adminUpdateBusinessSection = `-- name: AdminUpdateBusinessSection :exec
UPDATE business_sections
SET label = ?, icon = ?, tagline = ?, description = ?, sort_order = ?, enabled = ?
WHERE slug = ?
`

func (q *Queries) AdminUpdateBusinessSection(ctx context.Context, arg AdminUpdateBusinessSectionParams) error {
	enabled := int64(0)
	if arg.Enabled {
		enabled = 1
	}
	_, err := q.db.ExecContext(ctx, adminUpdateBusinessSection,
		arg.Label, arg.Icon, arg.Tagline, arg.Description, arg.SortOrder, enabled, arg.Slug,
	)
	return err
}

func scanBusinessSectionRow(row *sql.Row) (BusinessSection, error) {
	var i BusinessSection
	var enabled int64
	err := row.Scan(
		&i.Slug, &i.Label, &i.Icon, &i.Tagline, &i.Description,
		&i.SortOrder, &enabled, &i.CreatedAt, &i.UpdatedAt,
	)
	if err != nil {
		return i, err
	}
	i.Enabled = enabled != 0
	return i, nil
}

func scanBusinessSections(rows *sql.Rows, err error) ([]BusinessSection, error) {
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	items := []BusinessSection{}
	for rows.Next() {
		var i BusinessSection
		var enabled int64
		if err := rows.Scan(
			&i.Slug, &i.Label, &i.Icon, &i.Tagline, &i.Description,
			&i.SortOrder, &enabled, &i.CreatedAt, &i.UpdatedAt,
		); err != nil {
			return nil, err
		}
		i.Enabled = enabled != 0
		items = append(items, i)
	}
	return items, rows.Err()
}

const getSiteContent = `-- name: GetSiteContent :one
SELECT content_key, content_json, updated_at
FROM site_content
WHERE content_key = ?
LIMIT 1
`

func (q *Queries) GetSiteContent(ctx context.Context, contentKey string) (SiteContent, error) {
	row := q.db.QueryRowContext(ctx, getSiteContent, contentKey)
	var i SiteContent
	err := row.Scan(&i.ContentKey, &i.ContentJson, &i.UpdatedAt)
	return i, err
}

const upsertSiteContent = `-- name: UpsertSiteContent :exec
INSERT INTO site_content (content_key, content_json)
VALUES (?, ?)
ON DUPLICATE KEY UPDATE content_json = VALUES(content_json)
`

func (q *Queries) UpsertSiteContent(ctx context.Context, contentKey string, contentJSON []byte) error {
	_, err := q.db.ExecContext(ctx, upsertSiteContent, contentKey, contentJSON)
	return err
}

const getDocBySlug = `-- name: GetDocBySlug :one
SELECT slug, title, markdown, created_at, updated_at
FROM docs
WHERE slug = ?
LIMIT 1
`

func (q *Queries) GetDocBySlug(ctx context.Context, slug string) (Doc, error) {
	row := q.db.QueryRowContext(ctx, getDocBySlug, slug)
	var i Doc
	err := row.Scan(&i.Slug, &i.Title, &i.Markdown, &i.CreatedAt, &i.UpdatedAt)
	return i, err
}

const adminListDocs = `-- name: AdminListDocs :many
SELECT slug, title, updated_at
FROM docs
ORDER BY slug ASC
`

func (q *Queries) AdminListDocs(ctx context.Context) ([]AdminListDocsRow, error) {
	rows, err := q.db.QueryContext(ctx, adminListDocs)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	items := []AdminListDocsRow{}
	for rows.Next() {
		var i AdminListDocsRow
		if err := rows.Scan(&i.Slug, &i.Title, &i.UpdatedAt); err != nil {
			return nil, err
		}
		items = append(items, i)
	}
	return items, rows.Err()
}

const adminGetDoc = `-- name: AdminGetDoc :one
SELECT slug, title, markdown, created_at, updated_at
FROM docs
WHERE slug = ?
LIMIT 1
`

func (q *Queries) AdminGetDoc(ctx context.Context, slug string) (Doc, error) {
	row := q.db.QueryRowContext(ctx, adminGetDoc, slug)
	var i Doc
	err := row.Scan(&i.Slug, &i.Title, &i.Markdown, &i.CreatedAt, &i.UpdatedAt)
	return i, err
}

const upsertDoc = `-- name: UpsertDoc :exec
INSERT INTO docs (slug, title, markdown)
VALUES (?, ?, ?)
ON DUPLICATE KEY UPDATE title = VALUES(title), markdown = VALUES(markdown)
`

func (q *Queries) UpsertDoc(ctx context.Context, slug, title, markdown string) error {
	_, err := q.db.ExecContext(ctx, upsertDoc, slug, title, markdown)
	return err
}

const adminDailyNewUsersSince = `-- name: AdminDailyNewUsersSince :many
SELECT DATE(created_at) AS day, COUNT(*) AS count
FROM users
WHERE created_at >= DATE_SUB(CURDATE(), INTERVAL ? DAY)
GROUP BY DATE(created_at)
ORDER BY day ASC
`

func (q *Queries) AdminDailyNewUsersSince(ctx context.Context, intervalDays int32) ([]AdminDailyNewUsersRow, error) {
	rows, err := q.db.QueryContext(ctx, adminDailyNewUsersSince, intervalDays)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	var items []AdminDailyNewUsersRow
	for rows.Next() {
		var i AdminDailyNewUsersRow
		if err := rows.Scan(&i.Day, &i.Count); err != nil {
			return nil, err
		}
		items = append(items, i)
	}
	return items, rows.Err()
}

const adminDailyNewOrdersSince = `-- name: AdminDailyNewOrdersSince :many
SELECT DATE(created_at) AS day, COUNT(*) AS count
FROM orders
WHERE created_at >= DATE_SUB(CURDATE(), INTERVAL ? DAY)
GROUP BY DATE(created_at)
ORDER BY day ASC
`

func (q *Queries) AdminDailyNewOrdersSince(ctx context.Context, intervalDays int32) ([]AdminDailyNewOrdersRow, error) {
	rows, err := q.db.QueryContext(ctx, adminDailyNewOrdersSince, intervalDays)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	var items []AdminDailyNewOrdersRow
	for rows.Next() {
		var i AdminDailyNewOrdersRow
		if err := rows.Scan(&i.Day, &i.Count); err != nil {
			return nil, err
		}
		items = append(items, i)
	}
	return items, rows.Err()
}
