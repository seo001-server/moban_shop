package admin

import "testing"

func TestArchiveExt(t *testing.T) {
	tests := []struct {
		name string
		in   string
		want string
		ok   bool
	}{
		{"zip", "template.zip", ".zip", true},
		{"rar", "pkg.RAR", ".rar", true},
		{"7z", "bundle.7z", ".7z", true},
		{"tar.gz", "src.tar.gz", ".tar.gz", true},
		{"tgz", "src.tgz", ".tgz", true},
		{"tar.bz2", "src.tar.bz2", ".tar.bz2", true},
		{"tbz2", "src.tbz2", ".tbz2", true},
		{"tar.xz", "src.tar.xz", ".tar.xz", true},
		{"txz", "src.txz", ".txz", true},
		{"tar.zst", "src.tar.zst", ".tar.zst", true},
		{"tar", "archive.tar", ".tar", true},
		{"gz only", "file.gz", ".gz", true},
		{"exe rejected", "setup.exe", "", false},
		{"empty", "", "", false},
	}

	for _, tc := range tests {
		t.Run(tc.name, func(t *testing.T) {
			got, ok := archiveExt(tc.in)
			if ok != tc.ok || got != tc.want {
				t.Fatalf("archiveExt(%q) = (%q, %v), want (%q, %v)", tc.in, got, ok, tc.want, tc.ok)
			}
		})
	}
}
