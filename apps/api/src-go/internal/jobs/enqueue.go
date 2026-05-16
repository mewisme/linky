package jobs

import (
	"context"
	"encoding/json"
	"errors"
	"time"

	"linky-api/src-go/internal/infra/redisx"
	"linky-api/src-go/internal/sharedtypes"
)

func EnqueueApplyCallExp(ctx context.Context, userID string, durationSeconds int, counterpartUserID, timezone, dateForExpToday string) error {
	if userID == "" || durationSeconds <= 0 {
		return nil
	}
	c := redisx.Client()
	if c == nil {
		return errors.New("redis not connected")
	}
	envelope := map[string]any{
		"v":    1,
		"type": sharedtypes.JobTypeApplyCallExp,
		"payload": map[string]any{
			"userId":            userID,
			"durationSeconds":   durationSeconds,
			"counterpartUserId": optString(counterpartUserID),
			"timezone":          optString(timezone),
			"dateForExpToday":   optString(dateForExpToday),
		},
	}
	body, err := json.Marshal(envelope)
	if err != nil {
		return err
	}
	ctx2, cancel := context.WithTimeout(ctx, 5*time.Second)
	defer cancel()
	return c.LPush(ctx2, sharedtypes.JobQueueKey, body).Err()
}

func EnqueueReportAISummary(ctx context.Context, reportID string, force bool) error {
	if reportID == "" {
		return nil
	}
	c := redisx.Client()
	if c == nil {
		return errors.New("redis not connected")
	}
	envelope := map[string]any{
		"v":    1,
		"type": sharedtypes.JobTypeReportAISummary,
		"payload": map[string]any{
			"reportId": reportID,
			"force":    force,
		},
	}
	body, err := json.Marshal(envelope)
	if err != nil {
		return err
	}
	ctx2, cancel := context.WithTimeout(ctx, 5*time.Second)
	defer cancel()
	return c.LPush(ctx2, sharedtypes.JobQueueKey, body).Err()
}

func EnqueueUserEmbeddingRegenerate(ctx context.Context, userID string) error {
	if userID == "" {
		return nil
	}
	c := redisx.Client()
	if c == nil {
		return errors.New("redis not connected")
	}
	envelope := map[string]any{
		"v":    1,
		"type": sharedtypes.JobTypeUserEmbeddingRegenerate,
		"payload": map[string]any{
			"userId": userID,
		},
	}
	body, err := json.Marshal(envelope)
	if err != nil {
		return err
	}
	ctx2, cancel := context.WithTimeout(ctx, 5*time.Second)
	defer cancel()
	return c.LPush(ctx2, sharedtypes.JobQueueKey, body).Err()
}

func optString(s string) any {
	if s == "" {
		return nil
	}
	return s
}
