package cms

import (
	"context"
	"database/sql"
	"errors"
	"log/slog"
	"os"
	"path/filepath"
	"strings"

	"moban_shop/internal/db"
)

const defaultDocSlug = "template-dev"
const defaultDocTitle = "模板开发文档"

// BootstrapDocs seeds the default template-dev document when the docs table is empty.
func BootstrapDocs(ctx context.Context, q *db.Queries, logger *slog.Logger) {
	_, err := q.GetDocBySlug(ctx, defaultDocSlug)
	if err == nil {
		return
	}
	if !errors.Is(err, sql.ErrNoRows) {
		logger.Warn("cms bootstrap docs lookup", "error", err)
		return
	}
	content, readErr := readTemplateDevMarkdown()
	if readErr != nil || strings.TrimSpace(content) == "" {
		logger.Warn("cms bootstrap docs skipped", "reason", "template-dev.md not found")
		return
	}
	if err := q.UpsertDoc(ctx, defaultDocSlug, defaultDocTitle, content); err != nil {
		logger.Warn("cms bootstrap docs insert", "error", err)
		return
	}
	logger.Info("cms bootstrap docs seeded", "slug", defaultDocSlug)
}

func readTemplateDevMarkdown() (string, error) {
	candidates := []string{"template-dev.md"}
	if wd, err := os.Getwd(); err == nil {
		for d := wd; d != "" && d != filepath.Dir(d); d = filepath.Dir(d) {
			candidates = append(candidates, filepath.Join(d, "template-dev.md"))
		}
	}
	if exe, err := os.Executable(); err == nil {
		for d := filepath.Dir(exe); d != "" && d != filepath.Dir(d); d = filepath.Dir(d) {
			candidates = append(candidates, filepath.Join(d, "template-dev.md"))
		}
	}
	seen := map[string]struct{}{}
	for _, p := range candidates {
		if _, ok := seen[p]; ok {
			continue
		}
		seen[p] = struct{}{}
		b, err := os.ReadFile(p)
		if err == nil {
			return string(b), nil
		}
	}
	return "", os.ErrNotExist
}
