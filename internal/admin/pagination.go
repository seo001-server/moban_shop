package admin

import (
	"math"
	"strconv"
	"strings"

	"github.com/labstack/echo/v4"

	"moban_shop/internal/apiresp"
)

const (
	DefaultPageSize = 10
	MaxPageSize     = 100
)

type PaginationParams struct {
	Page     int
	PageSize int
	Offset   int
}

type PaginatedResponse[T any] struct {
	Items      []T   `json:"items"`
	Page       int   `json:"page"`
	PageSize   int   `json:"page_size"`
	Total      int64 `json:"total"`
	TotalPages int   `json:"total_pages"`
}

func ParsePagination(c echo.Context) PaginationParams {
	page := parsePositiveInt(c.QueryParam("page"), 1)
	pageSize := parsePositiveInt(c.QueryParam("page_size"), DefaultPageSize)
	if pageSize > MaxPageSize {
		pageSize = MaxPageSize
	}
	return PaginationParams{
		Page:     page,
		PageSize: pageSize,
		Offset:   (page - 1) * pageSize,
	}
}

func NewPaginatedResponse[T any](items []T, p PaginationParams, total int64) PaginatedResponse[T] {
	if items == nil {
		items = []T{}
	}
	totalPages := 1
	if total > 0 {
		totalPages = int(math.Ceil(float64(total) / float64(p.PageSize)))
	}
	if p.Page > totalPages {
		p.Page = totalPages
	}
	return PaginatedResponse[T]{
		Items:      items,
		Page:       p.Page,
		PageSize:   p.PageSize,
		Total:      total,
		TotalPages: totalPages,
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

func writePaginatedJSON[T any](c echo.Context, items []T, p PaginationParams, total int64) error {
	return apiresp.OK(c, NewPaginatedResponse(items, p, total))
}
