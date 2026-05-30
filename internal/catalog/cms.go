package catalog

import (
	"encoding/json"
	"net/http"
	"strings"
	"time"

	"github.com/labstack/echo/v4"

	"moban_shop/internal/apiresp"
	"moban_shop/internal/db"
)

type businessSectionJSON struct {
	Slug        string `json:"slug"`
	Label       string `json:"label"`
	Icon        string `json:"icon"`
	Tagline     string `json:"tagline"`
	Description string `json:"description"`
	SortOrder   int32  `json:"sort_order"`
}

func sectionToJSON(s db.BusinessSection) businessSectionJSON {
	return businessSectionJSON{
		Slug:        s.Slug,
		Label:       s.Label,
		Icon:        s.Icon,
		Tagline:     s.Tagline,
		Description: s.Description,
		SortOrder:   s.SortOrder,
	}
}

// ListBusinessSections returns enabled business section metadata for storefront navigation.
func (h *Handler) ListBusinessSections(c echo.Context) error {
	ctx := c.Request().Context()
	rows, err := h.Q.ListBusinessSections(ctx)
	if err != nil {
		return echo.NewHTTPError(http.StatusInternalServerError, "获取业务板块失败")
	}
	out := make([]businessSectionJSON, 0, len(rows))
	for _, row := range rows {
		out = append(out, sectionToJSON(row))
	}
	return apiresp.OK(c, out)
}

// GetHomepage returns homepage CMS blocks as JSON.
func (h *Handler) GetHomepage(c echo.Context) error {
	ctx := c.Request().Context()
	row, err := h.Q.GetSiteContent(ctx, "homepage")
	if err != nil {
		return echo.NewHTTPError(http.StatusNotFound, "首页配置不存在")
	}
	var payload json.RawMessage
	if err := json.Unmarshal(row.ContentJson, &payload); err != nil {
		return echo.NewHTTPError(http.StatusInternalServerError, "解析首页配置失败")
	}
	return apiresp.OK(c, payload)
}

type docJSON struct {
	Slug      string `json:"slug"`
	Title     string `json:"title"`
	Markdown  string `json:"markdown"`
	UpdatedAt string `json:"updated_at"`
}

// GetDoc returns one markdown document by slug.
func (h *Handler) GetDoc(c echo.Context) error {
	slug := strings.TrimSpace(c.Param("slug"))
	if slug == "" {
		return echo.NewHTTPError(http.StatusBadRequest, "缺少文档 slug")
	}
	ctx := c.Request().Context()
	row, err := h.Q.GetDocBySlug(ctx, slug)
	if err != nil {
		return echo.NewHTTPError(http.StatusNotFound, "文档不存在")
	}
	return apiresp.OK(c, docJSON{
		Slug:      row.Slug,
		Title:     row.Title,
		Markdown:  row.Markdown,
		UpdatedAt: row.UpdatedAt.UTC().Format(time.RFC3339Nano),
	})
}
