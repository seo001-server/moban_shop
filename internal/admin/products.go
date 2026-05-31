package admin

import (
	"database/sql"
	"errors"
	"fmt"
	"math"
	"net/http"
	"strconv"
	"strings"
	"time"

	"github.com/labstack/echo/v4"

	"moban_shop/internal/apiresp"
	"moban_shop/internal/db"
)

type ProductsHandler struct {
	Q *db.Queries
}

func NewProductsHandler(q *db.Queries) *ProductsHandler {
	return &ProductsHandler{Q: q}
}

type productBody struct {
	Slug         string   `json:"slug"`
	Category     string   `json:"category"`
	Title        string   `json:"title"`
	Description  *string  `json:"description"`
	PriceMinor   int64    `json:"price_minor"`
	Currency     string   `json:"currency"`
	ImageURL     *string  `json:"image_url"`
	PreviewURL   *string  `json:"preview_url"`
	DownloadURL  *string  `json:"download_url"`
	SortOrder    *int32   `json:"sort_order"`
	Recommended  *bool    `json:"recommended"`
	Visible      *bool    `json:"visible"`
	Downloads    *int64   `json:"downloads"`
	Score        *float64 `json:"score"`
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
	DownloadURL  *string `json:"download_url,omitempty"`
	SortOrder    int32   `json:"sort_order"`
	Recommended  bool    `json:"recommended"`
	Visible      bool    `json:"visible"`
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
		Visible:     p.Visible,
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
	if p.DownloadUrl.Valid {
		s := p.DownloadUrl.String
		out.DownloadURL = &s
	}
	return out
}

func nullableString(ptr *string) sql.NullString {
	if ptr == nil {
		return sql.NullString{}
	}
	s := strings.TrimSpace(*ptr)
	if s == "" {
		return sql.NullString{}
	}
	return sql.NullString{String: s, Valid: true}
}

func validateProductBody(b *productBody) error {
	b.Slug = strings.TrimSpace(b.Slug)
	b.Title = strings.TrimSpace(b.Title)
	b.Currency = strings.TrimSpace(strings.ToUpper(b.Currency))

	if b.Slug == "" {
		return errors.New("请填写 slug")
	}
	if b.Title == "" {
		return errors.New("请填写标题")
	}

	if len(b.Currency) != 3 {
		return errors.New("货币须为 3 位 ISO 4217 代码")
	}
	for _, ch := range b.Currency {
		if ch < 'A' || ch > 'Z' {
			return errors.New("货币代码须为大写字母 A-Z")
		}
	}

	if b.PriceMinor < 0 {
		return errors.New("价格不能为负数")
	}

	dls := downloadsFromPtr(b.Downloads)
	if dls < 0 {
		return errors.New("下载量不能为负数")
	}
	sc := scoreFromPtr(b.Score)
	if math.IsNaN(sc) || math.IsInf(sc, 0) {
		return errors.New("评分须为有效数字")
	}
	if sc < 0 {
		return errors.New("评分不能为负数")
	}

	cat, err := normalizeProductCategory(b.Category)
	if err != nil {
		return err
	}
	b.Category = cat

	return nil
}

func normalizeProductCategory(raw string) (string, error) {
	c := strings.TrimSpace(strings.ToLower(raw))
	if c == "" {
		c = "film"
	}
	switch c {
	case "film", "book", "game", "shop":
		return c, nil
	default:
		return "", errors.New("分类须为 film、book、game、shop 之一")
	}
}

func sortOrderPtr(p *int32) int32 {
	if p == nil {
		return 0
	}
	return *p
}

func recommendedFromPtr(p *bool) bool {
	if p == nil {
		return false
	}
	return *p
}

func visibleFromPtr(p *bool) bool {
	if p == nil {
		return true
	}
	return *p
}

func downloadsFromPtr(p *int64) int64 {
	if p == nil {
		return 0
	}
	return *p
}

func scoreFromPtr(p *float64) float64 {
	if p == nil {
		return 0
	}
	return *p
}

// ListProducts returns paginated rows.
func (h *ProductsHandler) ListProducts(c echo.Context) error {
	ctx := c.Request().Context()
	p := ParsePagination(c)
	filters, err := parseProductsFilters(c)
	if err != nil {
		return err
	}
	total, err := h.Q.AdminCountProductsFiltered(ctx, filters)
	if err != nil {
		return echo.NewHTTPError(http.StatusInternalServerError, "统计商品数量失败")
	}
	items, err := h.Q.AdminListProductsFilteredPaged(ctx, filters, int32(p.PageSize), int32(p.Offset))
	if err != nil {
		return echo.NewHTTPError(http.StatusInternalServerError, "获取商品列表失败")
	}
	out := make([]productJSON, 0, len(items))
	for _, row := range items {
		out = append(out, rowToJSON(row))
	}
	return writePaginatedJSON(c, out, p, total)
}

