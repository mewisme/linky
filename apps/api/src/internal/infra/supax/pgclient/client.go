// Package pgclient owns the process-wide PostgREST client for Supabase.
//
// Call pgclient.Init once at startup (e.g. from main), then use pgclient.Client()
// anywhere to get the same *postgrest.Client. Table access uses the SDK directly:
//
//	c := pgclient.Client()
//	c.From("users").Select(...).ExecuteWithContext(ctx)
//
// RPC helpers delegate to postgrest.Client.RpcWithError on that shared client.
package pgclient

import (
	"context"
	"errors"
	"strings"
	"sync"

	postgrest "github.com/supabase-community/postgrest-go"

	"linky-api/src/internal/config"
	"linky-api/src/internal/logger"
)

const restPath = "/rest/v1"

var (
	cfg    *config.Config
	client *postgrest.Client
	mu     sync.RWMutex
	log    = logger.New("infra:pgclient")
)

func Init(c *config.Config) error {
	cfg = c
	if c.SupabaseURL == "" || c.SupabaseServiceRoleKey == "" {
		log.Warn().Msg("Supabase URL or service role key not configured")
		return nil
	}
	base := strings.TrimRight(c.SupabaseURL, "/") + restPath
	headers := map[string]string{
		"Authorization": "Bearer " + c.SupabaseServiceRoleKey,
		"apikey":        c.SupabaseServiceRoleKey,
	}
	cli, err := postgrest.NewClientWithError(base, "public", headers)
	if err != nil {
		return err
	}
	mu.Lock()
	client = cli
	mu.Unlock()
	return nil
}

func Client() *postgrest.Client {
	mu.RLock()
	defer mu.RUnlock()
	return client
}

func RequireClient() (*postgrest.Client, error) {
	c := Client()
	if c == nil {
		return nil, errors.New("supabase: not configured")
	}
	return c, nil
}

func Ping(ctx context.Context) error {
	c, err := RequireClient()
	if err != nil {
		return err
	}
	_, _, err = c.From("users").Select("id", "exact", false).Limit(1, "").ExecuteWithContext(ctx)
	return err
}
