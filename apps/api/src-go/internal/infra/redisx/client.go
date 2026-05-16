package redisx

import (
	"context"
	"errors"
	"fmt"
	"strconv"
	"sync"
	"time"

	"github.com/redis/go-redis/v9"

	"linky-api/src-go/internal/config"
	"linky-api/src-go/internal/logger"
)

var (
	cfg          *config.Config
	client       *redis.Client
	clientReady  bool
	clientMu     sync.RWMutex
	log          = logger.New("infra:redis:client")
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
	c := redis.NewClient(opts)
	if err := c.Ping(ctx).Err(); err != nil {
		log.Error().Err(err).Msg("Failed to connect to Redis")
		_ = c.Close()
		return err
	}
	clientMu.Lock()
	client = c
	clientReady = true
	clientMu.Unlock()
	log.Info().Msg("Redis Client connected and ready")
	return nil
}

func buildOptions() (*redis.Options, error) {
	url := cfg.RedisURL
	if url != "" && (len(url) >= 8 && url[:8] == "redis://" || len(url) >= 9 && url[:9] == "rediss://") {
		o, err := redis.ParseURL(url)
		if err != nil {
			return nil, err
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
	if host == "" {
		host = "localhost"
	}
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

func WithTimeout[T any](ctx context.Context, name string, op func(ctx context.Context) (T, error)) (T, error) {
	var zero T
	if cfg == nil {
		return op(ctx)
	}
	timeout := time.Duration(cfg.RedisTimeoutMs) * time.Millisecond
	c, cancel := context.WithTimeout(ctx, timeout)
	defer cancel()
	res, err := op(c)
	if err != nil {
		log.Error().Err(err).Str("op", name).Msg("Redis operation failed")
		return zero, err
	}
	return res, nil
}

func WithTimeoutVoid(ctx context.Context, name string, op func(ctx context.Context) error) error {
	if cfg == nil {
		return op(ctx)
	}
	timeout := time.Duration(cfg.RedisTimeoutMs) * time.Millisecond
	c, cancel := context.WithTimeout(ctx, timeout)
	defer cancel()
	if err := op(c); err != nil {
		log.Error().Err(err).Str("op", name).Msg("Redis operation failed")
		return err
	}
	return nil
}
