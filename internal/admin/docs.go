package admin

import (
	"database/sql"
	"errors"
	"net/http"
	"strings"
	"time"

	"github.com/labstack/echo/v4"

	"moban_shop/internal/apiresp"
	"moban_shop/internal/db"
)

type DocsHandler struct {
	Q *db.Queries
}

func NewDocsHandler(q *db.Queries) *DocsHandler {
	return &DocsHandler{Q: q}
}

type docSummaryJSON struct {
	Slug      string `json:"slug"`
	Title     string `json:"title"`
	UpdatedAt string `json:"updated_at"`
}

type docBody struct {
	Title    string `json:"title"`
	Markdown string `json:"markdown"`
}

type docDetailJSON struct {
	Slug      string `json:"slug"`
	Title     string `json:"title"`
	Markdown  string `json:"markdown"`
	UpdatedAt string `json:"updated_at"`
}

func (h *DocsHandler) List(c echo.Context) error {
	ctx := c.Request().Context()
	rows, err := h.Q.AdminListDocs(ctx)
	if err != nil {
		return echo.NewHTTPError(http.StatusInternalServerError, "获取文档列表失败")
	}
	out := make([]docSummaryJSON, 0, len(rows))
	for _, row := range rows {
		out = append(out, docSummaryJSON{
			Slug:      row.Slug,
			Title:     row.Title,
			UpdatedAt: row.UpdatedAt.UTC().Format(time.RFC3339Nano),
		})
	}
	return apiresp.OK(c, out)
}

func (h *DocsHandler) Get(c echo.Context) error {
	slug, err := parseDocSlugParam(c)
	if err != nil {
		return err
	}
	ctx := c.Request().Context()
	row, err := h.Q.AdminGetDoc(ctx, slug)
	if err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return echo.NewHTTPError(http.StatusNotFound, "文档不存在")
		}
		return echo.NewHTTPError(http.StatusInternalServerError, "获取文档失败")
	}
	return apiresp.OK(c, docDetailJSON{
		Slug:      row.Slug,
		Title:     row.Title,
		Markdown:  row.Markdown,
		UpdatedAt: row.UpdatedAt.UTC().Format(time.RFC3339Nano),
	})
}

func (h *DocsHandler) Update(c echo.Context) error {
	slug, err := parseDocSlugParam(c)
	if err != nil {
		return err
	}
	var body docBody
	if err := c.Bind(&body); err != nil {
		return echo.NewHTTPError(http.StatusBadRequest, "请求 JSON 格式无效")
	}
	title := strings.TrimSpace(body.Title)
	if title == "" {
		return echo.NewHTTPError(http.StatusBadRequest, "请填写标题")
	}
	markdown := body.Markdown
	if strings.TrimSpace(markdown) == "" {
		return echo.NewHTTPError(http.StatusBadRequest, "请填写 Markdown 内容")
	}
	ctx := c.Request().Context()
	if err := h.Q.UpsertDoc(ctx, slug, title, markdown); err != nil {
		return echo.NewHTTPError(http.StatusInternalServerError, "保存文档失败")
	}
	auditFromContext(c, h.Q, AuditActionDocUpdate, AuditResourceDoc, slug, title)
	return h.Get(c)
}

func parseDocSlugParam(c echo.Context) (string, error) {
	slug := strings.TrimSpace(c.Param("slug"))
	if slug == "" {
		return "", echo.NewHTTPError(http.StatusBadRequest, "缺少 slug")
	}
	if len(slug) > 64 {
		return "", echo.NewHTTPError(http.StatusBadRequest, "slug 过长")
	}
	return slug, nil
}
