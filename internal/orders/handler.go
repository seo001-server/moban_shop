package orders

import (
	"context"
	"database/sql"
	"errors"
	"math"
	"net/http"
	"strconv"
	"strings"
	"time"

	"github.com/labstack/echo/v4"

	"moban_shop/internal/apiresp"
	"moban_shop/internal/auth"
	"moban_shop/internal/db"
	"moban_shop/internal/orderno"
)

type Handler struct {
	Q  *db.Queries
	DB *sql.DB
}

func NewHandler(q *db.Queries, dbConn *sql.DB) *Handler {
	return &Handler{Q: q, DB: dbConn}
}

type createItemBody struct {
	ProductID uint64 `json:"product_id"`
	Quantity  uint32 `json:"quantity"`
}

type createOrderBody struct {
	Items   []createItemBody `json:"items"`
	MockPay bool             `json:"mock_pay"`
}

type orderItemJSON struct {
	ProductID      uint64  `json:"product_id"`
	ProductSlug    string  `json:"product_slug"`
	ProductTitle   string  `json:"product_title"`
	PreviewURL     *string `json:"preview_url,omitempty"`
	ImageURL       *string `json:"image_url,omitempty"`
	ProductVisible bool    `json:"product_visible"`
	HasDownload    bool    `json:"has_download"`
	Quantity       uint32  `json:"quantity"`
	UnitPriceMinor int64   `json:"unit_price_minor"`
	LineTotalMinor int64   `json:"line_total_minor"`
}

type orderJSON struct {
	ID               uint64          `json:"id"`
	OrderNo          string          `json:"order_no"`
	Status           string          `json:"status"`
	TotalAmountMinor int64           `json:"total_amount_minor"`
	Currency         string          `json:"currency"`
	ItemCount        int64           `json:"item_count"`
	ItemsSummary     string          `json:"items_summary"`
	Items            []orderItemJSON `json:"items,omitempty"`
	CreatedAt        string          `json:"created_at"`
}

type paginatedOrders struct {
	Items      []orderJSON `json:"items"`
	Page       int         `json:"page"`
	PageSize   int         `json:"page_size"`
	Total      int64       `json:"total"`
	TotalPages int         `json:"total_pages"`
}

type lineInput struct {
	ProductID uint64
	Quantity  uint32
	Product   db.Product
}

func (h *Handler) CreateOrder(c echo.Context) error {
	uid, ok := auth.UserID(c)
	if !ok {
		return echo.NewHTTPError(http.StatusUnauthorized, "未登录")
	}

	var body createOrderBody
	if err := c.Bind(&body); err != nil {
		return echo.NewHTTPError(http.StatusBadRequest, "请求 JSON 格式无效")
	}
	if len(body.Items) == 0 {
		return echo.NewHTTPError(http.StatusBadRequest, "请提供订单商品")
	}

	ctx := c.Request().Context()
	lines, err := h.validateItems(ctx, body.Items)
	if err != nil {
		return err
	}

	status := "pending"
	if body.MockPay {
		status = "paid"
	}

	var total int64
	currency := lines[0].Product.Currency
	for _, ln := range lines {
		total += ln.Product.PriceMinor * int64(ln.Quantity)
	}

	tx, err := h.DB.BeginTx(ctx, nil)
	if err != nil {
		return echo.NewHTTPError(http.StatusInternalServerError, "开启事务失败")
	}
	defer func() { _ = tx.Rollback() }()

	qtx := h.Q.WithTx(tx)
	now := time.Now().UTC()
	const maxOrderNoRetries = 8
	var (
		res     sql.Result
		orderNo string
	)
	for attempt := 0; attempt < maxOrderNoRetries; attempt++ {
		orderNo = orderno.Generate(now)
		res, err = qtx.CreateOrder(ctx, db.CreateOrderParams{
			OrderNo:          orderNo,
			UserID:           uid,
			Status:           status,
			TotalAmountMinor: total,
			Currency:         currency,
		})
		if err == nil {
			break
		}
		if isDuplicateKey(err) {
			continue
		}
		return echo.NewHTTPError(http.StatusInternalServerError, "创建订单失败")
	}
	if err != nil {
		return echo.NewHTTPError(http.StatusInternalServerError, "生成订单号失败，请重试")
	}
	orderID, err := res.LastInsertId()
	if err != nil || orderID <= 0 {
		return echo.NewHTTPError(http.StatusInternalServerError, "获取订单 ID 失败")
	}

	outItems := make([]orderItemJSON, 0, len(lines))
	parts := make([]string, 0, len(lines))
	for _, ln := range lines {
		_, err := qtx.CreateOrderItem(ctx, db.CreateOrderItemParams{
			OrderID:        uint64(orderID),
			ProductID:      ln.ProductID,
			Quantity:       ln.Quantity,
			UnitPriceMinor: ln.Product.PriceMinor,
		})
		if err != nil {
			return echo.NewHTTPError(http.StatusInternalServerError, "创建订单明细失败")
		}
		lineTotal := ln.Product.PriceMinor * int64(ln.Quantity)
		outItems = append(outItems, orderItemJSON{
			ProductID:      ln.ProductID,
			ProductSlug:    ln.Product.Slug,
			ProductTitle:   ln.Product.Title,
			PreviewURL:     nullStringPtr(ln.Product.PreviewUrl),
			ImageURL:       nullStringPtr(ln.Product.ImageUrl),
			ProductVisible: ln.Product.Visible,
			HasDownload:    itemHasDownload(status == "paid", ln.Product.Visible, ln.Product.DownloadUrl),
			Quantity:       ln.Quantity,
			UnitPriceMinor: ln.Product.PriceMinor,
			LineTotalMinor: lineTotal,
		})
		label := ln.Product.Title
		if ln.Quantity > 1 {
			label += " ×" + strconv.FormatUint(uint64(ln.Quantity), 10)
		}
		parts = append(parts, label)
	}

	for _, ln := range lines {
		if _, err := qtx.DeleteCartItem(ctx, db.DeleteCartItemParams{
			UserID:    uid,
			ProductID: ln.ProductID,
		}); err != nil {
			return echo.NewHTTPError(http.StatusInternalServerError, "清理购物车失败")
		}
	}

	if err := tx.Commit(); err != nil {
		return echo.NewHTTPError(http.StatusInternalServerError, "提交事务失败")
	}

	return apiresp.OK(c, orderJSON{
		ID:               uint64(orderID),
		OrderNo:          orderNo,
		Status:           status,
		TotalAmountMinor: total,
		Currency:         currency,
		ItemCount:        int64(len(outItems)),
		ItemsSummary:     joinChinese(parts),
		Items:            outItems,
		CreatedAt:        time.Now().UTC().Format(time.RFC3339Nano),
	})
}

