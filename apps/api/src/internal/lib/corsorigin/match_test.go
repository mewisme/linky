package corsorigin

import "testing"

func TestNormalizeEntry(t *testing.T) {
	t.Helper()
	cases := []struct {
		in   string
		want []string
	}{
		{"*.mewis.me", []string{"http://*.mewis.me", "https://*.mewis.me"}},
		{"https://app.linkynow.site", []string{"https://app.linkynow.site"}},
		{"*", []string{"*"}},
	}
	for _, tc := range cases {
		got := NormalizeEntry(tc.in)
		if len(got) != len(tc.want) {
			t.Fatalf("NormalizeEntry(%q) = %v, want %v", tc.in, got, tc.want)
		}
		for i := range tc.want {
			if got[i] != tc.want[i] {
				t.Fatalf("NormalizeEntry(%q)[%d] = %q, want %q", tc.in, i, got[i], tc.want[i])
			}
		}
	}
}

func TestMatch(t *testing.T) {
	t.Helper()
	rules := NormalizeList([]string{"*.mewis.me", "https://app.linkynow.site", "http://localhost:3000"})
	cases := []struct {
		origin string
		want   bool
	}{
		{"https://foo.mewis.me", true},
		{"http://bar.baz.mewis.me", true},
		{"https://app.linkynow.site", true},
		{"http://localhost:3000", true},
		{"https://evil.com", false},
		{"https://mewis.me.evil.com", false},
		{"https://notlinkynow.site", false},
	}
	for _, tc := range cases {
		if Match(tc.origin, rules) != tc.want {
			t.Fatalf("Match(%q) = %v, want %v", tc.origin, !tc.want, tc.want)
		}
	}
}

func TestMatchWildcardDev(t *testing.T) {
	if !Match("https://anything.example", []string{"*"}) {
		t.Fatal("expected * to allow any origin")
	}
}
