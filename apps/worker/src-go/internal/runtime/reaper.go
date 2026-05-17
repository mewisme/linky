package runtime

import (
	"context"
	"log/slog"
	"sync/atomic"
	"time"

	"linky-worker/src-go/internal/job"
	redisclient "linky-worker/src-go/internal/redis"
)

func RunReaper(ctx context.Context, rdb *redisclient.Client, selfWorkerID string, logger *slog.Logger, stopping *atomic.Bool) {
	reapOnce(ctx, rdb, selfWorkerID, logger)

	ticker := time.NewTicker(job.JobReaperInterval)
	defer ticker.Stop()

	for {
		select {
		case <-ctx.Done():
			return
		case <-ticker.C:
			if stopping.Load() {
				return
			}
			reapOnce(ctx, rdb, selfWorkerID, logger)
		}
	}
}

func reapOnce(ctx context.Context, rdb *redisclient.Client, selfWorkerID string, logger *slog.Logger) {
	keys, err := rdb.ScanProcessingLists(ctx)
	if err != nil {
		if ctx.Err() == nil {
			logger.Warn("reaper scan failed", "error", err)
		}
		return
	}

	requeued := 0
	cleaned := 0

	for _, key := range keys {
		workerID, ok := job.ProcessingListWorkerID(key)
		if !ok {
			continue
		}
		if workerID == selfWorkerID {
			continue
		}

		alive, err := rdb.HeartbeatExists(ctx, workerID)
		if err != nil {
			logger.Warn("reaper heartbeat check failed", "workerId", workerID, "error", err)
			continue
		}
		if alive {
			continue
		}

		movedFromList := 0
		for movedFromList < 10000 {
			moved, err := rdb.RPopLPush(ctx, key, job.QueueKey)
			if err != nil {
				logger.Warn("reaper RPopLPush failed", "key", key, "error", err)
				break
			}
			if moved == "" {
				break
			}
			movedFromList++
		}

		if err := rdb.Del(ctx, key); err != nil {
			logger.Warn("reaper delete processing list failed", "key", key, "error", err)
			continue
		}

		requeued += movedFromList
		cleaned++
	}

	if requeued > 0 || cleaned > 0 {
		logger.Info("reaper requeued stranded jobs", "requeued", requeued, "cleaned", cleaned)
	}
}
