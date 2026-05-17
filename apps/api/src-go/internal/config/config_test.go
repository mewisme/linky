package config

import (
	"strings"
	"testing"
)

func TestParseCorsOriginStrict_NonProduction(t *testing.T) {
	t.Helper()

	got, err := parseCorsOriginStrict("", "development")
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if len(got) != 1 || got[0] != "http://localhost:3000" {
		t.Fatalf("expected dev fallback, got %v", got)
	}

	got, err = parseCorsOriginStrict("*", "development")
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if len(got) != 1 || got[0] != "*" {
		t.Fatalf("expected wildcard passthrough, got %v", got)
	}

	got, err = parseCorsOriginStrict("wildcard", "test")
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if len(got) != 1 || got[0] != "*" {
		t.Fatalf("expected wildcard passthrough, got %v", got)
	}

	got, err = parseCorsOriginStrict("https://example.com", "development")
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if len(got) != 1 || got[0] != "https://example.com" {
		t.Fatalf("expected single origin, got %v", got)
	}
}

func TestParseCorsOriginStrict_ProductionRejects(t *testing.T) {
	cases := []struct {
		name string
		in   string
	}{
		{"unset", ""},
		{"whitespace", "   "},
		{"wildcard", "*"},
		{"wildcard-keyword", "wildcard"},
		{"wildcard-uppercase", "WILDCARD"},
		{"empty-list", ",,"},
	}
	for _, tc := range cases {
		t.Run(tc.name, func(t *testing.T) {
			_, err := parseCorsOriginStrict(tc.in, "production")
			if err == nil {
				t.Fatalf("expected error for %q in production", tc.in)
			}
			if !strings.Contains(err.Error(), "CORS_ORIGIN") {
				t.Fatalf("expected CORS_ORIGIN error, got %v", err)
			}
		})
	}
}

func TestParseCorsOriginStrict_ProductionAccepts(t *testing.T) {
	got, err := parseCorsOriginStrict("https://example.com", "production")
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if len(got) != 1 || got[0] != "https://example.com" {
		t.Fatalf("expected single origin, got %v", got)
	}

	got, err = parseCorsOriginStrict("https://a.com, https://b.com", "production")
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if len(got) != 2 || got[0] != "https://a.com" || got[1] != "https://b.com" {
		t.Fatalf("expected two origins, got %v", got)
	}
}
