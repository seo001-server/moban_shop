package auth

import (
	"net/http"
	"strings"

	"github.com/labstack/echo/v4"
)

const (
	// CtxUserIDKey is the Echo context key for the authenticated user id (uint64).
	CtxUserIDKey = "auth_user_id"
)

// RequireAuth verifies Authorization: Bearer <jwt> and stores user id in context.
func RequireAuth(secret []byte, issuer string) echo.MiddlewareFunc {
	return func(next echo.HandlerFunc) echo.HandlerFunc {
		return func(c echo.Context) error {
			hdr := strings.TrimSpace(c.Request().Header.Get(echo.HeaderAuthorization))
			if hdr == "" {
				return echo.NewHTTPError(http.StatusUnauthorized, "缺少 Authorization 请求头")
			}
			raw, ok := strings.CutPrefix(hdr, "Bearer ")
			if !ok {
				return echo.NewHTTPError(http.StatusUnauthorized, "Authorization 方案无效")
			}
			raw = strings.TrimSpace(raw)
			if raw == "" {
				return echo.NewHTTPError(http.StatusUnauthorized, "缺少 Bearer 令牌")
			}

			uid, err := ParseSubjectUserID(secret, issuer, raw)
			if err != nil {
				return echo.NewHTTPError(http.StatusUnauthorized, "令牌无效")
			}

			c.Set(CtxUserIDKey, uid)
			return next(c)
		}
	}
}

// UserID returns the authenticated user id from context, or false if missing/wrong type.
func UserID(c echo.Context) (uint64, bool) {
	v := c.Get(CtxUserIDKey)
	switch t := v.(type) {
	case uint64:
		return t, true
	default:
		return 0, false
	}
}
