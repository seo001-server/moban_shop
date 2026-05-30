package admin

import (
	"database/sql"
	"errors"
	"net/http"

	"github.com/labstack/echo/v4"

	"moban_shop/internal/apiresp"
)

type setProductVisibleBody struct {
	Visible bool `json:"visible"`
}

// SetProductVisible toggles whether a product appears on the storefront.
func (h *ProductsHandler) SetProductVisible(c echo.Context) error {
	id, herr := parseIDParam(c)
	if herr != nil {
		return herr
	}
	var body setProductVisibleBody
	if err := c.Bind(&body); err != nil {
		return echo.NewHTTPError(http.StatusBadRequest, "请求 JSON 格式无效")
	}

	ctx := c.Request().Context()
	if _, err := h.Q.AdminGetProductByID(ctx, id); err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return echo.NewHTTPError(http.StatusNotFound, "商品不存在")
		}
		return echo.NewHTTPError(http.StatusInternalServerError, "获取商品失败")
	}
	if err := h.Q.AdminSetProductVisible(ctx, body.Visible, id); err != nil {
		return echo.NewHTTPError(http.StatusInternalServerError, "更新展示状态失败")
	}

	p, err := h.Q.AdminGetProductByID(ctx, id)
	if err != nil {
		return echo.NewHTTPError(http.StatusInternalServerError, "查询商品失败")
	}
	label := "隐藏"
	if body.Visible {
		label = "展示"
	}
	auditFromContext(c, h.Q, AuditActionProductUpdate, AuditResourceProduct, auditResourceIDUint(id), "前台"+label)
	return apiresp.OK(c, rowToJSON(p))
}
