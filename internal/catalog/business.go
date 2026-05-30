package catalog

import (
	"net/http"
	"strings"
	"time"

	"github.com/labstack/echo/v4"

	"moban_shop/internal/apiresp"
	"moban_shop/internal/businesssection"
	"moban_shop/internal/db"
)

type businessJSON struct {
	ID          uint64 `json:"id"`
	SectionSlug string `json:"section_slug"`
	Title       string `json:"title"`
	Description string `json:"description"`
	SortOrder   int32  `json:"sort_order"`
	CreatedAt   string `json:"created_at"`
}

func businessToJSON(b db.Business) businessJSON {
	return businessJSON{
		ID:          b.ID,
		SectionSlug: b.SectionSlug,
		Title:       b.Title,
		Description: b.Description,
		SortOrder:   b.SortOrder,
		CreatedAt:   b.CreatedAt.UTC().Format(time.RFC3339Nano),
	}
}

// ListBusinessBySection returns showcase items for a business section page.
func (h *Handler) ListBusinessBySection(c echo.Context) error {
	raw := strings.TrimSpace(c.Param("slug"))
	section, err := businesssection.NormalizeSectionSlug(raw)
	if err != nil {
		return echo.NewHTTPError(http.StatusBadRequest, "业务板块无效")
	}
	ctx := c.Request().Context()
	items, err := h.Q.ListBusinessBySection(ctx, section)
	if err != nil {
		return echo.NewHTTPError(http.StatusInternalServerError, "获取业务展示列表失败")
	}
	out := make([]businessJSON, 0, len(items))
	for _, b := range items {
		out = append(out, businessToJSON(b))
	}
	return apiresp.OK(c, out)
}
