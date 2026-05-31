package cart

import (
	"context"
	"database/sql"
	"errors"
	"net/http"
	"strconv"
	"strings"

	"github.com/labstack/echo/v4"

	"moban_shop/internal/apiresp"
	"moban_shop/internal/auth"
	"moban_shop/internal/db"
)

type Handler struct {
	Q *db.Queries
}

func NewHandler(q *db.Queries) *Handler {
	return &Handler{Q: q}
}

type cartLineJSON struct {
	ID             uint64  `json:"id"`
	Slug           string  `json:"slug"`
	Title          string  `json:"title"`
	PriceMinor     int64   `json:"price_minor"`
	Currency       string  `json:"currency"`
	ImageURL       *string `json:"image_url"`
	ProductVisible bool    `json:"product_visible"`
	Qty            uint32  `json:"qty"`
}

type cartListJSON struct {
	Items []cartLineJSON `json:"items"`
}

type addItemBody struct {
	ProductID      uint64 `json:"product_id"`
	Quantity       uint32 `json:"quantity"`
	QuantityDelta  uint32 `json:"quantity_delta"`
}

type setQtyBody struct {
	Quantity uint32 `json:"quantity"`
}

type mergeItemBody struct {
	ProductID uint64 `json:"product_id"`
	Quantity  uint32 `json:"quantity"`
}

type mergeBody struct {
	Items []mergeItemBody `json:"items"`
}

func (h *Handler) List(c echo.Context) error {
	uid, ok := auth.UserID(c)
	if !ok {
		return echo.NewHTTPError(http.StatusUnauthorized, "未登录")
	}
	items, err := h.listJSON(c.Request().Context(), uid)
	if err != nil {
		return echo.NewHTTPError(http.StatusInternalServerError, "获取购物车失败")
	}
	return apiresp.OK(c, cartListJSON{Items: items})
}

func (h *Handler) AddItem(c echo.Context) error {
	uid, ok := auth.UserID(c)
	if !ok {
		return echo.NewHTTPError(http.StatusUnauthorized, "未登录")
	}
	var body addItemBody
	if err := c.Bind(&body); err != nil {
		return echo.NewHTTPError(http.StatusBadRequest, "请求 JSON 格式无效")
	}
	if body.ProductID == 0 {
		return echo.NewHTTPError(http.StatusBadRequest, "商品无效")
	}
	delta := body.QuantityDelta
	if delta == 0 {
		delta = body.Quantity
	}
	if delta == 0 {
		delta = 1
	}
	ctx := c.Request().Context()
	if err := h.addQuantity(ctx, uid, body.ProductID, delta); err != nil {
		return err
	}
	items, err := h.listJSON(ctx, uid)
	if err != nil {
		return echo.NewHTTPError(http.StatusInternalServerError, "获取购物车失败")
	}
	return apiresp.OK(c, cartListJSON{Items: items})
}

func (h *Handler) SetItemQty(c echo.Context) error {
	uid, ok := auth.UserID(c)
	if !ok {
		return echo.NewHTTPError(http.StatusUnauthorized, "未登录")
	}
	productID, err := parseProductIDParam(c)
	if err != nil {
		return err
	}
	var body setQtyBody
	if err := c.Bind(&body); err != nil {
		return echo.NewHTTPError(http.StatusBadRequest, "请求 JSON 格式无效")
	}
	ctx := c.Request().Context()
	if body.Quantity == 0 {
		if _, err := h.Q.DeleteCartItem(ctx, db.DeleteCartItemParams{
			UserID:    uid,
			ProductID: productID,
		}); err != nil {
			return echo.NewHTTPError(http.StatusInternalServerError, "删除购物车商品失败")
		}
	} else {
		if err := h.setAbsoluteQuantity(ctx, uid, productID, body.Quantity); err != nil {
			return err
		}
	}
	items, err := h.listJSON(ctx, uid)
	if err != nil {
		return echo.NewHTTPError(http.StatusInternalServerError, "获取购物车失败")
	}
	return apiresp.OK(c, cartListJSON{Items: items})
}

func (h *Handler) DeleteItem(c echo.Context) error {
	uid, ok := auth.UserID(c)
	if !ok {
		return echo.NewHTTPError(http.StatusUnauthorized, "未登录")
	}
	productID, err := parseProductIDParam(c)
	if err != nil {
		return err
	}
	ctx := c.Request().Context()
	if _, err := h.Q.DeleteCartItem(ctx, db.DeleteCartItemParams{
		UserID:    uid,
		ProductID: productID,
	}); err != nil {
		return echo.NewHTTPError(http.StatusInternalServerError, "删除购物车商品失败")
	}
	items, err := h.listJSON(ctx, uid)
	if err != nil {
		return echo.NewHTTPError(http.StatusInternalServerError, "获取购物车失败")
	}
	return apiresp.OK(c, cartListJSON{Items: items})
}

func (h *Handler) Clear(c echo.Context) error {
	uid, ok := auth.UserID(c)
	if !ok {
		return echo.NewHTTPError(http.StatusUnauthorized, "未登录")
	}
	ctx := c.Request().Context()
	if _, err := h.Q.ClearCartByUser(ctx, uid); err != nil {
		return echo.NewHTTPError(http.StatusInternalServerError, "清空购物车失败")
	}
	return apiresp.OK(c, cartListJSON{Items: []cartLineJSON{}})
}

