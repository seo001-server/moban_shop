package orderno

import (
	"strings"
	"testing"
	"time"
)

func TestGenerateFormat(t *testing.T) {
	at := time.Date(2025, 5, 28, 12, 0, 0, 0, time.UTC)
	no := Generate(at)
	if len(no) != TotalLen {
		t.Fatalf("len = %d, want %d: %q", len(no), TotalLen, no)
	}
	if !strings.HasPrefix(no, "MS250528") {
		t.Fatalf("prefix mismatch: %q", no)
	}
	suffix := no[len("MS250528"):]
	if len(suffix) != SuffixLen {
		t.Fatalf("suffix len = %d", len(suffix))
	}
	if suffix[0] < 'A' || suffix[0] > 'Z' {
		t.Fatalf("first suffix char must be letter: %q", suffix)
	}
	if !IsValid(no) {
		t.Fatalf("generated number invalid: %q", no)
	}
}

func TestIsValid(t *testing.T) {
	cases := []struct {
		in   string
		want bool
	}{
		{"MS250528A7K3P9X2", true},
		{"ms250528a7k3p9x2", true},
		{"MS25-05-28A7K3P9X2", false},
		{"MS2505280K7P3X2M", false},
		{"", false},
	}
	for _, c := range cases {
		if got := IsValid(c.in); got != c.want {
			t.Errorf("IsValid(%q) = %v, want %v", c.in, got, c.want)
		}
	}
}