// GetProduct returns one row by numeric id.
func (h *ProductsHandler) GetProduct(c echo.Context) error {
	id, err := parseIDParam(c)
	if err != nil {
		return err
	}
	ctx := c.Request().Context()
	p, err := h.Q.AdminGetProductByID(ctx, id)
	if err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return echo.NewHTTPError(http.StatusNotFound, "商品不存在")
		}
		return echo.NewHTTPError(http.StatusInternalServerError, "获取商品失败")
	}
	return apiresp.OK(c, rowToJSON(p))
}

func (h *ProductsHandler) CreateProduct(c echo.Context) error {
	var body productBody
	if err := c.Bind(&body); err != nil {
		return echo.NewHTTPError(http.StatusBadRequest, "请求 JSON 格式无效")
	}
	if err := validateProductBody(&body); err != nil {
		return echo.NewHTTPError(http.StatusBadRequest, err.Error())
	}

	arg := db.AdminCreateProductParams{
		Slug:         strings.TrimSpace(body.Slug),
		Category:     body.Category,
		Title:        strings.TrimSpace(body.Title),
		Description:  nullableString(body.Description),
		PriceMinor:   body.PriceMinor,
		Currency:     strings.TrimSpace(strings.ToUpper(body.Currency)),
		ImageUrl:     nullableString(body.ImageURL),
		PreviewUrl:   nullableString(body.PreviewURL),
		DownloadUrl:  nullableString(body.DownloadURL),
		SortOrder:    sortOrderPtr(body.SortOrder),
		Recommended:  recommendedFromPtr(body.Recommended),
		Visible:      visibleFromPtr(body.Visible),
		Downloads:    downloadsFromPtr(body.Downloads),
		Score:        scoreFromPtr(body.Score),
	}

	ctx := c.Request().Context()
	res, err := h.Q.AdminCreateProduct(ctx, arg)
	if err != nil {
		if isDuplicateKey(err) {
			return echo.NewHTTPError(http.StatusConflict, "标识 slug 已存在")
		}
		return echo.NewHTTPError(http.StatusInternalServerError, "创建商品失败")
	}
	insertID, ierr := res.LastInsertId()
	if ierr != nil || insertID <= 0 {
		p2, gerr := h.Q.AdminGetProductBySlug(ctx, arg.Slug)
		if gerr != nil {
			return echo.NewHTTPError(http.StatusInternalServerError, "创建后查询商品失败")
		}
		auditFromContext(c, h.Q, AuditActionProductCreate, AuditResourceProduct, auditResourceIDUint(p2.ID), p2.Title)
		return apiresp.OK(c, rowToJSON(p2))
	}

	p3, err := h.Q.AdminGetProductByID(ctx, uint64(insertID))
	if err != nil {
		return echo.NewHTTPError(http.StatusInternalServerError, "查询商品失败")
	}
	auditFromContext(c, h.Q, AuditActionProductCreate, AuditResourceProduct, auditResourceIDUint(p3.ID), p3.Title)
	return apiresp.OK(c, rowToJSON(p3))
}

