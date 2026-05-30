package userno

import (
	"crypto/rand"
	"math/big"
	"regexp"
	"strings"
)

const (
	Prefix    = "MU"
	SuffixLen = 10
	TotalLen  = 2 + SuffixLen // MU + 10 random
)

var validPattern = regexp.MustCompile(`^MU[A-Z][A-Z0-9]{9}$`)

var letters = []byte("ABCDEFGHIJKLMNOPQRSTUVWXYZ")
var alphanum = []byte("ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789")

// Generate builds MU + 10 random chars (first must be a letter).
func Generate() string {
	b := make([]byte, SuffixLen)
	b[0] = letters[randIndex(len(letters))]
	for i := 1; i < SuffixLen; i++ {
		b[i] = alphanum[randIndex(len(alphanum))]
	}
	return Prefix + string(b)
}

func randIndex(n int) int {
	v, err := rand.Int(rand.Reader, big.NewInt(int64(n)))
	if err != nil {
		panic("userno: crypto/rand failed: " + err.Error())
	}
	return int(v.Int64())
}

// Normalize uppercases a user-provided UID for lookup.
func Normalize(raw string) string {
	return strings.ToUpper(strings.TrimSpace(raw))
}

// IsValid reports whether s matches the user UID format.
func IsValid(s string) bool {
	return validPattern.MatchString(Normalize(s))
}
