package supax

import (
	"context"
	"errors"
	"sync"

	supabase "github.com/supabase-community/supabase-go"

	"linky-api/src-go/internal/config"
	"linky-api/src-go/internal/logger"
)

var (
	cfg    *config.Config
	client *supabase.Client
	mu     sync.RWMutex
	log    = logger.New("infra:supabase:client")
)

func Init(c *config.Config) error {
	cfg = c
	if c.SupabaseURL == "" || c.SupabaseServiceRoleKey == "" {
		log.Warn().Msg("Supabase URL or service role key not configured")
		return nil
	}
	cli, err := supabase.NewClient(c.SupabaseURL, c.SupabaseServiceRoleKey, nil)
	if err != nil {
		return err
	}
	mu.Lock()
	client = cli
	mu.Unlock()
	return nil
}

func Client() *supabase.Client {
	mu.RLock()
	defer mu.RUnlock()
	return client
}

func Ping(ctx context.Context) error {
	c := Client()
	if c == nil {
		return errors.New("supabase: not initialized")
	}
	_, _, err := c.From("users").Select("id", "exact", false).Limit(1, "").Execute()
	return err
}