func (h *Handler) ListMyOrders(c echo.Context) error {
	uid, ok := auth.UserID(c)
	if !ok {
		return echo.NewHTTPError(http.StatusUnauthorized, "未登录")
	}

	p := parsePagination(c)
	ctx := c.Request().Context()
	total, err := h.Q.CountOrdersByUser(ctx, uid)
	if err != nil {
		return echo.NewHTTPError(http.StatusInternalServerError, "统计订单数量失败")
	}
	rows, err := h.Q.ListOrdersByUserPaged(ctx, uid, int32(p.PageSize), int32(p.Offset))
	if err != nil {
		return echo.NewHTTPError(http.StatusInternalServerError, "获取订单列表失败")
	}

	out := make([]orderJSON, 0, len(rows))
	for _, row := range rows {
		out = append(out, userRowToJSON(row))
	}
	return apiresp.OK(c, newPaginated(out, p, total))
}

func (h *Handler) GetMyOrder(c echo.Context) error {
	uid, ok := auth.UserID(c)
	if !ok {
		return echo.NewHTTPError(http.StatusUnauthorized, "未登录")
	}
	orderID, err := parseIDParam(c)
	if err != nil {
		return err
	}

	ctx := c.Request().Context()
	header, err := h.Q.GetOrderHeaderForUser(ctx, orderID, uid)
	if err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return echo.NewHTTPError(http.StatusNotFound, "订单不存在")
		}
		return echo.NewHTTPError(http.StatusInternalServerError, "获取订单失败")
	}
	items, err := h.Q.ListOrderItemsByOrderID(ctx, orderID)
	if err != nil {
		return echo.NewHTTPError(http.StatusInternalServerError, "获取订单明细失败")
	}
	return apiresp.OK(c, headerToJSON(header, items))
}

func (h *Handler) PayOrder(c echo.Context) error {
	uid, ok := auth.UserID(c)
	if !ok {
		return echo.NewHTTPError(http.StatusUnauthorized, "未登录")
	}
	orderID, err := parseIDParam(c)
	if err != nil {
		return err
	}

	ctx := c.Request().Context()
	n, err := h.Q.PayOrderIfPending(ctx, orderID, uid)
	if err != nil {
		return echo.NewHTTPError(http.StatusInternalServerError, "支付订单失败")
	}
	if n == 0 {
		return echo.NewHTTPError(http.StatusBadRequest, "订单当前不可支付")
	}

	header, err := h.Q.GetOrderHeaderForUser(ctx, orderID, uid)
	if err != nil {
		return echo.NewHTTPError(http.StatusInternalServerError, "获取订单失败")
	}
	items, err := h.Q.ListOrderItemsByOrderID(ctx, orderID)
	if err != nil {
		return echo.NewHTTPError(http.StatusInternalServerError, "获取订单明细失败")
	}
	return apiresp.OK(c, headerToJSON(header, items))
}

