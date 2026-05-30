package orderno

import (
	"crypto/rand"
	"math/big"
	"regexp"
	"strings"
	"time"
)

const (
	Prefix    = "MS"
	SuffixLen = 8
	TotalLen  = 2 + 6 + 8 // MS + YYMMDD + suffix
)

var validPattern = regexp.MustCompile(`^MS\d{6}[A-Z][A-Z0-9]{7}$`)

var letters = []byte("ABCDEFGHIJKLMNOPQRSTUVWXYZ")
var alphanum = []byte("ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789")

// Generate builds MS + YYMMDD + 8 random chars (first must be a letter).
func Generate(at time.Time) string {
	date := at.UTC().Format("060102")
	return Prefix + date + randomSuffix()
}

func randomSuffix() string {
	b := make([]byte, SuffixLen)
	b[0] = letters[randIndex(len(letters))]
	for i := 1; i < SuffixLen; i++ {
		b[i] = alphanum[randIndex(len(alphanum))]
	}
	return string(b)
}

func randIndex(n int) int {
	v, err := rand.Int(rand.Reader, big.NewInt(int64(n)))
	if err != nil {
		panic("orderno: crypto/rand failed: " + err.Error())
	}
	return int(v.Int64())
}

// Normalize uppercases a user-provided order number for lookup.
func Normalize(raw string) string {
	return strings.ToUpper(strings.TrimSpace(raw))
}

// IsValid reports whether s matches the order number format.
func IsValid(s string) bool {
	return validPattern.MatchString(Normalize(s))
}