func (h *Handler) Merge(c echo.Context) error {
	uid, ok := auth.UserID(c)
	if !ok {
		return echo.NewHTTPError(http.StatusUnauthorized, "未登录")
	}
	var body mergeBody
	if err := c.Bind(&body); err != nil {
		return echo.NewHTTPError(http.StatusBadRequest, "请求 JSON 格式无效")
	}
	ctx := c.Request().Context()
	for _, it := range body.Items {
		if it.ProductID == 0 || it.Quantity == 0 {
			continue
		}
		if err := h.addQuantity(ctx, uid, it.ProductID, it.Quantity); err != nil {
			return err
		}
	}
	items, err := h.listJSON(ctx, uid)
	if err != nil {
		return echo.NewHTTPError(http.StatusInternalServerError, "获取购物车失败")
	}
	return apiresp.OK(c, cartListJSON{Items: items})
}

func (h *Handler) listJSON(ctx context.Context, uid uint64) ([]cartLineJSON, error) {
	rows, err := h.Q.ListCartItemsByUser(ctx, uid)
	if err != nil {
		return nil, err
	}
	out := make([]cartLineJSON, 0, len(rows))
	for _, row := range rows {
		out = append(out, cartLineJSON{
			ID:             row.ProductID,
			Slug:           row.Slug,
			Title:          row.Title,
			PriceMinor:     row.PriceMinor,
			Currency:       row.Currency,
			ImageURL:       nullStringPtr(row.ImageUrl),
			ProductVisible: row.ProductVisible,
			Qty:            row.Quantity,
		})
	}
	return out, nil
}

func (h *Handler) addQuantity(ctx context.Context, uid, productID uint64, delta uint32) error {
	existing, err := h.Q.GetCartItemByUserProduct(ctx, db.GetCartItemByUserProductParams{
		UserID:    uid,
		ProductID: productID,
	})
	if err != nil {
		if !errors.Is(err, sql.ErrNoRows) {
			return echo.NewHTTPError(http.StatusInternalServerError, "查询购物车失败")
		}
		if _, err := h.Q.GetProductByID(ctx, productID); err != nil {
			if errors.Is(err, sql.ErrNoRows) {
				return echo.NewHTTPError(http.StatusBadRequest, "商品不存在或已下架")
			}
			return echo.NewHTTPError(http.StatusInternalServerError, "查询商品失败")
		}
		_, err = h.Q.InsertCartItem(ctx, db.InsertCartItemParams{
			UserID:    uid,
			ProductID: productID,
			Quantity:  delta,
		})
		if err != nil {
			return echo.NewHTTPError(http.StatusInternalServerError, "加入购物车失败")
		}
		return nil
	}

	p, err := h.Q.GetProductByIDInternal(ctx, productID)
	if err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return echo.NewHTTPError(http.StatusBadRequest, "商品不存在")
		}
		return echo.NewHTTPError(http.StatusInternalServerError, "查询商品失败")
	}
	if !p.Visible && delta > 0 {
		return echo.NewHTTPError(http.StatusBadRequest, "该模板已下架，无法增加数量")
	}

	nextQty := existing.Quantity + delta
	if _, err := h.Q.UpdateCartItemQuantity(ctx, db.UpdateCartItemQuantityParams{
		Quantity:  nextQty,
		UserID:    uid,
		ProductID: productID,
	}); err != nil {
		return echo.NewHTTPError(http.StatusInternalServerError, "更新购物车失败")
	}
	return nil
}

func (h *Handler) setAbsoluteQuantity(ctx context.Context, uid, productID uint64, qty uint32) error {
	existing, err := h.Q.GetCartItemByUserProduct(ctx, db.GetCartItemByUserProductParams{
		UserID:    uid,
		ProductID: productID,
	})
	if err != nil {
		if !errors.Is(err, sql.ErrNoRows) {
			return echo.NewHTTPError(http.StatusInternalServerError, "查询购物车失败")
		}
		if _, err := h.Q.GetProductByID(ctx, productID); err != nil {
			if errors.Is(err, sql.ErrNoRows) {
				return echo.NewHTTPError(http.StatusBadRequest, "商品不存在或已下架")
			}
			return echo.NewHTTPError(http.StatusInternalServerError, "查询商品失败")
		}
		_, err = h.Q.InsertCartItem(ctx, db.InsertCartItemParams{
			UserID:    uid,
			ProductID: productID,
			Quantity:  qty,
		})
		if err != nil {
			return echo.NewHTTPError(http.StatusInternalServerError, "加入购物车失败")
		}
		return nil
	}

	p, err := h.Q.GetProductByIDInternal(ctx, productID)
	if err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return echo.NewHTTPError(http.StatusBadRequest, "商品不存在")
		}
		return echo.NewHTTPError(http.StatusInternalServerError, "查询商品失败")
	}
	if !p.Visible && qty > existing.Quantity {
		return echo.NewHTTPError(http.StatusBadRequest, "该模板已下架，无法增加数量")
	}

	if _, err := h.Q.UpdateCartItemQuantity(ctx, db.UpdateCartItemQuantityParams{
		Quantity:  qty,
		UserID:    uid,
		ProductID: productID,
	}); err != nil {
		return echo.NewHTTPError(http.StatusInternalServerError, "更新购物车失败")
	}
	return nil
}

func parseProductIDParam(c echo.Context) (uint64, error) {
	raw := strings.TrimSpace(c.Param("product_id"))
	if raw == "" {
		return 0, echo.NewHTTPError(http.StatusBadRequest, "缺少商品 ID")
	}
	id, err := strconv.ParseUint(raw, 10, 64)
	if err != nil || id == 0 {
		return 0, echo.NewHTTPError(http.StatusBadRequest, "商品 ID 无效")
	}
	return id, nil
}

func nullStringPtr(v sql.NullString) *string {
	if !v.Valid {
		return nil
	}
	s := v.String
	return &s
}
