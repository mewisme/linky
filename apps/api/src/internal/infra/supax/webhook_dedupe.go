package supax

import (
	"context"
	"encoding/json"
	"errors"
)

type WebhookOutcome string

const (
	WebhookClaimed   WebhookOutcome = "claimed"
	WebhookProcessed WebhookOutcome = "processed"
	WebhookBusy      WebhookOutcome = "busy"
)

func TryClaimWebhookDeliveryPG(ctx context.Context, id, source string, lockSeconds int) (WebhookOutcome, error) {
	if id == "" {
		return WebhookBusy, errors.New("delivery id required")
	}
	raw, err := RPC(ctx, "try_claim_webhook_delivery", map[string]any{
		"p_id":           id,
		"p_source":       source,
		"p_lock_seconds": lockSeconds,
	})
	if err != nil {
		return WebhookBusy, err
	}
	var s string
	if err := json.Unmarshal(raw, &s); err == nil && s != "" {
		return WebhookOutcome(s), nil
	}
	var arr []string
	if err := json.Unmarshal(raw, &arr); err == nil && len(arr) > 0 {
		return WebhookOutcome(arr[0]), nil
	}
	return WebhookBusy, nil
}

func MarkWebhookProcessedPG(ctx context.Context, id, source string) error {
	_, err := RPC(ctx, "mark_webhook_processed", map[string]any{
		"p_id":     id,
		"p_source": source,
	})
	return err
}

func ReleaseWebhookProcessingPG(ctx context.Context, id string) error {
	_, err := RPC(ctx, "release_webhook_processing", map[string]any{"p_id": id})
	return err
}
