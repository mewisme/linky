package pool

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"strings"
	"sync"
	"time"

	"github.com/google/uuid"
	"github.com/redis/go-redis/v9"

	"linky-api/src/internal/config"
	"linky-api/src/internal/infra/redisx"
	"linky-api/src/internal/jobs"
	"linky-api/src/internal/logger"
	"linky-api/src/internal/sharedtypes"
	"linky-api/src/internal/worker"
)

const (
	defaultHeartbeatInterval = 10 * time.Second
	defaultReaperInterval    = 30 * time.Second
	blmoveTimeout            = 5 * time.Second
	jobExecTimeout           = 60 * time.Second
)

var poolLog = logger.New("jobs:pool")

type Pool struct {
	cfg         *config.Config
	concurrency int
	wg          sync.WaitGroup
	stopOnce    sync.Once
	stopCh      chan struct{}
}

func New(cfg *config.Config) *Pool {
	conc := cfg.JobWorkerConcurrency
	if conc <= 0 {
		conc = 4
	}
	return &Pool{
		cfg:         cfg,
		concurrency: conc,
		stopCh:      make(chan struct{}),
	}
}

func (p *Pool) Start(ctx context.Context) {
	if p == nil {
		return
	}
	if !redisx.IsOpen() {
		poolLog.Warn().Msg("Redis not connected; job pool not started")
		return
	}
	for i := 0; i < p.concurrency; i++ {
		workerID := fmt.Sprintf("worker-%d-%s", i, uuid.NewString()[:8])
		p.wg.Add(1)
		go func(id string) {
			defer p.wg.Done()
			p.runWorker(ctx, id)
		}(workerID)
		p.wg.Add(1)
		go func(id string) {
			defer p.wg.Done()
			p.runHeartbeat(ctx, id)
		}(workerID)
	}
	p.wg.Add(1)
	go func() {
		defer p.wg.Done()
		p.runReaper(ctx)
	}()
	poolLog.Info().Int("concurrency", p.concurrency).Msg("Job pool started")
}

func (p *Pool) Stop() {
	if p == nil {
		return
	}
	p.stopOnce.Do(func() { close(p.stopCh) })
	p.wg.Wait()
}

func (p *Pool) runWorker(ctx context.Context, workerID string) {
	processingKey := sharedtypes.JobProcessingListPrefix + workerID
	for {
		select {
		case <-ctx.Done():
			return
		case <-p.stopCh:
			return
		default:
		}
		c := redisx.Client()
		if c == nil {
			if !sleep(ctx, p.stopCh, 2*time.Second) {
				return
			}
			continue
		}

		blCtx, cancel := context.WithTimeout(ctx, blmoveTimeout+2*time.Second)
		raw, err := c.BLMove(blCtx, sharedtypes.JobQueueKey, processingKey, "RIGHT", "LEFT", blmoveTimeout).Result()
		cancel()
		if err != nil {
			if errors.Is(err, redis.Nil) || errors.Is(err, context.Canceled) {
				continue
			}
			if redisx.IsConnError(err) {
				if rerr := redisx.Reconnect(ctx); rerr != nil {
					poolLog.Warn().Err(rerr).Str("workerId", workerID).Msg("Redis reconnect failed")
				}
			}
			poolLog.Warn().Err(err).Str("workerId", workerID).Msg("BLMOVE failed; backing off")
			if !sleep(ctx, p.stopCh, 2*time.Second) {
				return
			}
			continue
		}
		if raw == "" {
			continue
		}
		p.process(ctx, workerID, processingKey, []byte(raw))
	}
}

func (p *Pool) process(ctx context.Context, workerID, processingKey string, raw []byte) {
	defer func() {
		if rec := recover(); rec != nil {
			err := fmt.Errorf("panic: %v", rec)
			poolLog.Error().Err(err).Str("workerId", workerID).Msg("Job worker panicked")
			p.dlq(processingKey, raw, "panic", workerID, err.Error())
		}
	}()

	var env sharedtypes.JobEnvelope
	if err := json.Unmarshal(raw, &env); err != nil {
		poolLog.Warn().Err(err).Str("workerId", workerID).Msg("Job envelope decode failed; sending to DLQ")
		p.dlq(processingKey, raw, "dropped", workerID, err.Error())
		return
	}
	poolLog.Info().Str("workerId", workerID).Str("type", env.Type).Msg("Job dequeued")

	jobCtx, cancel := context.WithTimeout(ctx, jobExecTimeout)
	defer cancel()

	outcome, errMsg := p.dispatch(jobCtx, env, raw)
	switch outcome {
	case outcomeAck:
		poolLog.Info().Str("workerId", workerID).Str("type", env.Type).Msg("Job completed")
		if err := ackJob(processingKey, raw); err != nil {
			poolLog.Warn().Err(err).Str("workerId", workerID).Msg("LREM ack failed; will be reaped")
		}
	case outcomeDLQ:
		p.dlq(processingKey, raw, "dropped", workerID, errMsg)
	case outcomeRetry:
		poolLog.Warn().Str("workerId", workerID).Str("type", env.Type).Str("err", errMsg).Msg("Job exec failed; leaving for reaper to requeue")
	}
}

