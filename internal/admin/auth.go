package admin

import (
	"database/sql"
	"errors"
	"net/http"
	"strings"
	"time"

	"github.com/labstack/echo/v4"
	"golang.org/x/crypto/bcrypt"

	"moban_shop/internal/apiresp"
	"moban_shop/internal/auth"
	"moban_shop/internal/db"
)

type AuthHandler struct {
	Q              *db.Queries
	AdminSecret    []byte
	AdminIssuer    string
	AdminAccessTTL time.Duration
}

func NewAuthHandler(q *db.Queries, adminSecret []byte, adminIssuer string, ttl time.Duration) *AuthHandler {
	return &AuthHandler{
		Q:              q,
		AdminSecret:    adminSecret,
		AdminIssuer:    adminIssuer,
		AdminAccessTTL: ttl,
	}
}

type credentialsBody struct {
	Account  string `json:"account"`
	Password string `json:"password"`
}

type tokenResponse struct {
	AccessToken string `json:"access_token"`
	TokenType   string `json:"token_type"`
	ExpiresIn   int64  `json:"expires_in"`
}

type meResponse struct {
	Admin struct {
		ID       uint64 `json:"id"`
		Account  string `json:"account"`
		Nickname string `json:"nickname"`
	} `json:"admin"`
}

type updateMeBody struct {
	Nickname string `json:"nickname"`
}

type changePasswordBody struct {
	OldPassword string `json:"old_password"`
	NewPassword string `json:"new_password"`
}

func normalizeAdminAccount(s string) string {
	return strings.ToLower(strings.TrimSpace(s))
}

// Login verifies credentials against table `admin` only (separate lifecycle from storefront users).
func (h *AuthHandler) Login(c echo.Context) error {
	var body credentialsBody
	if err := c.Bind(&body); err != nil {
		return echo.NewHTTPError(http.StatusBadRequest, "请求 JSON 格式无效")
	}

	acc := normalizeAdminAccount(body.Account)
	forbidden := echo.NewHTTPError(http.StatusForbidden, "禁止访问")
	if acc == "" {
		return forbidden
	}

	ctx := c.Request().Context()
	row, err := h.Q.GetAdminByAccount(ctx, acc)
	if err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return forbidden
		}
		return echo.NewHTTPError(http.StatusInternalServerError, "查询管理员失败")
	}

	if err := bcrypt.CompareHashAndPassword([]byte(row.PasswordHash), []byte(body.Password)); err != nil {
		return forbidden
	}

	tr, err := h.mintToken(row.ID)
	if err != nil {
		return echo.NewHTTPError(http.StatusInternalServerError, "签发令牌失败")
	}
	WriteAuditLog(ctx, h.Q, row.ID, AuditActionLogin, AuditResourceAdmin, auditResourceIDUint(row.ID), ClientIP(c), "")
	return apiresp.OK(c, tr)
}

func (h *AuthHandler) mintToken(adminUserID uint64) (tokenResponse, error) {
	sec := int64(h.AdminAccessTTL / time.Second)
	if sec <= 0 {
		sec = 1
	}
	tok, _, err := auth.IssueAccess(h.AdminSecret, h.AdminIssuer, adminUserID, h.AdminAccessTTL)
	if err != nil {
		return tokenResponse{}, err
	}
	return tokenResponse{
		AccessToken: tok,
		TokenType:   "Bearer",
		ExpiresIn:   sec,
	}, nil
}

// Me resolves the bearer subject as `admin`.id.
func (h *AuthHandler) Me(c echo.Context) error {
	uid, ok := AdminUserID(c)
	if !ok {
		return echo.NewHTTPError(http.StatusUnauthorized, "未登录")
	}
	ctx := c.Request().Context()
	row, err := h.Q.GetAdminByID(ctx, uid)
	if err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return echo.NewHTTPError(http.StatusUnauthorized, "管理员不存在")
		}
		return echo.NewHTTPError(http.StatusInternalServerError, "查询管理员失败")
	}

	nickname := strings.TrimSpace(row.Nickname)
	if nickname == "" {
		nickname = row.Account
	}

	var out meResponse
	out.Admin.ID = row.ID
	out.Admin.Account = row.Account
	out.Admin.Nickname = nickname
	return apiresp.OK(c, out)
}

