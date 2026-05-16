package runtime

import (
	"context"
	"log/slog"
	"runtime"
	"runtime/debug"
	"sync/atomic"
	"time"

	"linky-worker/src/internal/api"
	"linky-worker/src/internal/job"
	redisclient "linky-worker/src/internal/redis"
)

func RunJobLoop(ctx context.Context, rdb *redisclient.Client, apiCfg api.EnvConfig, logger *slog.Logger, stopping *atomic.Bool) {
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