type jobOutcome int

const (
	outcomeAck jobOutcome = iota
	outcomeRetry
	outcomeDLQ
)

func (p *Pool) dispatch(ctx context.Context, env sharedtypes.JobEnvelope, raw []byte) (jobOutcome, string) {
	switch env.Type {
	case sharedtypes.JobTypeReportAISummary:
		var payload struct {
			ReportID string `json:"reportId"`
			Force    bool   `json:"force"`
		}
		if err := json.Unmarshal(extractPayload(raw), &payload); err != nil {
			return outcomeDLQ, err.Error()
		}
		if payload.ReportID == "" {
			return outcomeDLQ, "reportId required"
		}
		if err := worker.ExecuteReportAISummary(ctx, payload.ReportID, payload.Force); err != nil {
			return outcomeRetry, err.Error()
		}
	case sharedtypes.JobTypeUserEmbeddingRegenerate:
		var payload struct {
			UserID  string   `json:"userId"`
			UserIDs []string `json:"userIds"`
		}
		if err := json.Unmarshal(extractPayload(raw), &payload); err != nil {
			return outcomeDLQ, err.Error()
		}
		if len(payload.UserIDs) > 0 {
			if err := worker.ExecuteUserEmbeddingRegenerateBatch(ctx, payload.UserIDs); err != nil {
				return outcomeRetry, err.Error()
			}
		} else if payload.UserID == "" {
			return outcomeDLQ, "userId or userIds required"
		} else if err := worker.ExecuteUserEmbeddingRegenerate(ctx, payload.UserID); err != nil {
			return outcomeRetry, err.Error()
		}
	case sharedtypes.JobTypeApplyCallExp:
		var p worker.ApplyCallExpPayload
		if err := json.Unmarshal(extractPayload(raw), &p); err != nil {
			return outcomeDLQ, err.Error()
		}
		if p.UserID == "" || p.DurationSeconds <= 0 {
			return outcomeDLQ, "invalid apply_call_exp payload"
		}
		if err := worker.ExecuteApplyCallExp(ctx, p); err != nil {
			return outcomeRetry, err.Error()
		}
	default:
		return outcomeDLQ, "unknown job type: " + env.Type
	}
	return outcomeAck, ""
}

func extractPayload(raw []byte) []byte {
	var wrap struct {
		Payload json.RawMessage `json:"payload"`
	}
	if err := json.Unmarshal(raw, &wrap); err != nil {
		return []byte("{}")
	}
	if len(wrap.Payload) == 0 {
		return []byte("{}")
	}
	return wrap.Payload
}

func ackJob(processingKey string, raw []byte) error {
	c := redisx.Client()
	if c == nil {
		return errors.New("redisx: not connected")
	}
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()
	return c.LRem(ctx, processingKey, 1, raw).Err()
}

func (p *Pool) dlq(processingKey string, raw []byte, reason, workerID, errMsg string) {
	c := redisx.Client()
	if c == nil {
		return
	}
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()
	jobType := ""
	if env, err := decodeEnvelope(raw); err == nil {
		jobType = env.Type
	}
	entry := sharedtypes.JobDlqEntry{
		V:        1,
		Reason:   reason,
		Type:     jobType,
		Envelope: raw,
		Error:    errMsg,
		WorkerID: workerID,
		At:       time.Now().UnixMilli(),
	}
	body, err := json.Marshal(entry)
	if err != nil {
		poolLog.Warn().Err(err).Msg("Failed to encode DLQ entry")
		return
	}
	if err := c.LPush(ctx, sharedtypes.JobDLQKey, body).Err(); err != nil {
		poolLog.Warn().Err(err).Msg("LPUSH to DLQ failed")
	}
	if err := c.LRem(ctx, processingKey, 1, raw).Err(); err != nil {
		poolLog.Warn().Err(err).Msg("LREM after DLQ failed")
	}
}

