package config

import (
	"strings"
	"testing"
)

func TestParse_ProductionRequiresRedisURL(t *testing.T) {
	t.Setenv("NODE_ENV", "production")
	t.Setenv("REDIS_URL", "")
	t.Setenv("INTERNAL_API_BASE_URL", "http://127.0.0.1:7271")
	t.Setenv("INTERNAL_API_SOCKET_PATH", "")

	_, err := Parse()
	if err == nil {
		t.Fatal("expected error")
	}
	if !strings.Contains(err.Error(), "REDIS_URL") {
		t.Fatalf("unexpected error: %v", err)
	}
}

func TestParse_ProductionAllowsRedisURL(t *testing.T) {
	t.Setenv("NODE_ENV", "production")
	t.Setenv("REDIS_URL", "redis://redis:6379")
	t.Setenv("INTERNAL_API_BASE_URL", "http://127.0.0.1:7271")
	t.Setenv("INTERNAL_API_SOCKET_PATH", "")

	cfg, err := Parse()
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if cfg.RedisURL != "redis://redis:6379" {
		t.Fatalf("expected redis url, got %q", cfg.RedisURL)
	}
}

func TestParse_DevelopmentAllowsEmptyRedisURL(t *testing.T) {
	t.Setenv("NODE_ENV", "development")
	t.Setenv("REDIS_URL", "")
	t.Setenv("INTERNAL_API_BASE_URL", "http://127.0.0.1:7271")
	t.Setenv("INTERNAL_API_SOCKET_PATH", "")

	_, err := Parse()
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
}
