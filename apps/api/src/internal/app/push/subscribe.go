package push

import (
	"context"
	"strings"

	"linky-api/src/internal/infra/supax"
	"linky-api/src/internal/lib/pushendpoint"
)

type StatusError struct {
	Status    int
	Code      string
	KeySuffix string
	Fallback  string
}

func (e *StatusError) Error() string { return e.Fallback }

func statusErr(status int, code, keySuffix, fallback string) *StatusError {
	return &StatusError{Status: status, Code: code, KeySuffix: keySuffix, Fallback: fallback}
}

func Subscribe(ctx context.Context, userID, endpoint, p256dh, auth string) (*supax.PushSubscriptionRow, error) {
	if endpoint == "" || p256dh == "" || auth == "" {
		return nil, statusErr(400, "VALID_SUBSCRIPTION_REQUIRED", "validSubscriptionRequired", "Valid subscription object is required")
	}
	if !pushendpoint.IsAllowed(endpoint) {
		return nil, statusErr(400, "INVALID_PUSH_ENDPOINT", "invalidPushEndpoint", "Push subscription endpoint is not from an allowed push service")
	}
	row, err := supax.UpsertPushSubscription(ctx, userID, endpoint, p256dh, auth)
	if err != nil {
		return nil, statusErr(500, "FAILED_SUBSCRIBE_PUSH", "failedSubscribePush", "Failed to subscribe to push notifications")
	}
	return row, nil
}

func Unsubscribe(ctx context.Context, userID, endpoint string) error {
	ep := strings.TrimSpace(endpoint)
	if ep == "" {
		return statusErr(400, "ENDPOINT_REQUIRED", "endpointRequired", "endpoint is required")
	}
	if !pushendpoint.IsAllowed(ep) {
		return statusErr(400, "INVALID_PUSH_ENDPOINT", "invalidPushEndpoint", "Push subscription endpoint is not from an allowed push service")
	}
	if err := supax.DeletePushSubscription(ctx, userID, ep); err != nil {
		return statusErr(500, "FAILED_UNSUBSCRIBE_PUSH", "failedUnsubscribePush", "Failed to unsubscribe from push notifications")
	}
	return nil
}
