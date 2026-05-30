package userno

import "testing"

func TestGenerateFormat(t *testing.T) {
	no := Generate()
	if len(no) != TotalLen {
		t.Fatalf("len = %d, want %d: %q", len(no), TotalLen, no)
	}
	if no[:2] != Prefix {
		t.Fatalf("prefix = %q", no[:2])
	}
	suffix := no[2:]
	if suffix[0] < 'A' || suffix[0] > 'Z' {
		t.Fatalf("first suffix char must be letter: %q", suffix)
	}
	if !IsValid(no) {
		t.Fatalf("invalid: %q", no)
	}
}

func TestIsValid(t *testing.T) {
	cases := []struct {
		in   string
		want bool
	}{
		{"MUK7P3X9X2A8", true},
		{"muk7p3x9x2a8", true},
		{"MS260529BE62DEB3", false},
		{"MU123", false},
		{"", false},
	}
	for _, c := range cases {
		if got := IsValid(c.in); got != c.want {
			t.Errorf("IsValid(%q) = %v, want %v", c.in, got, c.want)
		}
	}
}
