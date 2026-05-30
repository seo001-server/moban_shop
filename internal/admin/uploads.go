package admin

import (
	"crypto/rand"
	"encoding/hex"
	"fmt"
	"io"
	"net/http"
	"os"
	"path/filepath"
	"strings"
	"time"

	"github.com/labstack/echo/v4"

	"moban_shop/internal/apiresp"
)

const maxUploadBytes = 5 << 20 // 5 MiB

var allowedImageExts = map[string]struct{}{
	".jpg":  {},
	".jpeg": {},
	".png":  {},
	".gif":  {},
	".webp": {},
}

type UploadsHandler struct {
	Dir string
}

func NewUploadsHandler(dir string) *UploadsHandler {
	return &UploadsHandler{Dir: dir}
}

type uploadResponse struct {
	URL string `json:"url"`
}

// UploadImage accepts multipart field "file" and stores it under the uploads directory.
func (h *UploadsHandler) UploadImage(c echo.Context) error {
	file, err := c.FormFile("file")
	if err != nil {
		return echo.NewHTTPError(http.StatusBadRequest, "请上传图片文件")
	}
	if file.Size <= 0 {
		return echo.NewHTTPError(http.StatusBadRequest, "文件为空")
	}
	if file.Size > maxUploadBytes {
		return echo.NewHTTPError(http.StatusBadRequest, "图片不能超过 5MB")
	}

	ext := strings.ToLower(filepath.Ext(file.Filename))
	if _, ok := allowedImageExts[ext]; !ok {
		return echo.NewHTTPError(http.StatusBadRequest, "仅支持 JPG、PNG、GIF、WebP 图片")
	}

	if err := os.MkdirAll(h.Dir, 0o755); err != nil {
		return echo.NewHTTPError(http.StatusInternalServerError, "创建上传目录失败")
	}

	name, err := randomFileName(ext)
	if err != nil {
		return echo.NewHTTPError(http.StatusInternalServerError, "生成文件名失败")
	}
	destPath := filepath.Join(h.Dir, name)

	src, err := file.Open()
	if err != nil {
		return echo.NewHTTPError(http.StatusBadRequest, "读取上传文件失败")
	}
	defer src.Close()

	dst, err := os.OpenFile(destPath, os.O_WRONLY|os.O_CREATE|os.O_EXCL, 0o644)
	if err != nil {
		return echo.NewHTTPError(http.StatusInternalServerError, "保存图片失败")
	}
	defer dst.Close()

	if _, err := io.Copy(dst, io.LimitReader(src, maxUploadBytes+1)); err != nil {
		_ = os.Remove(destPath)
		return echo.NewHTTPError(http.StatusInternalServerError, "保存图片失败")
	}

	url := "/uploads/" + name + "?v=" + fmt.Sprintf("%d", time.Now().Unix())
	return apiresp.OK(c, uploadResponse{URL: url})
}

func randomFileName(ext string) (string, error) {
	var b [16]byte
	if _, err := rand.Read(b[:]); err != nil {
		return "", err
	}
	return hex.EncodeToString(b[:]) + ext, nil
}
