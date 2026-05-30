package admin

import (
	"database/sql"
	"encoding/json"
	"errors"
	"net/http"

	"github.com/labstack/echo/v4"

	"moban_shop/internal/apiresp"
	"moban_shop/internal/db"
)

type SiteContentHandler struct {
	Q *db.Queries
}

func NewSiteContentHandler(q *db.Queries) *SiteContentHandler {
	return &SiteContentHandler{Q: q}
}

const homepageContentKey = "homepage"

func (h *SiteContentHandler) GetHomepage(c echo.Context) error {
	ctx := c.Request().Context()
	row, err := h.Q.GetSiteContent(ctx, homepageContentKey)
	if err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return echo.NewHTTPError(http.StatusNotFound, "首页配置不存在")
		}
		return echo.NewHTTPError(http.StatusInternalServerError, "获取首页配置失败")
	}
	var payload json.RawMessage
	if err := json.Unmarshal(row.ContentJson, &payload); err != nil {
		return echo.NewHTTPError(http.StatusInternalServerError, "解析首页配置失败")
	}
	return apiresp.OK(c, payload)
}

func (h *SiteContentHandler) UpdateHomepage(c echo.Context) error {
	var body json.RawMessage
	if err := c.Bind(&body); err != nil {
		return echo.NewHTTPError(http.StatusBadRequest, "请求 JSON 格式无效")
	}
	if !json.Valid(body) {
		return echo.NewHTTPError(http.StatusBadRequest, "JSON 格式无效")
	}
	ctx := c.Request().Context()
	if err := h.Q.UpsertSiteContent(ctx, homepageContentKey, body); err != nil {
		return echo.NewHTTPError(http.StatusInternalServerError, "保存首页配置失败")
	}
	if adminID, ok := AdminUserID(c); ok {
		WriteAuditLog(ctx, h.Q, adminID, AuditActionSiteContentUpdate, AuditResourceSiteContent, homepageContentKey, ClientIP(c), "homepage")
	}
	return h.GetHomepage(c)
}
