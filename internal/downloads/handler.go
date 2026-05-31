package downloads

import (
	"database/sql"
	"errors"
	"net/http"
	"net/url"
	"os"
	"path/filepath"
	"strconv"
	"strings"

	"github.com/labstack/echo/v4"

	"moban_shop/internal/apiresp"
	"moban_shop/internal/auth"
	"moban_shop/internal/db"
)

type Handler struct {
	Q         *db.Queries
	UploadDir string
}

func NewHandler(q *db.Queries, uploadDir string) *Handler {
	return &Handler{Q: q, UploadDir: uploadDir}
}

type redirectJSON struct {
	URL string `json:"url"`
}

func (h *Handler) DownloadProduct(c echo.Context) error {
	uid, ok := auth.UserID(c)
	if !ok {
		return echo.NewHTTPError(http.StatusUnauthorized, "未登录")
	}

	productID, err := parseIDParam(c)
	if err != nil {
		return err
	}

	ctx := c.Request().Context()
	owned, err := h.Q.UserOwnsPaidProduct(ctx, db.UserOwnsPaidProductParams{
		UserID:    uid,
		ProductID: productID,
	})
	if err != nil {
		return echo.NewHTTPError(http.StatusInternalServerError, "校验购买记录失败")
	}
	if !owned {
		return echo.NewHTTPError(http.StatusForbidden, "您尚未购买该模板或订单未支付")
	}

	p, err := h.Q.GetProductByIDInternal(ctx, productID)
	if err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return echo.NewHTTPError(http.StatusNotFound, "商品不存在")
		}
		return echo.NewHTTPError(http.StatusInternalServerError, "获取商品失败")
	}
	if !p.Visible {
		return echo.NewHTTPError(http.StatusForbidden, "该模板已下架，无法下载")
	}
	if !p.DownloadUrl.Valid || strings.TrimSpace(p.DownloadUrl.String) == "" {
		return echo.NewHTTPError(http.StatusNotFound, "该模板暂未提供下载包")
	}

	raw := strings.TrimSpace(p.DownloadUrl.String)
	if isExternalURL(raw) {
		return apiresp.OK(c, redirectJSON{URL: raw})
	}

	localPath, ok := resolveLocalUploadPath(h.UploadDir, raw)
	if !ok {
		return echo.NewHTTPError(http.StatusBadRequest, "下载地址配置无效")
	}
	if _, statErr := os.Stat(localPath); statErr != nil {
		if os.IsNotExist(statErr) {
			return echo.NewHTTPError(http.StatusNotFound, "下载文件不存在")
		}
		return echo.NewHTTPError(http.StatusInternalServerError, "读取下载文件失败")
	}

	filename := downloadFilename(p.Slug, localPath)
	c.Response().Header().Set(echo.HeaderContentDisposition, "attachment; filename=\""+filename+"\"")
	return c.File(localPath)
}

func isExternalURL(raw string) bool {
	lower := strings.ToLower(raw)
	return strings.HasPrefix(lower, "http://") || strings.HasPrefix(lower, "https://")
}

func resolveLocalUploadPath(uploadDir, raw string) (string, bool) {
	s := strings.TrimSpace(raw)
	if s == "" {
		return "", false
	}
	if u, err := url.Parse(s); err == nil && u.Path != "" {
		s = u.Path
	}
	s = strings.TrimPrefix(s, "/")
	s = strings.TrimPrefix(s, "uploads/")
	s = filepath.ToSlash(filepath.Clean(s))
	if s == "" || s == "." || strings.Contains(s, "..") {
		return "", false
	}
	return filepath.Join(uploadDir, filepath.FromSlash(s)), true
}

func downloadFilename(slug, localPath string) string {
	ext := filepath.Ext(localPath)
	base := strings.TrimSpace(slug)
	if base == "" {
		base = "template"
	}
	if ext == "" {
		ext = ".zip"
	}
	return base + ext
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