// UpdateMe changes the logged-in admin's nickname.
func (h *AuthHandler) UpdateMe(c echo.Context) error {
	uid, ok := AdminUserID(c)
	if !ok {
		return echo.NewHTTPError(http.StatusUnauthorized, "未登录")
	}
	var body updateMeBody
	if err := c.Bind(&body); err != nil {
		return echo.NewHTTPError(http.StatusBadRequest, "请求 JSON 格式无效")
	}
	nickname := strings.TrimSpace(body.Nickname)
	if nickname == "" {
		return echo.NewHTTPError(http.StatusBadRequest, "昵称不能为空")
	}
	if len([]rune(nickname)) > 32 {
		return echo.NewHTTPError(http.StatusBadRequest, "昵称不能超过 32 个字符")
	}

	ctx := c.Request().Context()
	if err := h.Q.AdminUpdateNickname(ctx, nickname, uid); err != nil {
		return echo.NewHTTPError(http.StatusInternalServerError, "更新昵称失败")
	}
	row, err := h.Q.GetAdminByID(ctx, uid)
	if err != nil {
		return echo.NewHTTPError(http.StatusInternalServerError, "查询管理员失败")
	}
	var out meResponse
	out.Admin.ID = row.ID
	out.Admin.Account = row.Account
	out.Admin.Nickname = nickname
	auditFromContext(c, h.Q, AuditActionAdminUpdateMe, AuditResourceAdmin, auditResourceIDUint(uid), "nickname="+nickname)
	return apiresp.OK(c, out)
}

// ChangePassword verifies the old password and sets a new one.
func (h *AuthHandler) ChangePassword(c echo.Context) error {
	uid, ok := AdminUserID(c)
	if !ok {
		return echo.NewHTTPError(http.StatusUnauthorized, "未登录")
	}
	var body changePasswordBody
	if err := c.Bind(&body); err != nil {
		return echo.NewHTTPError(http.StatusBadRequest, "请求 JSON 格式无效")
	}
	if strings.TrimSpace(body.OldPassword) == "" || strings.TrimSpace(body.NewPassword) == "" {
		return echo.NewHTTPError(http.StatusBadRequest, "请填写原密码和新密码")
	}
	if len(body.NewPassword) < 8 {
		return echo.NewHTTPError(http.StatusBadRequest, "新密码至少 8 位")
	}

	ctx := c.Request().Context()
	row, err := h.Q.GetAdminByID(ctx, uid)
	if err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return echo.NewHTTPError(http.StatusUnauthorized, "管理员不存在")
		}
		return echo.NewHTTPError(http.StatusInternalServerError, "查询管理员失败")
	}
	if err := bcrypt.CompareHashAndPassword([]byte(row.PasswordHash), []byte(body.OldPassword)); err != nil {
		return echo.NewHTTPError(http.StatusForbidden, "原密码不正确")
	}

	hash, err := bcrypt.GenerateFromPassword([]byte(body.NewPassword), bcrypt.DefaultCost)
	if err != nil {
		return echo.NewHTTPError(http.StatusInternalServerError, "加密密码失败")
	}
	if err := h.Q.AdminUpdatePassword(ctx, string(hash), uid); err != nil {
		return echo.NewHTTPError(http.StatusInternalServerError, "更新密码失败")
	}
	auditFromContext(c, h.Q, AuditActionAdminChangePassword, AuditResourceAdmin, auditResourceIDUint(uid), "")
	return apiresp.OK(c, nil)
}
