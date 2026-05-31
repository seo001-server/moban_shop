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

const (
	maxImageUploadBytes   = 5 << 20   // 5 MiB
	maxArchiveUploadBytes = 100 << 20 // 100 MiB
)

var allowedImageExts = map[string]struct{}{
	".jpg":  {},
	".jpeg": {},
	".png":  {},
	".gif":  {},
	".webp": {},
}

// Longer compound suffixes must appear before shorter ones.
var allowedArchiveSuffixes = []string{
	".tar.gz",
	".tar.bz2",
	".tar.xz",
	".tar.zst",
	".zip",
	".rar",
	".7z",
	".tar",
	".tgz",
	".tbz2",
	".txz",
	".gz",
	".bz2",
	".xz",
	".zst",
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

type uploadSpec struct {
	maxBytes      int64
	subDir        string
	emptyLabel    string
	sizeLimitMsg  string
	invalidExtMsg string
	resolveExt    func(filename string) (string, bool)
}

// UploadImage accepts multipart field "file" and stores it under the uploads directory.
func (h *UploadsHandler) UploadImage(c echo.Context) error {
	return h.handleUpload(c, uploadSpec{
		maxBytes:      maxImageUploadBytes,
		subDir:        "",
		emptyLabel:    "图片",
		sizeLimitMsg:  "图片不能超过 5MB",
		invalidExtMsg: "仅支持 JPG、PNG、GIF、WebP 图片",
		resolveExt:    imageExt,
	})
}

// UploadArchive accepts multipart field "file" and stores template packages under uploads/packages/.
func (h *UploadsHandler) UploadArchive(c echo.Context) error {
	return h.handleUpload(c, uploadSpec{
		maxBytes:      maxArchiveUploadBytes,
		subDir:        "packages",
		emptyLabel:    "压缩包",
		sizeLimitMsg:  "压缩包不能超过 100MB",
		invalidExtMsg: "仅支持 ZIP、RAR、7Z、TAR 及 GZ/BZ2/XZ/ZST 等常见压缩格式",
		resolveExt:    archiveExt,
	})
}

func (h *UploadsHandler) handleUpload(c echo.Context, spec uploadSpec) error {
	file, err := c.FormFile("file")
	if err != nil {
		return echo.NewHTTPError(http.StatusBadRequest, "请上传"+spec.emptyLabel+"文件")
	}
	if file.Size <= 0 {
		return echo.NewHTTPError(http.StatusBadRequest, "文件为空")
	}
	if file.Size > spec.maxBytes {
		return echo.NewHTTPError(http.StatusBadRequest, spec.sizeLimitMsg)
	}

	ext, ok := spec.resolveExt(file.Filename)
	if !ok {
		return echo.NewHTTPError(http.StatusBadRequest, spec.invalidExtMsg)
	}

	destDir := h.Dir
	urlPrefix := "/uploads/"
	if spec.subDir != "" {
		destDir = filepath.Join(h.Dir, spec.subDir)
		urlPrefix = "/uploads/" + spec.subDir + "/"
	}

	if err := os.MkdirAll(destDir, 0o755); err != nil {
		return echo.NewHTTPError(http.StatusInternalServerError, "创建上传目录失败")
	}

	name, err := randomFileName(ext)
	if err != nil {
		return echo.NewHTTPError(http.StatusInternalServerError, "生成文件名失败")
	}
	destPath := filepath.Join(destDir, name)

	src, err := file.Open()
	if err != nil {
		return echo.NewHTTPError(http.StatusBadRequest, "读取上传文件失败")
	}
	defer src.Close()

	dst, err := os.OpenFile(destPath, os.O_WRONLY|os.O_CREATE|os.O_EXCL, 0o644)
	if err != nil {
		return echo.NewHTTPError(http.StatusInternalServerError, "保存文件失败")
	}
	defer dst.Close()

	if _, err := io.Copy(dst, io.LimitReader(src, spec.maxBytes+1)); err != nil {
		_ = os.Remove(destPath)
		return echo.NewHTTPError(http.StatusInternalServerError, "保存文件失败")
	}

	url := urlPrefix + name + "?v=" + fmt.Sprintf("%d", time.Now().Unix())
	return apiresp.OK(c, uploadResponse{URL: url})
}

func imageExt(filename string) (string, bool) {
	ext := strings.ToLower(filepath.Ext(strings.TrimSpace(filename)))
	if ext == "" {
		return "", false
	}
	if _, ok := allowedImageExts[ext]; !ok {
		return "", false
	}
	return ext, true
}

func archiveExt(filename string) (string, bool) {
	lower := strings.ToLower(strings.TrimSpace(filename))
	if lower == "" {
		return "", false
	}
	for _, ext := range allowedArchiveSuffixes {
		if strings.HasSuffix(lower, ext) {
			return ext, true
		}
	}
	return "", false
}

func randomFileName(ext string) (string, error) {
	var b [16]byte
	if _, err := rand.Read(b[:]); err != nil {
		return "", err
	}
	return hex.EncodeToString(b[:]) + ext, nil
}
