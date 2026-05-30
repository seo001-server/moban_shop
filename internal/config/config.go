package config

import (
	"fmt"
	"os"
	"strconv"
	"strings"
	"time"
)

// Config loads process environment variables for the HTTP API and datastore.
type Config struct {
	HTTPAddr     string        // e.g. ":8080"
	DatabaseDSN  string        // e.g. user:pass@tcp(127.0.0.1:3306)/moban_shop?parseTime=true&loc=UTC
	AllowOrigins string        // comma-separated, "*" for development
	JWTSecret    string        // HS256 signing key for storefront users
	JWTIssuer    string        // optional claim issuer ("iss") for user JWT
	JWTAccessTTL time.Duration // user access token lifetime

	JWTAdminSecret    string        // HS256 key for admin-only JWT (must differ from JWTSecret)
	JWTAdminIssuer    string        // iss for admin JWT
	JWTAdminAccessTTL time.Duration // admin access token lifetime
}

func Load() Config {
	httpAddr := getEnv("HTTP_ADDR", ":8080")
	ds := os.Getenv("DATABASE_DSN")
	origins := getEnv("ALLOW_ORIGINS", "*")
	jwtSecret := strings.TrimSpace(os.Getenv("JWT_SECRET"))
	issuer := getEnv("JWT_ISSUER", "moban_shop")
	ttl := parseTTLSeconds(getEnv("JWT_ACCESS_TTL_SECONDS", "86400"))

	adminSecret := strings.TrimSpace(os.Getenv("JWT_ADMIN_SECRET"))
	adminIssuer := getEnv("JWT_ADMIN_ISSUER", "moban_shop_admin")
	adminTTLRaw := getEnv("JWT_ADMIN_ACCESS_TTL_SECONDS", "")
	var adminTTL time.Duration
	if strings.TrimSpace(adminTTLRaw) == "" {
		adminTTL = ttl
	} else {
		adminTTL = parseTTLSeconds(adminTTLRaw)
	}

	return Config{
		HTTPAddr:          httpAddr,
		DatabaseDSN:       ds,
		AllowOrigins:      origins,
		JWTSecret:         jwtSecret,
		JWTIssuer:         issuer,
		JWTAccessTTL:      ttl,
		JWTAdminSecret:    adminSecret,
		JWTAdminIssuer:    adminIssuer,
		JWTAdminAccessTTL: adminTTL,
	}
}

func parseTTLSeconds(s string) time.Duration {
	n, err := strconv.Atoi(strings.TrimSpace(s))
	if err != nil || n <= 0 {
		return 24 * time.Hour
	}
	const maxSeconds = int(30 * 24 * time.Hour / time.Second) // cap at 30d
	if n > maxSeconds {
		n = maxSeconds
	}
	return time.Duration(n) * time.Second
}

// Validate returns an error describing missing mandatory settings.
func (c Config) Validate() error {
	switch {
	case c.DatabaseDSN == "":
		return fmt.Errorf("必须配置 DATABASE_DSN")
	case c.JWTSecret == "":
		return fmt.Errorf("必须配置 JWT_SECRET")
	case len(c.JWTSecret) < 16:
		return fmt.Errorf("JWT_SECRET 至少 16 个字符（建议 32 位以上随机字符串）")
	case c.JWTAdminSecret == "":
		return fmt.Errorf("必须配置 JWT_ADMIN_SECRET")
	case len(c.JWTAdminSecret) < 16:
		return fmt.Errorf("JWT_ADMIN_SECRET 至少 16 个字符（建议 32 位以上随机字符串）")
	case c.JWTAdminSecret == c.JWTSecret:
		return fmt.Errorf("JWT_ADMIN_SECRET 不能与 JWT_SECRET 相同")
	}
	return nil
}

func getEnv(key, def string) string {
	if v := os.Getenv(key); v != "" {
		return v
	}
	return def
}
