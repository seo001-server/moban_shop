package admin

import (
	"database/sql"
	"errors"
	"net/http"
	"strconv"
	"strings"
	"time"

	"github.com/labstack/echo/v4"

	"moban_shop/internal/apiresp"
	"moban_shop/internal/businesssection"
	"moban_shop/internal/db"
)

type BusinessHandler struct {
	Q *db.Queries
}

func NewBusinessHandler(q *db.Queries) *BusinessHandler {
	return &BusinessHandler{Q: q}
}

type businessBody struct {
	SectionSlug string `json:"section_slug"`
	Title       string `json:"title"`
	Description string `json:"description"`
	SortOrder   *int32 `json:"sort_order"`
}

type businessJSON struct {
	ID          uint64 `json:"id"`
	SectionSlug string `json:"section_slug"`
	Title       string `json:"title"`
	Description string `json:"description"`
	SortOrder   int32  `json:"sort_order"`
	CreatedAt   string `json:"created_at"`
	UpdatedAt   string `json:"updated_at"`
}

func businessRowToJSON(b db.Business) businessJSON {
	return businessJSON{
		ID:          b.ID,
		SectionSlug: b.SectionSlug,
		Title:       b.Title,
		Description: b.Description,
		SortOrder:   b.SortOrder,
		CreatedAt:   b.CreatedAt.UTC().Format(time.RFC3339Nano),
		UpdatedAt:   b.UpdatedAt.UTC().Format(time.RFC3339Nano),
	}
}

func validateBusinessBody(b *businessBody) error {
	section, err := businesssection.NormalizeSectionSlug(b.SectionSlug)
	if err != nil {
		return err
	}
	b.SectionSlug = section

	b.Title = strings.TrimSpace(b.Title)
	if b.Title == "" {
		return errors.New("请填写标题")
	}

	b.Description = strings.TrimSpace(b.Description)
	if b.Description == "" {
		return errors.New("请填写描述")
	}

	return nil
}

func sortOrderFromPtr(p *int32) int32 {
	if p == nil {
		return 0
	}
	return *p
}

func (h *BusinessHandler) ListBusiness(c echo.Context) error {
	ctx := c.Request().Context()
	p := ParsePagination(c)
	raw := strings.TrimSpace(c.QueryParam("section"))
	var (
		items []db.Business
		total int64
		err   error
	)
	if raw == "" {
		total, err = h.Q.AdminCountBusiness(ctx)
		if err != nil {
			return echo.NewHTTPError(http.StatusInternalServerError, "统计业务展示数量失败")
		}
		items, err = h.Q.AdminListBusinessPaged(ctx, int32(p.PageSize), int32(p.Offset))
	} else {
		section, verr := businesssection.NormalizeSectionSlug(raw)
		if verr != nil {
			return echo.NewHTTPError(http.StatusBadRequest, verr.Error())
		}
		total, err = h.Q.AdminCountBusinessBySection(ctx, section)
		if err != nil {
			return echo.NewHTTPError(http.StatusInternalServerError, "统计业务展示数量失败")
		}
		items, err = h.Q.AdminListBusinessBySectionPaged(ctx, section, int32(p.PageSize), int32(p.Offset))
	}
	if err != nil {
		return echo.NewHTTPError(http.StatusInternalServerError, "获取业务展示列表失败")
	}
	out := make([]businessJSON, 0, len(items))
	for _, b := range items {
		out = append(out, businessRowToJSON(b))
	}
	return writePaginatedJSON(c, out, p, total)
}

func (h *BusinessHandler) GetBusiness(c echo.Context) error {
	id, err := parseBusinessIDParam(c)
	if err != nil {
		return err
	}
	ctx := c.Request().Context()
	b, err := h.Q.AdminGetBusinessByID(ctx, id)
	if err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return echo.NewHTTPError(http.StatusNotFound, "业务展示不存在")
		}
		return echo.NewHTTPError(http.StatusInternalServerError, "获取业务展示失败")
	}
	return apiresp.OK(c, businessRowToJSON(b))
}

