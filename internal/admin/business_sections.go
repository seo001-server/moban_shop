package admin

import (
	"database/sql"
	"errors"
	"net/http"
	"strings"

	"github.com/labstack/echo/v4"

	"moban_shop/internal/apiresp"
	"moban_shop/internal/businesssection"
	"moban_shop/internal/db"
)

type BusinessSectionsHandler struct {
	Q *db.Queries
}

func NewBusinessSectionsHandler(q *db.Queries) *BusinessSectionsHandler {
	return &BusinessSectionsHandler{Q: q}
}

type businessSectionBody struct {
	Label       string `json:"label"`
	Icon        string `json:"icon"`
	Tagline     string `json:"tagline"`
	Description string `json:"description"`
	SortOrder   *int32 `json:"sort_order"`
	Enabled     *bool  `json:"enabled"`
}

type businessSectionJSON struct {
	Slug        string `json:"slug"`
	Label       string `json:"label"`
	Icon        string `json:"icon"`
	Tagline     string `json:"tagline"`
	Description string `json:"description"`
	SortOrder   int32  `json:"sort_order"`
	Enabled     bool   `json:"enabled"`
}

func rowToBusinessSectionJSON(s db.BusinessSection) businessSectionJSON {
	return businessSectionJSON{
		Slug:        s.Slug,
		Label:       s.Label,
		Icon:        s.Icon,
		Tagline:     s.Tagline,
		Description: s.Description,
		SortOrder:   s.SortOrder,
		Enabled:     s.Enabled,
	}
}

func (h *BusinessSectionsHandler) List(c echo.Context) error {
	ctx := c.Request().Context()
	rows, err := h.Q.AdminListBusinessSections(ctx)
	if err != nil {
		return echo.NewHTTPError(http.StatusInternalServerError, "获取业务板块失败")
	}
	out := make([]businessSectionJSON, 0, len(rows))
	for _, row := range rows {
		out = append(out, rowToBusinessSectionJSON(row))
	}
	return apiresp.OK(c, out)
}

func (h *BusinessSectionsHandler) Get(c echo.Context) error {
	slug, err := parseSectionSlugParam(c)
	if err != nil {
		return err
	}
	ctx := c.Request().Context()
	row, err := h.Q.AdminGetBusinessSection(ctx, slug)
	if err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return echo.NewHTTPError(http.StatusNotFound, "板块不存在")
		}
		return echo.NewHTTPError(http.StatusInternalServerError, "获取板块失败")
	}
	return apiresp.OK(c, rowToBusinessSectionJSON(row))
}

func (h *BusinessSectionsHandler) Update(c echo.Context) error {
	slug, err := parseSectionSlugParam(c)
	if err != nil {
		return err
	}
	var body businessSectionBody
	if err := c.Bind(&body); err != nil {
		return echo.NewHTTPError(http.StatusBadRequest, "请求 JSON 格式无效")
	}
	label := strings.TrimSpace(body.Label)
	if label == "" {
		return echo.NewHTTPError(http.StatusBadRequest, "请填写名称")
	}
	icon := strings.TrimSpace(body.Icon)
	if icon == "" {
		icon = "fa-circle"
	}
	sortOrder := int32(0)
	if body.SortOrder != nil {
		sortOrder = *body.SortOrder
	}
	enabled := true
	if body.Enabled != nil {
		enabled = *body.Enabled
	}

	ctx := c.Request().Context()
	if err := h.Q.AdminUpdateBusinessSection(ctx, db.AdminUpdateBusinessSectionParams{
		Label:       label,
		Icon:        icon,
		Tagline:     strings.TrimSpace(body.Tagline),
		Description: strings.TrimSpace(body.Description),
		SortOrder:   sortOrder,
		Enabled:     enabled,
		Slug:        slug,
	}); err != nil {
		return echo.NewHTTPError(http.StatusInternalServerError, "更新板块失败")
	}
	row, err := h.Q.AdminGetBusinessSection(ctx, slug)
	if err != nil {
		return echo.NewHTTPError(http.StatusInternalServerError, "获取板块失败")
	}
	auditFromContext(c, h.Q, AuditActionBusinessSectionUpdate, AuditResourceBusinessSection, slug, row.Label)
	return apiresp.OK(c, rowToBusinessSectionJSON(row))
}

func parseSectionSlugParam(c echo.Context) (string, error) {
	raw := strings.TrimSpace(c.Param("slug"))
	if raw == "" {
		return "", echo.NewHTTPError(http.StatusBadRequest, "缺少 slug")
	}
	return businesssection.NormalizeSectionSlug(raw)
}
