package redisclient

import (
	"context"
	"fmt"
	"log/slog"
	"net"
	"time"

	"github.com/redis/go-redis/v9"

	"linky-worker/src-go/internal/job"
)

type Client struct {
	rdb *redis.Client
}

type RedisConfig struct {
	URL      string
	Port     string
	Username string
	Password string
}

func New(ctx context.Context, cfg RedisConfig, logger *slog.Logger) (*Client, error) {
	opts, err := buildOptions(cfg)
	if err != nil {
		return nil, fmt.Errorf("redis config: %w", err)
	}

	rdb := redis.NewClient(opts)

	rdb.AddHook(&logHook{logger: logger})

	if err := rdb.Ping(ctx).Err(); err != nil {
		return nil, fmt.Errorf("redis ping failed: %w", err)
	}

	return &Client{rdb: rdb}, nil
}

func buildOptions(cfg RedisConfig) (*redis.Options, error) {
	urlStr := cfg.URL
	if urlStr != "" && isRedisURL(urlStr) {
		opts, err := redis.ParseURL(urlStr)
		if err != nil {
			return nil, fmt.Errorf("invalid REDIS_URL: %w", err)
		}
		if cfg.Username != "" {
			opts.Username = cfg.Username
		}
		if cfg.Password != "" {
			opts.Password = cfg.Password
		}
		return opts, nil
	}

	host := urlStr
	if host == "" {
		host = "localhost"
	}
	port := cfg.Port
	if port == "" {
		port = "6379"
	}

	return &redis.Options{
		Addr:     fmt.Sprintf("%s:%s", host, port),
		Username: cfg.Username,
		Password: cfg.Password,
	}, nil
}

func isRedisURL(s string) bool {
	return len(s) >= 8 && (s[:8] == "redis://" || (len(s) >= 9 && s[:9] == "rediss://"))
}

func (c *Client) BLPop(ctx context.Context, timeout time.Duration) (string, error) {
	result, err := c.rdb.BLPop(ctx, timeout, job.QueueKey).Result()
	if err == redis.Nil {
		return "", nil
	}
	if err != nil {
		return "", err
	}
	if len(result) < 2 {
		return "", fmt.Errorf("unexpected BLPop result")
	}
	return result[1], nil
}

func (c *Client) Close() error {
	return c.rdb.Close()
}

type logHook struct {
	logger *slog.Logger
}

func (h *logHook) DialHook(next redis.DialHook) redis.DialHook {
	return func(ctx context.Context, network, addr string) (net.Conn, error) {
		conn, err := next(ctx, network, addr)
		if err != nil {
			h.logger.Error("redis dial error", "network", network, "addr", addr, "error", err)
		}
		return conn, err
	}
}

func (h *logHook) ProcessHook(next redis.ProcessHook) redis.ProcessHook {
	return func(ctx context.Context, cmd redis.Cmder) error {
		err := next(ctx, cmd)
		if err != nil && err != redis.Nil {
			h.logger.Error("redis command error", "cmd", cmd.Name(), "error", err)
		}
		return err
	}
}

func (h *logHook) ProcessPipelineHook(next redis.ProcessPipelineHook) redis.ProcessPipelineHook {
	return func(ctx context.Context, cmds []redis.Cmder) error {
		err := next(ctx, cmds)
		if err != nil {
			h.logger.Error("redis pipeline error", "error", err)
		}
		return err
	}
}
