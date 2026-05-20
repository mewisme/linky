package clerkx

import (
	"testing"
	"time"
)

func TestVerifyLeeway(t *testing.T) {
	if verifyLeeway != 30*time.Second {
		t.Fatalf("verifyLeeway = %v, want 30s", verifyLeeway)
	}
}

func TestExtractBearerToken(t *testing.T) {
	t.Parallel()
	tests := []struct {
		name   string
		header string
		want   string
		ok     bool
	}{
		{name: "standard bearer", header: "Bearer eyJhbG", want: "eyJhbG", ok: true},
		{name: "lowercase bearer", header: "bearer eyJhbG", want: "eyJhbG", ok: true},
		{name: "extra spaces", header: "  Bearer   eyJhbG  ", want: "eyJhbG", ok: true},
		{name: "raw jwt", header: "eyJhbGciOiJIU", want: "eyJhbGciOiJIU", ok: true},
		{name: "empty", header: "", ok: false},
		{name: "bearer only", header: "Bearer", ok: false},
		{name: "bearer whitespace", header: "Bearer   ", ok: false},
	}
	for _, tc := range tests {
		tc := tc
		t.Run(tc.name, func(t *testing.T) {
			t.Parallel()
			got, ok := ExtractBearerToken(tc.header)
			if ok != tc.ok {
				t.Fatalf("ok = %v, want %v", ok, tc.ok)
			}
			if got != tc.want {
				t.Fatalf("token = %q, want %q", got, tc.want)
			}
		})
	}
}
