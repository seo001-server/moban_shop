package catalog

import (
	"database/sql"
	"errors"
	"net/http"
	"sort"
	"strconv"
	"strings"
	"time"

	"github.com/labstack/echo/v4"

	"moban_shop/internal/apiresp"
	"moban_shop/internal/db"
)

type Handler struct {
	Q db.Querier
}

func New(q db.Querier) *Handler {
	return &Handler{Q: q}
}

type productJSON struct {
	ID           uint64  `json:"id"`
	Slug         string  `json:"slug"`
	Category     string  `json:"category"`
	Title        string  `json:"title"`
	Description  *string `json:"description,omitempty"`
	PriceMinor   int64   `json:"price_minor"`
	Currency     string  `json:"currency"`
	ImageURL     *string `json:"image_url,omitempty"`
	PreviewURL   *string `json:"preview_url,omitempty"`
	SortOrder    int32   `json:"sort_order"`
	Recommended  bool    `json:"recommended"`
	Downloads    int64   `json:"downloads"`
	Score        float64 `json:"score"`
	CreatedAt    string  `json:"created_at"`
}

func rowToJSON(p db.Product) productJSON {
	out := productJSON{
		ID:          p.ID,
		Slug:        p.Slug,
		Category:    p.Category,
		Title:       p.Title,
		PriceMinor:  p.PriceMinor,
		Currency:    p.Currency,
		SortOrder:   p.SortOrder,
		Recommended: p.Recommended,
		Downloads:   p.Downloads,
		Score:       p.Score,
		CreatedAt:   p.CreatedAt.UTC().Format(time.RFC3339Nano),
	}
	if p.Description.Valid {
		s := p.Description.String
		out.Description = &s
	}
	if p.ImageUrl.Valid {
		s := p.ImageUrl.String
		out.ImageURL = &s
	}
	if p.PreviewUrl.Valid {
		s := p.PreviewUrl.String
		out.PreviewURL = &s
	}
	return out
}

// ListProducts returns products. Optional query: category=film|book|game|shop filters server-side.
func normalizeSort(raw string) (string, bool) {
	switch strings.TrimSpace(raw) {
	case "", "time", "hits", "score":
		return strings.TrimSpace(raw), true
	default:
		return "", false
	}
}

func sortProducts(items []db.Product, sortKey string) {
	switch sortKey {
	case "time":
		sort.SliceStable(items, func(i, j int) bool {
			ti := items[i].CreatedAt.UnixNano()
			tj := items[j].CreatedAt.UnixNano()
			if ti == tj {
				return items[i].ID > items[j].ID
			}
			return ti > tj
		})
	case "hits":
		sort.SliceStable(items, func(i, j int) bool {
			if items[i].Downloads == items[j].Downloads {
				return items[i].ID > items[j].ID
			}
			return items[i].Downloads > items[j].Downloads
		})
	case "score":
		sort.SliceStable(items, func(i, j int) bool {
			if items[i].Score == items[j].Score {
				return items[i].ID > items[j].ID
			}
			return items[i].Score > items[j].Score
		})
	default:
		// default SQL ordering: sort_order asc, id asc
	}
}

func (h *Handler) ListProducts(c echo.Context) error {
	ctx := c.Request().Context()
	raw := strings.TrimSpace(c.QueryParam("category"))
	sortKey, ok := normalizeSort(c.QueryParam("sort"))
	if !ok {
		return echo.NewHTTPError(http.StatusBadRequest, "排序参数无效")
	}

	var (
		items []db.Product
		err   error
	)
	switch raw {
	case "":
		items, err = h.Q.ListProducts(ctx)
	case "film", "book", "game", "shop":
		items, err = h.Q.ListProductsByCategory(ctx, raw)
	default:
		return echo.NewHTTPError(http.StatusBadRequest, "分类参数无效")
	}
	if err != nil {
		return echo.NewHTTPError(http.StatusInternalServerError, "获取商品列表失败")
	}
	sortProducts(items, sortKey)
	out := make([]productJSON, 0, len(items))
	for _, p := range items {
		out = append(out, rowToJSON(p))
	}
	return apiresp.OK(c, out)
}

// GetProductByID returns one product by numeric id or 404.
func (h *Handler) GetProductByID(c echo.Context) error {
	raw := strings.TrimSpace(c.Param("id"))
	if raw == "" {
		return echo.NewHTTPError(http.StatusBadRequest, "缺少 ID")
	}
	idu, err := strconv.ParseUint(raw, 10, 64)
	if err != nil || idu == 0 {
		return echo.NewHTTPError(http.StatusBadRequest, "ID 无效")
	}
	ctx := c.Request().Context()
	p, err := h.Q.GetProductByID(ctx, idu)
	if err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return echo.NewHTTPError(http.StatusNotFound, "商品不存在")
		}
		return echo.NewHTTPError(http.StatusInternalServerError, "获取商品失败")
	}
	return apiresp.OK(c, rowToJSON(p))
}
