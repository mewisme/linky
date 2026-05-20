package redisx

import (
	"context"
	"errors"
	"fmt"
	"strconv"
	"strings"
	"sync"
	"time"

	"github.com/redis/go-redis/v9"

	"linky-api/src/internal/config"
	"linky-api/src/internal/logger"
)

var (
	cfg         *config.Config
	client      *redis.Client
	clientReady bool
	clientMu    sync.RWMutex
	log         = logger.New("infra:redis")
)

func Init(c *config.Config) {
	cfg = c
}

func Connect(ctx context.Context) error {
	if cfg == nil {
		return errors.New("redisx: config not initialized")
	}
	opts, err := buildOptions()
	if err != nil {
		return err
	}
	if opts == nil {
		return errors.New("redisx: REDIS_URL is empty; queue disabled")
	}
	c := redis.NewClient(opts)
	pingCtx, cancel := context.WithTimeout(ctx, 5*time.Second)
	defer cancel()
	if err := c.Ping(pingCtx).Err(); err != nil {
		_ = c.Close()
		return err
	}
	clientMu.Lock()
	client = c
	clientReady = true
	clientMu.Unlock()
	log.Info().Str("addr", opts.Addr).Bool("tls", opts.TLSConfig != nil).Msg("Redis connected")
	return nil
}

func buildOptions() (*redis.Options, error) {
	url := strings.TrimSpace(cfg.RedisURL)
	if url == "" {
		return nil, nil
	}

	if strings.HasPrefix(url, "redis://") || strings.HasPrefix(url, "rediss://") {
		o, err := redis.ParseURL(url)
		if err != nil {
			return nil, fmt.Errorf("redisx: invalid REDIS_URL: %w", err)
		}
		if cfg.RedisUsername != "" {
			o.Username = cfg.RedisUsername
		}
		if cfg.RedisPassword != "" {
			o.Password = cfg.RedisPassword
		}
		return o, nil
	}

	host := url
	port, _ := strconv.Atoi(cfg.RedisPort)
	if port == 0 {
		port = 6379
	}
	return &redis.Options{
		Addr:     fmt.Sprintf("%s:%d", host, port),
		Username: cfg.RedisUsername,
		Password: cfg.RedisPassword,
	}, nil
}

func Client() *redis.Client {
	clientMu.RLock()
	defer clientMu.RUnlock()
	return client
}

func IsOpen() bool {
	clientMu.RLock()
	defer clientMu.RUnlock()
	return clientReady && client != nil
}

func Close() error {
	clientMu.Lock()
	defer clientMu.Unlock()
	if client == nil {
		return nil
	}
	err := client.Close()
	client = nil
	clientReady = false
	return err
}
