package admin

import (
	"database/sql"
	"errors"
	"net/http"
	"strconv"
	"strings"
	"time"

	"github.com/labstack/echo/v4"

	"moban_shop/internal/apiresp"
	"moban_shop/internal/db"
)

type UsersHandler struct {
	Q *db.Queries
}

func NewUsersHandler(q *db.Queries) *UsersHandler {
	return &UsersHandler{Q: q}
}

type userJSON struct {
	ID        uint64 `json:"id"`
	Email     string `json:"email"`
	CreatedAt string `json:"created_at"`
}

// ListUsers returns paginated storefront users (no password hash).
func (h *UsersHandler) ListUsers(c echo.Context) error {
	ctx := c.Request().Context()
	p := ParsePagination(c)
	query := parseUsersQueryFilter(c)
	total, err := h.Q.AdminCountUsersFiltered(ctx, query)
	if err != nil {
		return echo.NewHTTPError(http.StatusInternalServerError, "统计用户数量失败")
	}
	rows, err := h.Q.AdminListUsersFilteredPaged(ctx, query, int32(p.PageSize), int32(p.Offset))
	if err != nil {
		return echo.NewHTTPError(http.StatusInternalServerError, "获取用户列表失败")
	}
	out := make([]userJSON, 0, len(rows))
	for _, u := range rows {
		out = append(out, userToJSON(u))
	}
	return writePaginatedJSON(c, out, p, total)
}

func (h *UsersHandler) GetUser(c echo.Context) error {
	id, err := parseUserIDParam(c)
	if err != nil {
		return err
	}
	ctx := c.Request().Context()
	row, err := h.Q.AdminGetUserByID(ctx, id)
	if err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return echo.NewHTTPError(http.StatusNotFound, "用户不存在")
		}
		return echo.NewHTTPError(http.StatusInternalServerError, "获取用户失败")
	}
	return apiresp.OK(c, userToJSON(row))
}

func (h *UsersHandler) ListUserOrders(c echo.Context) error {
	id, err := parseUserIDParam(c)
	if err != nil {
		return err
	}
	ctx := c.Request().Context()
	if _, err := h.Q.AdminGetUserByID(ctx, id); err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return echo.NewHTTPError(http.StatusNotFound, "用户不存在")
		}
		return echo.NewHTTPError(http.StatusInternalServerError, "获取用户失败")
	}

	p := ParsePagination(c)
	total, err := h.Q.AdminCountOrdersByUser(ctx, id)
	if err != nil {
		return echo.NewHTTPError(http.StatusInternalServerError, "统计订单数量失败")
	}
	rows, err := h.Q.AdminListOrdersByUserPaged(ctx, id, int32(p.PageSize), int32(p.Offset))
	if err != nil {
		return echo.NewHTTPError(http.StatusInternalServerError, "获取订单列表失败")
	}
	out := make([]orderSummaryJSON, 0, len(rows))
	for _, row := range rows {
		out = append(out, orderRowToSummary(row))
	}
	return writePaginatedJSON(c, out, p, total)
}

func userToJSON(u db.AdminListUsersRow) userJSON {
	return userJSON{
		ID:        u.ID,
		Email:     u.Email,
		CreatedAt: u.CreatedAt.UTC().Format(time.RFC3339Nano),
	}
}

func parseUserIDParam(c echo.Context) (uint64, error) {
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
