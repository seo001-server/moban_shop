package auth

import (
	"database/sql"
	"errors"
	"net/http"
	"strings"
	"time"

	"github.com/labstack/echo/v4"
	"golang.org/x/crypto/bcrypt"

	"moban_shop/internal/apiresp"
	"moban_shop/internal/db"
)

const bcryptCost = bcrypt.DefaultCost

type Handler struct {
	Q         *db.Queries
	JWTSecret []byte
	JWTIssuer string
	AccessTTL time.Duration
}

func NewHandler(q *db.Queries, secret []byte, issuer string, accessTTL time.Duration) *Handler {
	return &Handler{
		Q:         q,
		JWTSecret: secret,
		JWTIssuer: issuer,
		AccessTTL: accessTTL,
	}
}

type credentialsBody struct {
	Email    string `json:"email"`
	Password string `json:"password"`
}

type tokenResponse struct {
	AccessToken string `json:"access_token"`
	TokenType   string `json:"token_type"`
	ExpiresIn   int64  `json:"expires_in"`
}

type userPublic struct {
	ID        uint64    `json:"id"`
	Email     string    `json:"email"`
	CreatedAt time.Time `json:"created_at"`
}

type meResponse struct {
	User userPublic `json:"user"`
}

func (h *Handler) Register(c echo.Context) error {
	var body credentialsBody
	if err := c.Bind(&body); err != nil {
		return echo.NewHTTPError(http.StatusBadRequest, "请求 JSON 格式无效")
	}

	if reason := ValidateCredentials(body.Email, body.Password); reason != "" {
		return echo.NewHTTPError(http.StatusBadRequest, reason)
	}
	email := NormalizeEmail(body.Email)

	ctx := c.Request().Context()
	if _, err := h.Q.GetUserByEmail(ctx, email); err == nil {
		return echo.NewHTTPError(http.StatusConflict, "该邮箱已注册")
	} else if !errors.Is(err, sql.ErrNoRows) {
		return echo.NewHTTPError(http.StatusInternalServerError, "查询用户失败")
	}

	hash, err := bcrypt.GenerateFromPassword([]byte(body.Password), bcryptCost)
	if err != nil {
		return echo.NewHTTPError(http.StatusInternalServerError, "密码加密失败")
	}

	res, err := h.Q.CreateUser(ctx, db.CreateUserParams{
		Email:        email,
		PasswordHash: string(hash),
	})
	if err != nil {
		if isDuplicateKey(err) {
			return echo.NewHTTPError(http.StatusConflict, "该邮箱已注册")
		}
		return echo.NewHTTPError(http.StatusInternalServerError, "创建用户失败")
	}

	insertID, err := res.LastInsertId()
	if err != nil || insertID <= 0 {
		user, gerr := h.Q.GetUserByEmail(ctx, email)
		if gerr != nil {
			return echo.NewHTTPError(http.StatusInternalServerError, "创建后查询用户失败")
		}
		return h.respondToken(c, http.StatusCreated, user.ID)
	}

	return h.respondToken(c, http.StatusCreated, uint64(insertID))
}

func (h *Handler) Login(c echo.Context) error {
	var body credentialsBody
	if err := c.Bind(&body); err != nil {
		return echo.NewHTTPError(http.StatusBadRequest, "请求 JSON 格式无效")
	}

	body.Email = NormalizeEmail(strings.TrimSpace(body.Email))
	unauth := echo.NewHTTPError(http.StatusUnauthorized, "账号或密码错误")
	if body.Email == "" || !strings.Contains(body.Email, "@") {
		return unauth
	}

	ctx := c.Request().Context()
	u, err := h.Q.GetUserByEmail(ctx, body.Email)
	if err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return unauth
		}
		return echo.NewHTTPError(http.StatusInternalServerError, "查询用户失败")
	}

	if err := bcrypt.CompareHashAndPassword([]byte(u.PasswordHash), []byte(body.Password)); err != nil {
		return unauth
	}

	return h.respondToken(c, http.StatusOK, u.ID)
}

func (h *Handler) respondToken(c echo.Context, status int, userID uint64) error {
	tr, err := h.mintToken(userID)
	if err != nil {
		return echo.NewHTTPError(http.StatusInternalServerError, "签发令牌失败")
	}
	return apiresp.OK(c, tr)
}

func (h *Handler) mintToken(userID uint64) (tokenResponse, error) {
	sec := int64(h.AccessTTL / time.Second)
	if sec <= 0 {
		sec = 1
	}
	tok, _, err := IssueAccess(h.JWTSecret, h.JWTIssuer, userID, h.AccessTTL)
	if err != nil {
		return tokenResponse{}, err
	}
	return tokenResponse{
		AccessToken: tok,
		TokenType:   "Bearer",
		ExpiresIn:   sec,
	}, nil
}

// Me returns the current user profile (no password fields).
func (h *Handler) Me(c echo.Context) error {
	uid, ok := UserID(c)
	if !ok {
		return echo.NewHTTPError(http.StatusUnauthorized, "未登录")
	}

	ctx := c.Request().Context()
	u, err := h.Q.GetUserByID(ctx, uid)
	if err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return echo.NewHTTPError(http.StatusUnauthorized, "用户不存在")
		}
		return echo.NewHTTPError(http.StatusInternalServerError, "查询用户失败")
	}

	return apiresp.OK(c, meResponse{
		User: userPublic{
			ID:        u.ID,
			Email:     u.Email,
			CreatedAt: u.CreatedAt.UTC(),
		},
	})
}
