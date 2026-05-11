package main

import (
	"context"
	"log/slog"
	"os"
	"os/signal"
	"runtime"
	"runtime/debug"
	"sync/atomic"
	"syscall"
	"time"

	"linky-worker/internal/api"
	"linky-worker/internal/env"
	"linky-worker/internal/job"
	redisclient "linky-worker/internal/redis"
)

func main() {
	cfg, err := env.Parse()
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
		InternalWorkerSecret:        cfg.InternalWorkerSecret,
		InternalAPITimeoutMs:        cfg.InternalAPITimeoutMs,
		InternalAPIMaxRetries:       cfg.InternalAPIMaxRetries,
		InternalAPIRetryBaseDelayMs: cfg.InternalAPIRetryBaseDelayMs,
	}

	runLoop(ctx, rdb, apiCfg, logger, &stopping)

	logger.Info("worker stopped")
}

func runLoop(ctx context.Context, rdb *redisclient.Client, apiCfg api.EnvConfig, logger *slog.Logger, stopping *atomic.Bool) {
	var lastActivity atomic.Int64
	lastActivity.Store(time.Now().UnixMilli())

	go runIdleGC(ctx, &lastActivity, logger)

	for !stopping.Load() {
		raw, err := rdb.BLPop(ctx, 5*time.Second)
		if err != nil {
			if ctx.Err() != nil {
				return
			}
			logger.Error("redis dequeue error", "error", err)
			time.Sleep(1 * time.Second)
			continue
		}
		if raw == "" {
			continue
		}

		lastActivity.Store(time.Now().UnixMilli())

		parsed, err := job.Parse(raw)
		if err != nil {
			logger.Error("invalid job payload dropped",
				"error", err,
				"payloadBytes", len(raw),
			)
			continue
		}

		started := time.Now()
		logger.Info("job dequeued", "label", parsed.Label)

		result := api.PostEnvelope(ctx, apiCfg, parsed.Envelope, raw, logger)

		if result.OK {
			logger.Info("job completed",
				"label", parsed.Label,
				"durationMs", time.Since(started).Milliseconds(),
			)
		} else if !result.Dropped {
			logger.Error(
				"job not completed",
				"label", parsed.Label,
				"durationMs", time.Since(started).Milliseconds(),
			)
		}
	}
}

func runIdleGC(ctx context.Context, lastActivity *atomic.Int64, logger *slog.Logger) {
	ticker := time.NewTicker(30 * time.Second)
	defer ticker.Stop()
	for {
		select {
		case <-ctx.Done():
			return
		case <-ticker.C:
			idleMs := time.Now().UnixMilli() - lastActivity.Load()
			if idleMs > 30000 {
				runtime.GC()
				debug.FreeOSMemory()
				logger.Debug("idle GC triggered", "idleMs", idleMs)
			}
		}
	}
}

func initLogger(cfg *env.Config) *slog.Logger {
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
