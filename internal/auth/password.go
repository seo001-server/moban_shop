package auth

import (
	"crypto/rand"
	"crypto/sha256"
	"database/sql"
	"encoding/hex"
	"errors"
	"net/http"
	"strings"
	"time"

	"github.com/labstack/echo/v4"
	"golang.org/x/crypto/bcrypt"

	"moban_shop/internal/apiresp"
	"moban_shop/internal/db"
)

type changePasswordBody struct {
	OldPassword string `json:"old_password"`
	NewPassword string `json:"new_password"`
}

type forgotPasswordBody struct {
	Email string `json:"email"`
}

type resetPasswordBody struct {
	Token       string `json:"token"`
	NewPassword string `json:"new_password"`
}

type forgotPasswordResponse struct {
	Message  string  `json:"message"`
	ResetURL *string `json:"reset_url,omitempty"`
}

// ChangePassword updates the logged-in user's password.
func (h *Handler) ChangePassword(c echo.Context) error {
	uid, ok := UserID(c)
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
	if reason := validatePasswordOnly(body.NewPassword); reason != "" {
		return echo.NewHTTPError(http.StatusBadRequest, reason)
	}
	if body.OldPassword == body.NewPassword {
		return echo.NewHTTPError(http.StatusBadRequest, "新密码不能与原密码相同")
	}

	ctx := c.Request().Context()
	row, err := h.Q.GetUserByID(ctx, uid)
	if err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return echo.NewHTTPError(http.StatusUnauthorized, "用户不存在")
		}
		return echo.NewHTTPError(http.StatusInternalServerError, "查询用户失败")
	}
	if err := bcrypt.CompareHashAndPassword([]byte(row.PasswordHash), []byte(body.OldPassword)); err != nil {
		return echo.NewHTTPError(http.StatusForbidden, "原密码不正确")
	}

	hash, err := bcrypt.GenerateFromPassword([]byte(body.NewPassword), bcryptCost)
	if err != nil {
		return echo.NewHTTPError(http.StatusInternalServerError, "密码加密失败")
	}
	if err := h.Q.UserUpdatePassword(ctx, db.UserUpdatePasswordParams{
		PasswordHash: string(hash),
		ID:           uid,
	}); err != nil {
		return echo.NewHTTPError(http.StatusInternalServerError, "更新密码失败")
	}
	return apiresp.OK(c, nil)
}

// ForgotPassword creates a reset token. Email is not sent; optional dev link exposure.
func (h *Handler) ForgotPassword(c echo.Context) error {
	var body forgotPasswordBody
	if err := c.Bind(&body); err != nil {
		return echo.NewHTTPError(http.StatusBadRequest, "请求 JSON 格式无效")
	}
	email := NormalizeEmail(body.Email)
	if email == "" {
		return echo.NewHTTPError(http.StatusBadRequest, "请填写邮箱")
	}

	const genericMsg = "若该邮箱已注册，请使用重置链接设置新密码"
	out := forgotPasswordResponse{Message: genericMsg}

	ctx := c.Request().Context()
	u, err := h.Q.GetUserByEmail(ctx, email)
	if err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return apiresp.OK(c, out)
		}
		return echo.NewHTTPError(http.StatusInternalServerError, "查询用户失败")
	}

	rawToken, tokenHash, err := newResetToken()
	if err != nil {
		return echo.NewHTTPError(http.StatusInternalServerError, "生成重置令牌失败")
	}
	expires := time.Now().UTC().Add(h.PasswordResetTTL)
	if _, err := h.Q.CreatePasswordResetToken(ctx, db.CreatePasswordResetTokenParams{
		UserID:    u.ID,
		TokenHash: tokenHash,
		ExpiresAt: expires,
	}); err != nil {
		return echo.NewHTTPError(http.StatusInternalServerError, "保存重置令牌失败")
	}

	if h.PasswordResetExposeLink {
		path := "/reset-password?token=" + rawToken
		var full string
		if base := strings.TrimRight(h.FrontendBaseURL, "/"); base != "" {
			full = base + path
		} else {
			full = path
		}
		out.ResetURL = &full
	}
	return apiresp.OK(c, out)
}

// ResetPassword sets a new password using a valid reset token.
func (h *Handler) ResetPassword(c echo.Context) error {
	var body resetPasswordBody
	if err := c.Bind(&body); err != nil {
		return echo.NewHTTPError(http.StatusBadRequest, "请求 JSON 格式无效")
	}
	token := strings.TrimSpace(body.Token)
	if token == "" {
		return echo.NewHTTPError(http.StatusBadRequest, "重置令牌无效")
	}
	if reason := validatePasswordOnly(body.NewPassword); reason != "" {
		return echo.NewHTTPError(http.StatusBadRequest, reason)
	}

	ctx := c.Request().Context()
	row, err := h.Q.GetValidPasswordResetToken(ctx, hashResetToken(token))
	if err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return echo.NewHTTPError(http.StatusBadRequest, "重置链接无效或已过期")
		}
		return echo.NewHTTPError(http.StatusInternalServerError, "查询重置令牌失败")
	}

	hash, err := bcrypt.GenerateFromPassword([]byte(body.NewPassword), bcryptCost)
	if err != nil {
		return echo.NewHTTPError(http.StatusInternalServerError, "密码加密失败")
	}
	tx, err := h.DB.BeginTx(ctx, nil)
	if err != nil {
		return echo.NewHTTPError(http.StatusInternalServerError, "开启事务失败")
	}
	defer func() { _ = tx.Rollback() }()

	qtx := h.Q.WithTx(tx)
	if err := qtx.UserUpdatePassword(ctx, db.UserUpdatePasswordParams{
		PasswordHash: string(hash),
		ID:           row.UserID,
	}); err != nil {
		return echo.NewHTTPError(http.StatusInternalServerError, "更新密码失败")
	}
	if err := qtx.MarkPasswordResetTokenUsed(ctx, row.ID); err != nil {
		return echo.NewHTTPError(http.StatusInternalServerError, "更新重置令牌失败")
	}
	if err := tx.Commit(); err != nil {
		return echo.NewHTTPError(http.StatusInternalServerError, "提交事务失败")
	}
	return apiresp.OK(c, map[string]string{"message": "密码已重置，请使用新密码登录"})
}

func validatePasswordOnly(password string) string {
	if len(password) < passwordMinLen {
		return "密码至少 8 位"
	}
	if len(password) > 72 {
		return "密码不能超过 72 位"
	}
	return ""
}

func newResetToken() (raw string, hash string, err error) {
	buf := make([]byte, 32)
	if _, err = rand.Read(buf); err != nil {
		return "", "", err
	}
	raw = hex.EncodeToString(buf)
	return raw, hashResetToken(raw), nil
}

func hashResetToken(raw string) string {
	sum := sha256.Sum256([]byte(raw))
	return hex.EncodeToString(sum[:])
}