func (h *BusinessHandler) CreateBusiness(c echo.Context) error {
	var body businessBody
	if err := c.Bind(&body); err != nil {
		return echo.NewHTTPError(http.StatusBadRequest, "请求 JSON 格式无效")
	}
	if err := validateBusinessBody(&body); err != nil {
		return echo.NewHTTPError(http.StatusBadRequest, err.Error())
	}

	ctx := c.Request().Context()
	arg := db.AdminCreateBusinessParams{
		SectionSlug: body.SectionSlug,
		Title:       body.Title,
		Description: body.Description,
		SortOrder:   sortOrderFromPtr(body.SortOrder),
	}
	res, err := h.Q.AdminCreateBusiness(ctx, arg)
	if err != nil {
		return echo.NewHTTPError(http.StatusInternalServerError, "创建业务展示失败")
	}
	insertID, ierr := res.LastInsertId()
	if ierr != nil || insertID <= 0 {
		return echo.NewHTTPError(http.StatusInternalServerError, "创建后查询业务展示失败")
	}
	b, err := h.Q.AdminGetBusinessByID(ctx, uint64(insertID))
	if err != nil {
		return echo.NewHTTPError(http.StatusInternalServerError, "查询业务展示失败")
	}
	auditFromContext(c, h.Q, AuditActionBusinessCreate, AuditResourceBusiness, auditResourceIDUint(b.ID), b.Title)
	return apiresp.OK(c, businessRowToJSON(b))
}

func (h *BusinessHandler) UpdateBusiness(c echo.Context) error {
	id, herr := parseBusinessIDParam(c)
	if herr != nil {
		return herr
	}
	var body businessBody
	if err := c.Bind(&body); err != nil {
		return echo.NewHTTPError(http.StatusBadRequest, "请求 JSON 格式无效")
	}
	if err := validateBusinessBody(&body); err != nil {
		return echo.NewHTTPError(http.StatusBadRequest, err.Error())
	}

	ctx := c.Request().Context()
	arg := db.AdminUpdateBusinessParams{
		SectionSlug: body.SectionSlug,
		Title:       body.Title,
		Description: body.Description,
		SortOrder:   sortOrderFromPtr(body.SortOrder),
		ID:          id,
	}
	if err := h.Q.AdminUpdateBusiness(ctx, arg); err != nil {
		return echo.NewHTTPError(http.StatusInternalServerError, "更新业务展示失败")
	}
	b, err := h.Q.AdminGetBusinessByID(ctx, id)
	if err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return echo.NewHTTPError(http.StatusNotFound, "业务展示不存在")
		}
		return echo.NewHTTPError(http.StatusInternalServerError, "查询业务展示失败")
	}
	auditFromContext(c, h.Q, AuditActionBusinessUpdate, AuditResourceBusiness, auditResourceIDUint(id), b.Title)
	return apiresp.OK(c, businessRowToJSON(b))
}

func (h *BusinessHandler) DeleteBusiness(c echo.Context) error {
	id, herr := parseBusinessIDParam(c)
	if herr != nil {
		return herr
	}
	ctx := c.Request().Context()
	item, err := h.Q.AdminGetBusinessByID(ctx, id)
	if err != nil && !errors.Is(err, sql.ErrNoRows) {
		return echo.NewHTTPError(http.StatusInternalServerError, "获取业务展示失败")
	}
	detail := ""
	if err == nil {
		detail = item.Title
	}
	if err := h.Q.AdminDeleteBusiness(ctx, id); err != nil {
		return echo.NewHTTPError(http.StatusInternalServerError, "删除业务展示失败")
	}
	auditFromContext(c, h.Q, AuditActionBusinessDelete, AuditResourceBusiness, auditResourceIDUint(id), detail)
	return apiresp.OK(c, nil)
}

func parseBusinessIDParam(c echo.Context) (uint64, error) {
	raw := strings.TrimSpace(c.Param("id"))
	if raw == "" {
		return 0, echo.NewHTTPError(http.StatusBadRequest, "缺少 ID")
	}
	id, err := strconv.ParseUint(raw, 10, 64)
	if err != nil || id == 0 {
		return 0, echo.NewHTTPError(http.StatusBadRequest, "ID 无效")
	}
	return id, nil
}
