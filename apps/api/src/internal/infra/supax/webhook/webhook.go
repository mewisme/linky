package webhook

import (
	"context"
	"encoding/json"
	"errors"

	"linky-api/src/internal/infra/supax/rpc"
)

type Outcome string

const (
	Claimed   Outcome = "claimed"
	Processed Outcome = "processed"
	Busy      Outcome = "busy"
)

func TryClaimDelivery(ctx context.Context, id, source string, lockSeconds int) (Outcome, error) {
	if id == "" {
		return Busy, errors.New("delivery id required")
	}
	raw, err := rpc.Call(ctx, "try_claim_webhook_delivery", map[string]any{
		"p_id":           id,
		"p_source":       source,
		"p_lock_seconds": lockSeconds,
	})
	if err != nil {
		return Busy, err
	}
	var s string
	if err := json.Unmarshal(raw, &s); err == nil && s != "" {
		return Outcome(s), nil
	}
	var arr []string
	if err := json.Unmarshal(raw, &arr); err == nil && len(arr) > 0 {
		return Outcome(arr[0]), nil
	}
	return Busy, nil
}

func MarkProcessed(ctx context.Context, id, source string) error {
	_, err := rpc.Call(ctx, "mark_webhook_processed", map[string]any{
		"p_id":     id,
		"p_source": source,
	})
	return err
}

func ReleaseProcessing(ctx context.Context, id string) error {
	_, err := rpc.Call(ctx, "release_webhook_processing", map[string]any{"p_id": id})
	return err
}
