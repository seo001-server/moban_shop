package admin

import (
	"fmt"
	"net/http"
	"strconv"

	"github.com/labstack/echo/v4"

	"moban_shop/internal/apiresp"
)

const maxBatchProductIDs = 100

type batchProductIDsBody struct {
	IDs []uint64 `json:"ids"`
}

type batchSetRecommendedBody struct {
	IDs         []uint64 `json:"ids"`
	Recommended bool     `json:"recommended"`
}

type batchDeleteBlockedItem struct {
	ID     uint64 `json:"id"`
	Reason string `json:"reason"`
}

type batchDeleteResult struct {
	Deleted []uint64               `json:"deleted"`
	Blocked []batchDeleteBlockedItem `json:"blocked"`
}

type batchUpdateResult struct {
	Updated []uint64 `json:"updated"`
}

func parseBatchProductIDs(c echo.Context) ([]uint64, error) {
	var body batchProductIDsBody
	if err := c.Bind(&body); err != nil {
		return nil, echo.NewHTTPError(http.StatusBadRequest, "请求 JSON 格式无效")
	}
	if len(body.IDs) == 0 {
		return nil, echo.NewHTTPError(http.StatusBadRequest, "请选择至少一个模板")
	}
	if len(body.IDs) > maxBatchProductIDs {
		return nil, echo.NewHTTPError(http.StatusBadRequest, fmt.Sprintf("单次最多处理 %d 个模板", maxBatchProductIDs))
	}
	seen := make(map[uint64]struct{}, len(body.IDs))
	ids := make([]uint64, 0, len(body.IDs))
	for _, id := range body.IDs {
		if id == 0 {
			return nil, echo.NewHTTPError(http.StatusBadRequest, "模板 ID 无效")
		}
		if _, ok := seen[id]; ok {
			continue
		}
		seen[id] = struct{}{}
		ids = append(ids, id)
	}
	return ids, nil
}

func (h *ProductsHandler) deleteProductByID(c echo.Context, id uint64) error {
	ctx := c.Request().Context()
	count, err := h.Q.AdminCountOrderItemsByProduct(ctx, id)
	if err != nil {
		return err
	}
	if count > 0 {
		return echo.NewHTTPError(http.StatusConflict, productDeleteBlockedMsg)
	}
	product, err := h.Q.AdminGetProductByID(ctx, id)
	detail := ""
	if err == nil {
		detail = product.Title
	}
	if err := h.Q.AdminDeleteProduct(ctx, id); err != nil {
		if productDeleteBlocked(err) {
			return echo.NewHTTPError(http.StatusConflict, productDeleteBlockedMsg)
		}
		return err
	}
	auditFromContext(c, h.Q, AuditActionProductDelete, AuditResourceProduct, auditResourceIDUint(id), detail)
	return nil
}

// BatchDeleteProducts deletes multiple products, skipping ones referenced by orders.
func (h *ProductsHandler) BatchDeleteProducts(c echo.Context) error {
	ids, err := parseBatchProductIDs(c)
	if err != nil {
		return err
	}
	ctx := c.Request().Context()
	result := batchDeleteResult{
		Deleted: []uint64{},
		Blocked: []batchDeleteBlockedItem{},
	}
	for _, id := range ids {
		count, qerr := h.Q.AdminCountOrderItemsByProduct(ctx, id)
		if qerr != nil {
			return echo.NewHTTPError(http.StatusInternalServerError, "检查模板订单引用失败")
		}
		if count > 0 {
			result.Blocked = append(result.Blocked, batchDeleteBlockedItem{
				ID:     id,
				Reason: productDeleteBlockedMsg,
			})
			continue
		}
		product, gerr := h.Q.AdminGetProductByID(ctx, id)
		detail := ""
		if gerr == nil {
			detail = product.Title
		}
		if derr := h.Q.AdminDeleteProduct(ctx, id); derr != nil {
			if productDeleteBlocked(derr) {
				result.Blocked = append(result.Blocked, batchDeleteBlockedItem{
					ID:     id,
					Reason: productDeleteBlockedMsg,
				})
				continue
			}
			return echo.NewHTTPError(http.StatusInternalServerError, "批量删除模板失败")
		}
		auditFromContext(c, h.Q, AuditActionProductDelete, AuditResourceProduct, auditResourceIDUint(id), detail)
		result.Deleted = append(result.Deleted, id)
	}
	return apiresp.OK(c, result)
}

// BatchSetRecommended updates recommended flag for multiple products.
func (h *ProductsHandler) BatchSetRecommended(c echo.Context) error {
	var body batchSetRecommendedBody
	if err := c.Bind(&body); err != nil {
		return echo.NewHTTPError(http.StatusBadRequest, "请求 JSON 格式无效")
	}
	if len(body.IDs) == 0 {
		return echo.NewHTTPError(http.StatusBadRequest, "请选择至少一个模板")
	}
	if len(body.IDs) > maxBatchProductIDs {
		return echo.NewHTTPError(http.StatusBadRequest, fmt.Sprintf("单次最多处理 %d 个模板", maxBatchProductIDs))
	}
	ctx := c.Request().Context()
	updated := make([]uint64, 0, len(body.IDs))
	label := "recommended=0"
	if body.Recommended {
		label = "recommended=1"
	}
	for _, id := range body.IDs {
		if id == 0 {
			return echo.NewHTTPError(http.StatusBadRequest, "模板 ID 无效")
		}
		if _, err := h.Q.AdminGetProductByID(ctx, id); err != nil {
			return echo.NewHTTPError(http.StatusNotFound, "模板 #"+strconv.FormatUint(id, 10)+" 不存在")
		}
		if err := h.Q.AdminSetProductRecommended(ctx, body.Recommended, id); err != nil {
			return echo.NewHTTPError(http.StatusInternalServerError, "批量更新推荐状态失败")
		}
		auditFromContext(c, h.Q, AuditActionProductUpdate, AuditResourceProduct, auditResourceIDUint(id), label)
		updated = append(updated, id)
	}
	return apiresp.OK(c, batchUpdateResult{Updated: updated})
}
