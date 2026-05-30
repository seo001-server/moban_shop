package auth

import (
	"errors"
	"strconv"
	"time"

	"github.com/golang-jwt/jwt/v5"
)

var ErrInvalidToken = errors.New("令牌无效")

// IssueAccess mints an HS256 signed JWT with Subject = decimal user ID.
func IssueAccess(secret []byte, issuer string, userID uint64, ttl time.Duration) (jwtString string, exp time.Time, err error) {
	now := time.Now().UTC()
	exp = now.Add(ttl)

	claims := jwt.RegisteredClaims{}
	if issuer != "" {
		claims.Issuer = issuer
	}
	claims.Subject = strconv.FormatUint(userID, 10)
	claims.IssuedAt = jwt.NewNumericDate(now)
	claims.ExpiresAt = jwt.NewNumericDate(exp)

	t := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
	jwtString, err = t.SignedString(secret)
	return jwtString, exp, err
}

// ParseSubjectUserID parses and verifies a Bearer token body (without "Bearer " prefix).
func ParseSubjectUserID(secret []byte, expectIssuer string, tokenStr string) (uint64, error) {
	claims := jwt.RegisteredClaims{}
	parser := jwt.NewParser(jwt.WithValidMethods([]string{jwt.SigningMethodHS256.Alg()}))
	tok, err := parser.ParseWithClaims(tokenStr, &claims, func(*jwt.Token) (interface{}, error) {
		return secret, nil
	})
	if err != nil || !tok.Valid {
		return 0, ErrInvalidToken
	}
	if expectIssuer != "" && claims.Issuer != expectIssuer {
		return 0, ErrInvalidToken
	}

	sub := claims.Subject
	if sub == "" {
		return 0, ErrInvalidToken
	}
	id, parseErr := strconv.ParseUint(sub, 10, 64)
	if parseErr != nil {
		return 0, ErrInvalidToken
	}
	return id, nil
}
