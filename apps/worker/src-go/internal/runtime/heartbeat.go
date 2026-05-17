package runtime

import (
	"context"
	"log/slog"
	"sync/atomic"
	"time"

	"linky-worker/src-go/internal/job"
	redisclient "linky-worker/src-go/internal/redis"
)

func RunHeartbeat(ctx context.Context, rdb *redisclient.Client, workerID string, logger *slog.Logger, stopping *atomic.Bool) {
	if err := rdb.RefreshHeartbeat(ctx, workerID); err != nil {
		logger.Warn("heartbeat refresh failed", "workerId", workerID, "error", err)
	}

	ticker := time.NewTicker(job.WorkerHeartbeatRefresh)
	defer ticker.Stop()

	for {
		select {
		case <-ctx.Done():
			clearCtx, cancel := context.WithTimeout(context.Background(), 2*time.Second)
			if err := rdb.ClearHeartbeat(clearCtx, workerID); err != nil {
				logger.Warn("heartbeat clear failed", "workerId", workerID, "error", err)
			}
			cancel()
			return
		case <-ticker.C:
			if stopping.Load() {
				continue
			}
			if err := rdb.RefreshHeartbeat(ctx, workerID); err != nil {
				logger.Warn("heartbeat refresh failed", "workerId", workerID, "error", err)
			}
		}
	}
}