func (h *Handler) validateItems(ctx context.Context, items []createItemBody) ([]lineInput, error) {
	if len(items) == 0 {
		return nil, echo.NewHTTPError(http.StatusBadRequest, "请提供订单商品")
	}
	out := make([]lineInput, 0, len(items))
	var currency string
	for _, it := range items {
		if it.ProductID == 0 || it.Quantity == 0 {
			return nil, echo.NewHTTPError(http.StatusBadRequest, "商品项无效")
		}
		p, err := h.Q.GetProductByIDInternal(ctx, it.ProductID)
		if err != nil {
			if errors.Is(err, sql.ErrNoRows) {
				return nil, echo.NewHTTPError(http.StatusBadRequest, "商品不存在")
			}
			return nil, echo.NewHTTPError(http.StatusInternalServerError, "查询商品失败")
		}
		if !p.Visible {
			return nil, echo.NewHTTPError(http.StatusBadRequest, "商品已下架")
		}
		if currency == "" {
			currency = p.Currency
		} else if p.Currency != currency {
			return nil, echo.NewHTTPError(http.StatusBadRequest, "订单中不能混用不同货币")
		}
		out = append(out, lineInput{
			ProductID: it.ProductID,
			Quantity:  it.Quantity,
			Product:   p,
		})
	}
	return out, nil
}

func userRowToJSON(row db.ListOrdersByUserPagedRow) orderJSON {
	out := orderJSON{
		ID:               row.ID,
		OrderNo:          row.OrderNo,
		Status:           row.Status,
		TotalAmountMinor: row.TotalAmountMinor,
		Currency:         row.Currency,
		ItemCount:        row.ItemCount,
		CreatedAt:        row.CreatedAt.UTC().Format(time.RFC3339Nano),
	}
	if row.ItemsSummary.Valid {
		out.ItemsSummary = row.ItemsSummary.String
	}
	return out
}

func headerToJSON(h db.GetOrderHeaderForUserRow, items []db.ListOrderItemsByOrderIDRow) orderJSON {
	out := orderJSON{
		ID:               h.ID,
		OrderNo:          h.OrderNo,
		Status:           h.Status,
		TotalAmountMinor: h.TotalAmountMinor,
		Currency:         h.Currency,
		ItemCount:        int64(len(items)),
		Items:            make([]orderItemJSON, 0, len(items)),
		CreatedAt:        h.CreatedAt.UTC().Format(time.RFC3339Nano),
	}
	parts := make([]string, 0, len(items))
	paid := h.Status == "paid"
	for _, it := range items {
		lineTotal := it.UnitPriceMinor * int64(it.Quantity)
		out.Items = append(out.Items, orderItemJSON{
			ProductID:      it.ProductID,
			ProductSlug:    it.ProductSlug,
			ProductTitle:   it.ProductTitle,
			PreviewURL:     nullStringPtr(it.ProductPreviewUrl),
			ImageURL:       nullStringPtr(it.ProductImageUrl),
			ProductVisible: it.ProductVisible,
			HasDownload:    itemHasDownload(paid, it.ProductVisible, it.ProductDownloadUrl),
			Quantity:       it.Quantity,
			UnitPriceMinor: it.UnitPriceMinor,
			LineTotalMinor: lineTotal,
		})
		label := it.ProductTitle
		if it.Quantity > 1 {
			label += " ×" + strconv.FormatUint(uint64(it.Quantity), 10)
		}
		parts = append(parts, label)
	}
	out.ItemsSummary = joinChinese(parts)
	return out
}

func joinChinese(parts []string) string {
	if len(parts) == 0 {
		return ""
	}
	out := parts[0]
	for i := 1; i < len(parts); i++ {
		out += "、" + parts[i]
	}
	return out
}

func parseIDParam(c echo.Context) (uint64, error) {
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

type paginationParams struct {
	Page     int
	PageSize int
	Offset   int
}

func parsePagination(c echo.Context) paginationParams {
	page := parsePositiveInt(c.QueryParam("page"), 1)
	pageSize := parsePositiveInt(c.QueryParam("page_size"), 10)
	if pageSize > 100 {
		pageSize = 100
	}
	return paginationParams{
		Page:     page,
		PageSize: pageSize,
		Offset:   (page - 1) * pageSize,
	}
}

func parsePositiveInt(raw string, fallback int) int {
	raw = strings.TrimSpace(raw)
	if raw == "" {
		return fallback
	}
	n, err := strconv.Atoi(raw)
	if err != nil || n <= 0 {
		return fallback
	}
	return n
}

func newPaginated(items []orderJSON, p paginationParams, total int64) paginatedOrders {
	if items == nil {
		items = []orderJSON{}
	}
	totalPages := 1
	if total > 0 {
		totalPages = int(math.Ceil(float64(total) / float64(p.PageSize)))
	}
	return paginatedOrders{
		Items:      items,
		Page:       p.Page,
		PageSize:   p.PageSize,
		Total:      total,
		TotalPages: totalPages,
	}
}
