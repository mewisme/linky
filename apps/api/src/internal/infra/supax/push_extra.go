package supax

import (
	"context"
	"errors"

	"linky-api/src/internal/infra/supax/pgclient"
)

func GetUserPushSubscriptions(ctx context.Context, userID string) ([]PushSubscriptionRow, error) {
	c := pgclient.Client()
	if c == nil {
		return nil, errors.New("supabase: not configured")
	}
	raw, _, err := c.From("push_subscriptions").
		Select("*", "exact", false).
		Eq("user_id", userID).
		ExecuteWithContext(ctx)
	if err != nil {
		return nil, err
	}
	return decodeMany[PushSubscriptionRow](raw)
}

func DeletePushSubscriptionByEndpoint(ctx context.Context, endpoint string) error {
	c := pgclient.Client()
	if c == nil {
		return errors.New("supabase: not configured")
	}
	_, _, err := c.From("push_subscriptions").
		Delete("", "exact").
		Eq("endpoint", endpoint).
		ExecuteWithContext(ctx)
	return err
}