func (h *ProductsHandler) UpdateProduct(c echo.Context) error {
	id, herr := parseIDParam(c)
	if herr != nil {
		return herr
	}

	var body productBody
	if err := c.Bind(&body); err != nil {
		return echo.NewHTTPError(http.StatusBadRequest, "请求 JSON 格式无效")
	}
	if err := validateProductBody(&body); err != nil {
		return echo.NewHTTPError(http.StatusBadRequest, err.Error())
	}

	ctx := c.Request().Context()
	up := db.AdminUpdateProductParams{
		Slug:        strings.TrimSpace(body.Slug),
		Category:    body.Category,
		Title:       strings.TrimSpace(body.Title),
		Description: nullableString(body.Description),
		PriceMinor:  body.PriceMinor,
		Currency:    strings.TrimSpace(strings.ToUpper(body.Currency)),
		ImageUrl:    nullableString(body.ImageURL),
		PreviewUrl:  nullableString(body.PreviewURL),
		DownloadUrl: nullableString(body.DownloadURL),
		SortOrder:   sortOrderPtr(body.SortOrder),
		Recommended: recommendedFromPtr(body.Recommended),
		Visible:     visibleFromPtr(body.Visible),
		Downloads:   downloadsFromPtr(body.Downloads),
		Score:       scoreFromPtr(body.Score),
		ID:          id,
	}

	if err := h.Q.AdminUpdateProduct(ctx, up); err != nil {
		if isDuplicateKey(err) {
			return echo.NewHTTPError(http.StatusConflict, "标识 slug 已存在")
		}
		return echo.NewHTTPError(http.StatusInternalServerError, "更新商品失败")
	}

	p, err := h.Q.AdminGetProductByID(ctx, id)
	if err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return echo.NewHTTPError(http.StatusNotFound, "商品不存在")
		}
		return echo.NewHTTPError(http.StatusInternalServerError, "查询商品失败")
	}
	auditFromContext(c, h.Q, AuditActionProductUpdate, AuditResourceProduct, auditResourceIDUint(id), p.Title)
	return apiresp.OK(c, rowToJSON(p))
}

// DuplicateProduct creates a copy of an existing product with a new slug.
func (h *ProductsHandler) DuplicateProduct(c echo.Context) error {
	id, herr := parseIDParam(c)
	if herr != nil {
		return herr
	}
	ctx := c.Request().Context()
	src, err := h.Q.AdminGetProductByID(ctx, id)
	if err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return echo.NewHTTPError(http.StatusNotFound, "商品不存在")
		}
		return echo.NewHTTPError(http.StatusInternalServerError, "获取商品失败")
	}

	suffix := strconv.FormatInt(time.Now().Unix(), 10)
	newSlug := src.Slug + "-copy-" + suffix
	const maxSlugLen = 191
	if len(newSlug) > maxSlugLen {
		trim := maxSlugLen - len(suffix) - len("-copy-")
		if trim < 1 {
			trim = 1
		}
		base := src.Slug
		if len(base) > trim {
			base = base[:trim]
		}
		newSlug = base + "-copy-" + suffix
	}

	arg := db.AdminCreateProductParams{
		Slug:        newSlug,
		Category:    src.Category,
		Title:       src.Title + " (副本)",
		Description: src.Description,
		PriceMinor:  src.PriceMinor,
		Currency:    src.Currency,
		ImageUrl:    src.ImageUrl,
		PreviewUrl:  src.PreviewUrl,
		DownloadUrl: src.DownloadUrl,
		SortOrder:   src.SortOrder,
		Recommended: false,
		Visible:     false,
		Downloads:   src.Downloads,
		Score:       src.Score,
	}

	res, err := h.Q.AdminCreateProduct(ctx, arg)
	if err != nil {
		if isDuplicateKey(err) {
			return echo.NewHTTPError(http.StatusConflict, "复制失败，请稍后重试")
		}
		return echo.NewHTTPError(http.StatusInternalServerError, "复制商品失败")
	}
	insertID, ierr := res.LastInsertId()
	if ierr != nil || insertID <= 0 {
		p2, gerr := h.Q.AdminGetProductBySlug(ctx, arg.Slug)
		if gerr != nil {
			return echo.NewHTTPError(http.StatusInternalServerError, "复制后查询商品失败")
		}
		auditFromContext(c, h.Q, AuditActionProductDuplicate, AuditResourceProduct, auditResourceIDUint(p2.ID), fmt.Sprintf("#%d → #%d", id, p2.ID))
		return apiresp.OK(c, rowToJSON(p2))
	}
	p3, err := h.Q.AdminGetProductByID(ctx, uint64(insertID))
	if err != nil {
		return echo.NewHTTPError(http.StatusInternalServerError, "查询商品失败")
	}
	auditFromContext(c, h.Q, AuditActionProductDuplicate, AuditResourceProduct, auditResourceIDUint(p3.ID), fmt.Sprintf("#%d → #%d", id, p3.ID))
	return apiresp.OK(c, rowToJSON(p3))
}

func (h *ProductsHandler) DeleteProduct(c echo.Context) error {
	id, herr := parseIDParam(c)
	if herr != nil {
		return herr
	}
	if err := h.deleteProductByID(c, id); err != nil {
		if he, ok := err.(*echo.HTTPError); ok {
			return he
		}
		return echo.NewHTTPError(http.StatusInternalServerError, "删除商品失败")
	}
	return apiresp.OK(c, nil)
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
