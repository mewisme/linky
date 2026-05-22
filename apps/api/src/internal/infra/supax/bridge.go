package supax

import (
	"context"

	supabase "github.com/supabase-community/supabase-go"

	"linky-api/src/internal/config"
	"linky-api/src/internal/infra/supax/client"
	"linky-api/src/internal/infra/supax/rpc"
	"linky-api/src/internal/infra/supax/webhook"
)

func Init(c *config.Config) error {
	if err := client.Init(c); err != nil {
		return err
	}
	InitRPC(c)
	return nil
}

func Client() *supabase.Client {
	return client.Client()
}

func Ping(ctx context.Context) error {
	return client.Ping(ctx)
}

func InitRPC(c *config.Config) {
	rpc.Init(c)
}

func RPC(ctx context.Context, fn string, body any) ([]byte, error) {
	return rpc.Call(ctx, fn, body)
}

type WebhookOutcome = webhook.Outcome

const (
	WebhookClaimed   = webhook.Claimed
	WebhookProcessed = webhook.Processed
	WebhookBusy      = webhook.Busy
)

func TryClaimWebhookDeliveryPG(ctx context.Context, id, source string, lockSeconds int) (WebhookOutcome, error) {
	return webhook.TryClaimDelivery(ctx, id, source, lockSeconds)
}

func MarkWebhookProcessedPG(ctx context.Context, id, source string) error {
	return webhook.MarkProcessed(ctx, id, source)
}

func ReleaseWebhookProcessingPG(ctx context.Context, id string) error {
	return webhook.ReleaseProcessing(ctx, id)
}
