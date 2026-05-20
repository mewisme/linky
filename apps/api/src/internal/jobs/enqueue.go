package jobs

import (
	"context"
	"encoding/json"
	"errors"
	"time"

	"linky-api/src/internal/infra/openaix"
	"linky-api/src/internal/infra/redisx"
	"linky-api/src/internal/logger"
	"linky-api/src/internal/sharedtypes"
)

var enqueueLog = logger.New("jobs:enqueue")

const enqueueTimeout = 5 * time.Second

// EnqueueApplyCallExp pushes an `apply_call_exp` job onto the Redis queue.
func EnqueueApplyCallExp(ctx context.Context, userID string, durationSeconds int, counterpartUserID, timezone, dateForExpToday string) error {
	if userID == "" || durationSeconds <= 0 {
		return nil
	}
	payload := map[string]any{
		"userId":          userID,
		"durationSeconds": durationSeconds,
	}
	if counterpartUserID != "" {
		payload["counterpartUserId"] = counterpartUserID
	}
	if timezone != "" {
		payload["timezone"] = timezone
	}
	if dateForExpToday != "" {
		payload["dateForExpToday"] = dateForExpToday
	}
	return push(ctx, sharedtypes.JobTypeApplyCallExp, payload)
}

// EnqueueApplyCallExpFull is the variant accepting an optional expSecondsToAdd.
func EnqueueApplyCallExpFull(ctx context.Context, userID string, durationSeconds int, expSecondsToAdd *int, counterpartUserID, timezone, dateForExpToday string) error {
	if userID == "" || durationSeconds <= 0 {
		return nil
	}
	payload := map[string]any{
		"userId":          userID,
		"durationSeconds": durationSeconds,
	}
	if expSecondsToAdd != nil && *expSecondsToAdd >= 0 {
		payload["expSecondsToAdd"] = *expSecondsToAdd
	}
	if counterpartUserID != "" {
		payload["counterpartUserId"] = counterpartUserID
	}
	if timezone != "" {
		payload["timezone"] = timezone
	}
	if dateForExpToday != "" {
		payload["dateForExpToday"] = dateForExpToday
	}
	return push(ctx, sharedtypes.JobTypeApplyCallExp, payload)
}

func EnqueueReportAISummary(ctx context.Context, reportID string, force bool) error {
	if reportID == "" {
		return nil
	}
	payload := map[string]any{
		"reportId": reportID,
		"force":    force,
	}
	return push(ctx, sharedtypes.JobTypeReportAISummary, payload)
}

func EnqueueUserEmbeddingRegenerate(ctx context.Context, userID string) error {
	if userID == "" {
		return nil
	}
	return push(ctx, sharedtypes.JobTypeUserEmbeddingRegenerate, map[string]any{"userId": userID})
}

func EnqueueUserEmbeddingRegenerateMany(ctx context.Context, userIDs []string) (enqueued int, err error) {
	if len(userIDs) == 0 {
		return 0, nil
	}
	batchSize := openaix.EmbedUserAPIBatchSize()
	for i := 0; i < len(userIDs); i += batchSize {
		end := i + batchSize
		if end > len(userIDs) {
			end = len(userIDs)
		}
		chunk := userIDs[i:end]
		if len(chunk) == 1 {
			if e := EnqueueUserEmbeddingRegenerate(ctx, chunk[0]); e == nil {
				enqueued++
			} else if err == nil {
				err = e
			}
			continue
		}
		if e := push(ctx, sharedtypes.JobTypeUserEmbeddingRegenerate, map[string]any{"userIds": chunk}); e != nil {
			if err == nil {
				err = e
			}
			continue
		}
		enqueued += len(chunk)
	}
	return enqueued, err
}

func push(ctx context.Context, jobType string, payload map[string]any) error {
	body, err := CanonicalEnvelopeJSON(jobType, payload)
	if err != nil {
		return err
	}
	c := redisx.Client()
	if c == nil {
		return errors.New("jobs: redis not connected")
	}
	cctx, cancel := context.WithTimeout(ctx, enqueueTimeout)
	defer cancel()
	if err := c.LPush(cctx, sharedtypes.JobQueueKey, body).Err(); err != nil {
		return err
	}
	enqueueLog.Info().Str("type", jobType).Msg("Job enqueued")
	return nil
}

// CanonicalEnvelopeJSON serialises a job envelope (`{ v, type, payload }`).
// Re-exported so the worker pool can derive a stable hash for logging.
func CanonicalEnvelopeJSON(jobType string, payload map[string]any) ([]byte, error) {
	if payload == nil {
		payload = map[string]any{}
	}
	envelope := map[string]any{
		"v":       1,
		"type":    jobType,
		"payload": payload,
	}
	return json.Marshal(envelope)
}

// ErrEmpty signals the queue is empty so the pool should sleep.
var ErrEmpty = errors.New("jobs: queue empty")
