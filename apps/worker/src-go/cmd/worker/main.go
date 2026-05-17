package main

import (
	"context"
	"log/slog"
	"os"
	"os/signal"
	"sync"
	"sync/atomic"
	"syscall"

	"github.com/google/uuid"

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

	workerID := uuid.New().String()
	logger := initLogger(cfg).With("scope", "worker", "workerId", workerID)

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

	var bg sync.WaitGroup
	bg.Add(2)
	go func() {
		defer bg.Done()
		runtime.RunHeartbeat(ctx, rdb, workerID, logger, &stopping)
	}()
	go func() {
		defer bg.Done()
		runtime.RunReaper(ctx, rdb, workerID, logger, &stopping)
	}()

	runtime.RunJobLoop(ctx, rdb, apiCfg, workerID, logger, &stopping)

	bg.Wait()

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
