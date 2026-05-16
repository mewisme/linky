package main

import (
	"context"
	"log/slog"
	"os"
	"os/signal"
	"sync/atomic"
	"syscall"

	"linky-worker/src-go/internal/api"
	"linky-worker/src-go/internal/config"
	redisclient "linky-worker/src-go/internal/redis"
	"linky-worker/src-go/internal/runtime"
)

func main() {
	cfg, err := config.Parse()
	if err != nil {
		slog.Error("invalid worker environment", "error", err)
		os.Exit(1)
	}

	logger := initLogger(cfg).With("scope", "worker")

	logger.Info("worker starting")

	ctx, cancel := context.WithCancel(context.Background())
	defer cancel()

	redisCfg := redisclient.RedisConfig{
		URL:      cfg.RedisURL,
		Port:     cfg.RedisPort,
		Username: cfg.RedisUsername,
		Password: cfg.RedisPassword,
	}

	rdb, err := redisclient.New(ctx, redisCfg, logger)
	if err != nil {
		logger.Error("failed to connect to Redis", "error", err)
		os.Exit(1)
	}
	defer rdb.Close()

	var stopping atomic.Bool

	sigCh := make(chan os.Signal, 1)
	signal.Notify(sigCh, syscall.SIGTERM, syscall.SIGINT)
	go func() {
		sig := <-sigCh
		logger.Info("worker shutdown", "signal", sig.String())
		stopping.Store(true)
		cancel()
	}()

	apiCfg := api.EnvConfig{
		InternalAPIBaseURL:          cfg.InternalAPIBaseURL,
		InternalAPISocketPath:       cfg.InternalAPISocketPath,
		InternalAPITimeoutMs:        cfg.InternalAPITimeoutMs,
		InternalAPIMaxRetries:       cfg.InternalAPIMaxRetries,
		InternalAPIRetryBaseDelayMs: cfg.InternalAPIRetryBaseDelayMs,
	}

	runtime.RunJobLoop(ctx, rdb, apiCfg, logger, &stopping)

	logger.Info("worker stopped")
}

func initLogger(cfg *config.Config) *slog.Logger {
	isDev := cfg.NodeEnv != "production"
	var handler slog.Handler

	if isDev {
		handler = slog.NewTextHandler(os.Stdout, &slog.HandlerOptions{
			Level: slog.LevelDebug,
		})
	} else {
		handler = slog.NewJSONHandler(os.Stdout, &slog.HandlerOptions{
			Level: slog.LevelInfo,
		})
	}

	return slog.New(handler)
}