func decodeEnvelope(raw []byte) (sharedtypes.JobEnvelope, error) {
	var env sharedtypes.JobEnvelope
	err := json.Unmarshal(raw, &env)
	return env, err
}

func (p *Pool) runHeartbeat(ctx context.Context, workerID string) {
	t := time.NewTicker(defaultHeartbeatInterval)
	defer t.Stop()
	key := sharedtypes.WorkerHeartbeatPrefix + workerID
	ttl := time.Duration(sharedtypes.WorkerHeartbeatTTLSeconds) * time.Second
	refreshHeartbeat(key, ttl)
	for {
		select {
		case <-ctx.Done():
			clearHeartbeat(key)
			return
		case <-p.stopCh:
			clearHeartbeat(key)
			return
		case <-t.C:
			refreshHeartbeat(key, ttl)
		}
	}
}

func refreshHeartbeat(key string, ttl time.Duration) {
	c := redisx.Client()
	if c == nil {
		return
	}
	ctx, cancel := context.WithTimeout(context.Background(), 3*time.Second)
	defer cancel()
	if err := c.Set(ctx, key, "1", ttl).Err(); err != nil {
		if redisx.IsConnError(err) {
			_ = redisx.Reconnect(ctx)
		}
		poolLog.Warn().Err(err).Str("key", key).Msg("Heartbeat SET failed")
	}
}

func clearHeartbeat(key string) {
	c := redisx.Client()
	if c == nil {
		return
	}
	ctx, cancel := context.WithTimeout(context.Background(), 3*time.Second)
	defer cancel()
	_ = c.Del(ctx, key).Err()
}

func (p *Pool) runReaper(ctx context.Context) {
	t := time.NewTicker(defaultReaperInterval)
	defer t.Stop()
	for {
		select {
		case <-ctx.Done():
			return
		case <-p.stopCh:
			return
		case <-t.C:
			p.reapOnce(ctx)
		}
	}
}

func (p *Pool) reapOnce(ctx context.Context) {
	c := redisx.Client()
	if c == nil {
		return
	}
	scanCtx, cancel := context.WithTimeout(ctx, 10*time.Second)
	defer cancel()
	var cursor uint64
	for {
		keys, next, err := c.Scan(scanCtx, cursor, sharedtypes.JobProcessingListPrefix+"*", 100).Result()
		if err != nil {
			if redisx.IsConnError(err) {
				_ = redisx.Reconnect(ctx)
			}
			poolLog.Warn().Err(err).Msg("Reaper SCAN failed")
			return
		}
		for _, key := range keys {
			workerID := strings.TrimPrefix(key, sharedtypes.JobProcessingListPrefix)
			if workerID == "" {
				continue
			}
			alive, err := c.Exists(scanCtx, sharedtypes.WorkerHeartbeatPrefix+workerID).Result()
			if err != nil {
				poolLog.Warn().Err(err).Str("workerId", workerID).Msg("Reaper EXISTS failed")
				continue
			}
			if alive == 1 {
				continue
			}
			poolLog.Warn().Str("workerId", workerID).Msg("Reaping orphaned processing list")
			for {
				rotateCtx, rcancel := context.WithTimeout(ctx, 5*time.Second)
				moved, err := c.RPopLPush(rotateCtx, key, sharedtypes.JobQueueKey).Result()
				rcancel()
				if err != nil {
					if errors.Is(err, redis.Nil) {
						break
					}
					poolLog.Warn().Err(err).Str("workerId", workerID).Msg("Reaper RPOPLPUSH failed")
					break
				}
				if moved == "" {
					break
				}
			}
			delCtx, dcancel := context.WithTimeout(ctx, 3*time.Second)
			_ = c.Del(delCtx, key).Err()
			dcancel()
		}
		if next == 0 {
			return
		}
		cursor = next
	}
}

func sleep(ctx context.Context, stop <-chan struct{}, d time.Duration) bool {
	if d <= 0 {
		return true
	}
	t := time.NewTimer(d)
	defer t.Stop()
	select {
	case <-ctx.Done():
		return false
	case <-stop:
		return false
	case <-t.C:
		return true
	}
}

var ErrPoolClosed = errors.New("pool: closed")

var _ = jobs.CanonicalEnvelopeJSON
