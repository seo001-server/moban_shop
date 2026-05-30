package admin

import (
	"strconv"
	"time"

	"moban_shop/internal/db"
)

type orderItemJSON struct {
	ProductID      uint64 `json:"product_id"`
	ProductTitle   string `json:"product_title"`
	Quantity       uint32 `json:"quantity"`
	UnitPriceMinor int64  `json:"unit_price_minor"`
	LineTotalMinor int64  `json:"line_total_minor"`
}

type orderSummaryJSON struct {
	ID               uint64          `json:"id"`
	UserID           uint64          `json:"user_id"`
	UserEmail        string          `json:"user_email"`
	Status           string          `json:"status"`
	TotalAmountMinor int64           `json:"total_amount_minor"`
	Currency         string          `json:"currency"`
	ItemCount        int64           `json:"item_count"`
	ItemsSummary     string          `json:"items_summary"`
	Items            []orderItemJSON `json:"items,omitempty"`
	CreatedAt        string          `json:"created_at"`
	UpdatedAt        string          `json:"updated_at"`
}

func orderRowToSummary(o db.AdminListOrdersRow) orderSummaryJSON {
	summary := orderSummaryJSON{
		ID:               o.ID,
		UserID:           o.UserID,
		UserEmail:        o.UserEmail,
		Status:           o.Status,
		TotalAmountMinor: o.TotalAmountMinor,
		Currency:         o.Currency,
		ItemCount:        o.ItemCount,
		CreatedAt:        o.CreatedAt.UTC().Format(time.RFC3339Nano),
		UpdatedAt:        o.UpdatedAt.UTC().Format(time.RFC3339Nano),
	}
	if o.ItemsSummary.Valid {
		summary.ItemsSummary = o.ItemsSummary.String
	}
	return summary
}

func orderHeaderToSummary(h db.AdminGetOrderByIDRow, items []db.AdminListOrderItemsRow) orderSummaryJSON {
	out := orderSummaryJSON{
		ID:               h.ID,
		UserID:           h.UserID,
		UserEmail:        h.UserEmail,
		Status:           h.Status,
		TotalAmountMinor: h.TotalAmountMinor,
		Currency:         h.Currency,
		ItemCount:        int64(len(items)),
		CreatedAt:        h.CreatedAt.UTC().Format(time.RFC3339Nano),
		UpdatedAt:        h.UpdatedAt.UTC().Format(time.RFC3339Nano),
		Items:            make([]orderItemJSON, 0, len(items)),
	}
	parts := make([]string, 0, len(items))
	for _, it := range items {
		lineTotal := it.UnitPriceMinor * int64(it.Quantity)
		out.Items = append(out.Items, orderItemJSON{
			ProductID:      it.ProductID,
			ProductTitle:   it.ProductTitle,
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
