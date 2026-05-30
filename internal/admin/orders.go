package admin

import (
	"bytes"
	"database/sql"
	"encoding/csv"
	"errors"
	"fmt"
	"net/http"
	"strconv"
	"strings"
	"time"

	"github.com/labstack/echo/v4"

	"moban_shop/internal/apiresp"
	"moban_shop/internal/db"
)

type OrdersHandler struct {
	Q *db.Queries
}

func NewOrdersHandler(q *db.Queries) *OrdersHandler {
	return &OrdersHandler{Q: q}
}

// ListOrders returns paginated orders with line-item summary.
func (h *OrdersHandler) ListOrders(c echo.Context) error {
	ctx := c.Request().Context()
	p := ParsePagination(c)
	filters, err := parseOrdersFilters(c)
	if err != nil {
		return err
	}
	total, err := h.Q.AdminCountOrdersFiltered(ctx, filters)
	if err != nil {
		return echo.NewHTTPError(http.StatusInternalServerError, "统计订单数量失败")
	}
	rows, err := h.Q.AdminListOrdersFilteredPaged(ctx, filters, int32(p.PageSize), int32(p.Offset))
	if err != nil {
		return echo.NewHTTPError(http.StatusInternalServerError, "获取订单列表失败")
	}
	out := make([]orderSummaryJSON, 0, len(rows))
	for _, row := range rows {
		out = append(out, orderRowToSummary(row))
	}
	return writePaginatedJSON(c, out, p, total)
}

// ExportOrders streams a CSV of filtered orders (max 5000 rows).
func (h *OrdersHandler) ExportOrders(c echo.Context) error {
	ctx := c.Request().Context()
	filters, err := parseOrdersFilters(c)
	if err != nil {
		return err
	}
	rows, err := h.Q.AdminListOrdersForExport(ctx, filters)
	if err != nil {
		return echo.NewHTTPError(http.StatusInternalServerError, "导出订单失败")
	}

	var buf bytes.Buffer
	buf.WriteString("\xEF\xBB\xBF") // UTF-8 BOM for Excel
	w := csv.NewWriter(&buf)
	if err := w.Write([]string{"订单ID", "用户邮箱", "状态", "金额(最小单位)", "货币", "商品摘要", "下单时间", "更新时间"}); err != nil {
		return echo.NewHTTPError(http.StatusInternalServerError, "生成 CSV 失败")
	}
	for _, row := range rows {
		summary := ""
		if row.ItemsSummary.Valid {
			summary = row.ItemsSummary.String
		}
		if err := w.Write([]string{
			strconv.FormatUint(row.ID, 10),
			row.UserEmail,
			row.Status,
			strconv.FormatInt(row.TotalAmountMinor, 10),
			row.Currency,
			summary,
			row.CreatedAt.UTC().Format(time.RFC3339),
			row.UpdatedAt.UTC().Format(time.RFC3339),
		}); err != nil {
			return echo.NewHTTPError(http.StatusInternalServerError, "生成 CSV 失败")
		}
	}
	w.Flush()
	if err := w.Error(); err != nil {
		return echo.NewHTTPError(http.StatusInternalServerError, "生成 CSV 失败")
	}

	filename := fmt.Sprintf("orders-%s.csv", time.Now().UTC().Format("20060102-150405"))
	c.Response().Header().Set(echo.HeaderContentType, "text/csv; charset=utf-8")
	c.Response().Header().Set(echo.HeaderContentDisposition, fmt.Sprintf(`attachment; filename="%s"`, filename))
	return c.Blob(http.StatusOK, "text/csv; charset=utf-8", buf.Bytes())
}

// GetOrder returns one order with all line items.
func (h *OrdersHandler) GetOrder(c echo.Context) error {
	id, err := parseOrderIDParam(c)
	if err != nil {
		return err
	}
	ctx := c.Request().Context()
	header, err := h.Q.AdminGetOrderByID(ctx, id)
	if err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return echo.NewHTTPError(http.StatusNotFound, "订单不存在")
		}
		return echo.NewHTTPError(http.StatusInternalServerError, "获取订单失败")
	}
	items, err := h.Q.AdminListOrderItems(ctx, id)
	if err != nil {
		return echo.NewHTTPError(http.StatusInternalServerError, "获取订单明细失败")
	}
	return apiresp.OK(c, orderHeaderToSummary(header, items))
}

type updateOrderStatusBody struct {
	Status string `json:"status"`
}

var allowedStatusTransitions = map[string][]string{
	"pending":   {"paid", "cancelled"},
	"paid":      {"refunded"},
	"cancelled": {},
	"refunded":  {},
}

// UpdateOrderStatus changes order status with a minimal state machine.
func (h *OrdersHandler) UpdateOrderStatus(c echo.Context) error {
	id, err := parseOrderIDParam(c)
	if err != nil {
		return err
	}
	var body updateOrderStatusBody
	if err := c.Bind(&body); err != nil {
		return echo.NewHTTPError(http.StatusBadRequest, "请求 JSON 格式无效")
	}
	newStatus := strings.TrimSpace(body.Status)
	if newStatus == "" {
		return echo.NewHTTPError(http.StatusBadRequest, "请提供订单状态")
	}

	ctx := c.Request().Context()
	header, err := h.Q.AdminGetOrderByID(ctx, id)
	if err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return echo.NewHTTPError(http.StatusNotFound, "订单不存在")
		}
		return echo.NewHTTPError(http.StatusInternalServerError, "获取订单失败")
	}

	if !canTransition(header.Status, newStatus) {
		return echo.NewHTTPError(http.StatusBadRequest, "订单状态流转无效")
	}

	n, err := h.Q.UpdateOrderStatusByID(ctx, newStatus, id, header.Status)
	if err != nil {
		return echo.NewHTTPError(http.StatusInternalServerError, "更新订单状态失败")
	}
	if n == 0 {
		return echo.NewHTTPError(http.StatusConflict, "订单状态已变更，请刷新后重试")
	}

	header.Status = newStatus
	items, err := h.Q.AdminListOrderItems(ctx, id)
	if err != nil {
		return echo.NewHTTPError(http.StatusInternalServerError, "获取订单明细失败")
	}
	return apiresp.OK(c, orderHeaderToSummary(header, items))
}

func canTransition(from, to string) bool {
	for _, allowed := range allowedStatusTransitions[from] {
		if allowed == to {
			return true
		}
	}
	return false
}

func parseOrderIDParam(c echo.Context) (uint64, error) {
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
