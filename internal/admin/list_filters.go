package admin

import (
	"net/http"
	"strings"
	"time"

	"github.com/labstack/echo/v4"

	"moban_shop/internal/db"
	"moban_shop/internal/orderno"
	"moban_shop/internal/userno"
)

var validOrderStatuses = map[string]struct{}{
	"pending":   {},
	"paid":      {},
	"cancelled": {},
	"refunded":  {},
}

func parseOrdersFilters(c echo.Context) (db.AdminOrdersFilterArgs, error) {
	status := strings.TrimSpace(c.QueryParam("status"))
	if status != "" {
		if _, ok := validOrderStatuses[status]; !ok {
			return db.AdminOrdersFilterArgs{}, echo.NewHTTPError(http.StatusBadRequest, "订单状态筛选无效")
		}
	}
	query := strings.TrimSpace(c.QueryParam("q"))
	from, err := parseDateQuery(c.QueryParam("from"))
	if err != nil {
		return db.AdminOrdersFilterArgs{}, err
	}
	to, err := parseDateQuery(c.QueryParam("to"))
	if err != nil {
		return db.AdminOrdersFilterArgs{}, err
	}
	orderNo, err := parseOrderNoQuery(c.QueryParam("order_no"))
	if err != nil {
		return db.AdminOrdersFilterArgs{}, err
	}
	return db.NewAdminOrdersFilterArgs(status, query, from, to, orderNo), nil
}

func parseOrderNoQuery(raw string) (string, error) {
	raw = strings.TrimSpace(raw)
	if raw == "" {
		return "", nil
	}
	normalized := orderno.Normalize(raw)
	if !orderno.IsValid(normalized) {
		return "", echo.NewHTTPError(http.StatusBadRequest, "订单号格式无效")
	}
	return normalized, nil
}

func parseProductsFilters(c echo.Context) (db.AdminProductsFilterArgs, error) {
	category := strings.TrimSpace(strings.ToLower(c.QueryParam("category")))
	if category != "" {
		switch category {
		case "film", "book", "game", "shop":
		default:
			return db.AdminProductsFilterArgs{}, echo.NewHTTPError(http.StatusBadRequest, "分类筛选无效")
		}
	}
	recommended := strings.TrimSpace(c.QueryParam("recommended"))
	if recommended != "" && recommended != "0" && recommended != "1" {
		return db.AdminProductsFilterArgs{}, echo.NewHTTPError(http.StatusBadRequest, "推荐筛选无效")
	}
	query := strings.TrimSpace(c.QueryParam("q"))
	return db.NewAdminProductsFilterArgs(category, recommended, query), nil
}

func parseUsersQueryFilter(c echo.Context) (query string, userNoQuery string) {
	raw := strings.TrimSpace(c.QueryParam("q"))
	if raw == "" {
		return "", ""
	}
	return raw, userno.Normalize(raw)
}

func parseDateQuery(raw string) (string, error) {
	raw = strings.TrimSpace(raw)
	if raw == "" {
		return "", nil
	}
	if _, err := time.Parse("2006-01-02", raw); err != nil {
		return "", echo.NewHTTPError(http.StatusBadRequest, "日期格式须为 YYYY-MM-DD")
	}
	return raw, nil
}
