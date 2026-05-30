package admin

import (
	"database/sql"
	"errors"
	"net/http"
	"strconv"
	"strings"

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

	if adminID, ok := AdminUserID(c); ok {
		WriteAuditLog(ctx, h.Q, adminID, AuditActionOrderUpdateStatus, AuditResourceOrder, auditResourceIDUint(id), ClientIP(c), auditDetailStatusChange(header.Status, newStatus))
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
