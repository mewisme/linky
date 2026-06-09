package plaintext

import "testing"

func TestContainsDangerousMarkup(t *testing.T) {
	cases := []struct {
		input string
		want  bool
	}{
		{"Alice", false},
		{"<script>alert(1)</script>", true},
		{"hello <b>world</b>", true},
		{"javascript:alert(1)", true},
		{"onclick=alert(1)", true},
		{"plain\x00text", true},
	}
	for _, tc := range cases {
		if got := ContainsDangerousMarkup(tc.input); got != tc.want {
			t.Fatalf("ContainsDangerousMarkup(%q) = %v, want %v", tc.input, got, tc.want)
		}
	}
}

func TestSanitizePlainText(t *testing.T) {
	if got := SanitizePlainText("<script>x</script>", false); got != "x" {
		t.Fatalf("expected stripped text, got %q", got)
	}
	if got := SanitizePlainText("line one\nline two", true); got != "line one\nline two" {
		t.Fatalf("expected newlines preserved, got %q", got)
	}
}
