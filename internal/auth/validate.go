package auth

import (
	"net/mail"
	"strings"
)

const passwordMinLen = 8

// NormalizeEmail trims spaces and lowercases the whole address (acceptable for MVP; punycode not handled specially).
func NormalizeEmail(s string) string {
	s = strings.TrimSpace(s)
	s = strings.ToLower(s)
	return s
}

// ValidateCredentials returns a short reason if invalid.
func ValidateCredentials(email, password string) string {
	e := NormalizeEmail(email)
	if e == "" {
		return "请填写邮箱"
	}
	addr, err := mail.ParseAddress(e)
	if err != nil || addr.Address != e {
		return "邮箱格式无效"
	}

	if len(password) < passwordMinLen {
		return "密码至少 8 位"
	}
	if len(password) > 72 {
		return "密码不能超过 72 位"
	}

	return ""
}
