package admin

import (
	"net/http"
	"strings"

	"github.com/labstack/echo/v4"

	"moban_shop/internal/auth"
)

const CtxAdminUserIDKey = "admin_user_id" // value is `admin`.id (JWT sub)

// RequireAdminJWT verifies Bearer token signed with the admin secret only.
func RequireAdminJWT(secret []byte, issuer string) echo.MiddlewareFunc {
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

			uid, err := auth.ParseSubjectUserID(secret, issuer, raw)
			if err != nil {
				return echo.NewHTTPError(http.StatusUnauthorized, "令牌无效")
			}

			c.Set(CtxAdminUserIDKey, uid)
			return next(c)
		}
	}
}

func AdminUserID(c echo.Context) (uint64, bool) {
	v := c.Get(CtxAdminUserIDKey)
	switch t := v.(type) {
	case uint64:
		return t, true
	default:
		return 0, false
	}
}
