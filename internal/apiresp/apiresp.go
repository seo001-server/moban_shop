package apiresp

import (
	"net/http"

	"github.com/labstack/echo/v4"
)

const (
	CodeOK  = 200
	CodeErr = -1
)

// Response is the unified API envelope: { code, data, message }.
// HTTP status is always 200; use code to distinguish success (200) from failure (-1).
type Response struct {
	Code    int         `json:"code"`
	Data    interface{} `json:"data"`
	Message string      `json:"message"`
}

func OK(c echo.Context, data interface{}) error {
	return c.JSON(http.StatusOK, Response{
		Code:    CodeOK,
		Data:    data,
		Message: "",
	})
}

func Fail(c echo.Context, message string) error {
	return c.JSON(http.StatusOK, Response{
		Code:    CodeErr,
		Data:    nil,
		Message: message,
	})
}

func httpStatusMessage(code int) string {
	switch code {
	case http.StatusBadRequest:
		return "请求无效"
	case http.StatusUnauthorized:
		return "未授权"
	case http.StatusForbidden:
		return "禁止访问"
	case http.StatusNotFound:
		return "资源不存在"
	case http.StatusConflict:
		return "操作冲突"
	case http.StatusInternalServerError:
		return "服务器内部错误"
	case http.StatusServiceUnavailable:
		return "服务不可用"
	default:
		return "请求失败"
	}
}

// ErrorMessage extracts a user-facing string from echo.HTTPError or generic errors.
func ErrorMessage(err error) string {
	if he, ok := err.(*echo.HTTPError); ok {
		if s, ok := he.Message.(string); ok && s != "" {
			return s
		}
		if he.Code >= 400 {
			return httpStatusMessage(he.Code)
		}
	}
	if err != nil && err.Error() != "" {
		return err.Error()
	}
	return "服务器内部错误"
}
