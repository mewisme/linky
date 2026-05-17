package runtime

import (
	"context"
	"fmt"
	"log/slog"
	"runtime"
	"runtime/debug"
	"sync/atomic"
	"time"

	"linky-worker/src-go/internal/api"
	"linky-worker/src-go/internal/job"
	redisclient "linky-worker/src-go/internal/redis"
)

type queueOps interface {
	MoveToProcessing(ctx context.Context, workerID string, timeout time.Duration) (string, error)
	AckJob(ctx context.Context, workerID, raw string) error
	PushToDLQ(ctx context.Context, entry job.DLQEntry) error
}

type postEnvelopeFn func(ctx context.Context, cfg api.EnvConfig, envelope interface{}, rawRedisPayload string, logger *slog.Logger) api.Result

const maxConsecutiveJobPanics = 5

func RunJobLoop(ctx context.Context, rdb *redisclient.Client, apiCfg api.EnvConfig, workerID string, logger *slog.Logger, stopping *atomic.Bool) {
	runJobLoopWithPost(ctx, rdb, apiCfg, workerID, api.PostEnvelope, logger, stopping)
}

func runJobLoopWithPost(ctx context.Context, rdb queueOps, apiCfg api.EnvConfig, workerID string, post postEnvelopeFn, logger *slog.Logger, stopping *atomic.Bool) {
	var lastActivity atomic.Int64
	lastActivity.Store(time.Now().UnixMilli())

	go runIdleGC(ctx, &lastActivity, logger)

	var consecutivePanics int
	for !stopping.Load() {
		if processOnce(ctx, rdb, apiCfg, workerID, post, logger, stopping, &lastActivity) {
			consecutivePanics++
			if consecutivePanics >= maxConsecutiveJobPanics {
				logger.Error("too many consecutive job panics; exiting for orchestrator restart",
					"consecutivePanics", consecutivePanics,
					"threshold", maxConsecutiveJobPanics,
					"workerId", workerID,
				)
				return
			}
			continue
		}
		consecutivePanics = 0
	}
}

func processOnce(ctx context.Context, rdb queueOps, apiCfg api.EnvConfig, workerID string, post postEnvelopeFn, logger *slog.Logger, stopping *atomic.Bool, lastActivity *atomic.Int64) (panicked bool) {
	var raw string
	var label string
	defer func() {
		if r := recover(); r != nil {
			panicked = true
			logger.Error("panic in job loop",
				"panic", r,
				"stack", string(debug.Stack()),
				"label", label,
				"workerId", workerID,
			)
			if raw == "" {
				return
			}
			if label == "" {
				label = "type=unknown"
			}
			dlqEntry := job.DLQEntry{
				Raw:          raw,
				Label:        label,
				Reason:       job.DLQReasonPanic,
				ErrorMessage: fmt.Sprint(r),
				Attempts:     0,
				FailedAt:     time.Now().UTC().Format(time.RFC3339Nano),
				WorkerID:     workerID,
			}
			safePushToDLQ(ctx, rdb, dlqEntry, logger)
			safeAck(ctx, rdb, workerID, raw, logger)
		}
	}()

	raw, err := rdb.MoveToProcessing(ctx, workerID, 5*time.Second)
	if err != nil {
		if ctx.Err() != nil {
			return
		}
		logger.Error("redis dequeue error", "error", err, "workerId", workerID)
		time.Sleep(1 * time.Second)
		return
	}
	if raw == "" {
		return
	}

	lastActivity.Store(time.Now().UnixMilli())

	parsed, err := job.Parse(raw)
	if err != nil {
		logger.Error("invalid job payload dropped",
			"error", err,
			"payloadBytes", len(raw),
		)
		dlqEntry := job.DLQEntry{
			Raw:          raw,
			Label:        "type=unknown",
			Reason:       job.DLQReasonDropped,
			ErrorMessage: err.Error(),
			Attempts:     0,
			FailedAt:     time.Now().UTC().Format(time.RFC3339Nano),
			WorkerID:     workerID,
		}
		safePushToDLQ(ctx, rdb, dlqEntry, logger)
		safeAck(ctx, rdb, workerID, raw, logger)
		return
	}

	label = parsed.Label

	started := time.Now()
	logger.Info("job dequeued", "label", parsed.Label)

	result := post(ctx, apiCfg, parsed.Envelope, raw, logger)
	durationMs := time.Since(started).Milliseconds()

	if result.OK {
		logger.Info("job completed",
			"label", parsed.Label,
			"durationMs", durationMs,
		)
		safeAck(ctx, rdb, workerID, raw, logger)
		return
	}

	if stopping.Load() && ctx.Err() != nil {
		// Leave the job in the processing list; reaper will requeue when our heartbeat expires.
		return
	}

	reason := job.DLQReasonRetriesExhausted
	if result.Dropped {
		reason = job.DLQReasonDropped
	}

	logger.Error("job not completed",
		"label", parsed.Label,
		"durationMs", durationMs,
		"reason", reason,
		"lastStatus", result.LastStatus,
	)

	dlqEntry := job.DLQEntry{
		Raw:          raw,
		Label:        parsed.Label,
		Reason:       reason,
		ErrorMessage: result.ErrorMessage,
		Attempts:     result.Attempts,
		FailedAt:     time.Now().UTC().Format(time.RFC3339Nano),
		WorkerID:     workerID,
	}
	if result.LastStatus != 0 {
		status := result.LastStatus
		dlqEntry.LastStatus = &status
	}
	safePushToDLQ(ctx, rdb, dlqEntry, logger)
	safeAck(ctx, rdb, workerID, raw, logger)
	return
}

func safeAck(ctx context.Context, rdb queueOps, workerID, raw string, logger *slog.Logger) {
	ackCtx := ctx
	if ackCtx.Err() != nil {
		var cancel context.CancelFunc
		ackCtx, cancel = context.WithTimeout(context.Background(), 2*time.Second)
		defer cancel()
	}
	if err := rdb.AckJob(ackCtx, workerID, raw); err != nil {
		logger.Warn("failed to ack job from processing list", "workerId", workerID, "error", err)
	}
}

func safePushToDLQ(ctx context.Context, rdb queueOps, entry job.DLQEntry, logger *slog.Logger) {
	dlqCtx := ctx
	if dlqCtx.Err() != nil {
		var cancel context.CancelFunc
		dlqCtx, cancel = context.WithTimeout(context.Background(), 2*time.Second)
		defer cancel()
	}
	if err := rdb.PushToDLQ(dlqCtx, entry); err != nil {
		logger.Error("failed to push job to DLQ",
			"label", entry.Label,
			"reason", entry.Reason,
			"error", err,
		)
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
