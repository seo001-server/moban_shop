package businesssection

import (
	"errors"
	"strings"
)

// Valid section slugs for storefront business pages (/program, /luodi, …).
var ValidSlugs = map[string]string{
	"program":   "程序",
	"luodi":     "落地",
	"cdn":       "CDN",
	"resources": "资源",
	"monetize":  "变现",
}

func NormalizeSectionSlug(raw string) (string, error) {
	s := strings.TrimSpace(strings.ToLower(raw))
	if s == "" {
		return "", errors.New("请填写板块标识 section_slug")
	}
	if _, ok := ValidSlugs[s]; !ok {
		return "", errors.New("板块标识须为 program、luodi、cdn、resources、monetize 之一")
	}
	return s, nil
}
