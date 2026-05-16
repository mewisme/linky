package webpush

import (
	"bytes"
	"context"
	"encoding/json"
	"errors"
	"sync/atomic"

	wp "github.com/SherClockHolmes/webpush-go"

	"linky-api/src-go/internal/config"
	"linky-api/src-go/internal/infra/supax"
	"linky-api/src-go/internal/logger"
)

var (
	cfg     atomic.Pointer[config.Config]
	enabled atomic.Bool
	log     = logger.New("infra:push:webpush")
)

func Init(c *config.Config) {
	cfg.Store(c)
	enabled.Store(c.VAPIDSubject != "" && c.VAPIDPublicKey != "" && c.VAPIDPrivateKey != "")
	if !enabled.Load() {
		log.Warn().Msg("Web Push (VAPID) not configured")
	}
}

type Payload struct {
	Title string                 `json:"title"`
	Body  string                 `json:"body,omitempty"`
	Icon  string                 `json:"icon,omitempty"`
	Tag   string                 `json:"tag,omitempty"`
	Data  map[string]interface{} `json:"data,omitempty"`
}

func SendToUser(ctx context.Context, userID string, payload Payload) error {
	if !enabled.Load() {
		return nil
	}
	c := cfg.Load()
	if c == nil {
		return errors.New("webpush: not initialized")
	}
	subs, err := supax.GetUserPushSubscriptions(ctx, userID)
	if err != nil {
		return err
	}
	if len(subs) == 0 {
		return nil
	}
	body, err := json.Marshal(payload)
	if err != nil {
		return err
	}
	for _, s := range subs {
		sub := &wp.Subscription{
			Endpoint: s.Endpoint,
			Keys: wp.Keys{
				P256dh: s.P256DH,
				Auth:   s.Auth,
			},
		}
		resp, err := wp.SendNotification(body, sub, &wp.Options{
			Subscriber:      c.VAPIDSubject,
			VAPIDPublicKey:  c.VAPIDPublicKey,
			VAPIDPrivateKey: c.VAPIDPrivateKey,
			TTL:             86400,
		})
		if err != nil {
			log.Warn().Err(err).Str("endpoint", s.Endpoint).Msg("web push send failed")
			continue
		}
		if resp != nil {
			defer resp.Body.Close()
			if resp.StatusCode == 404 || resp.StatusCode == 410 {
				_ = supax.DeletePushSubscriptionByEndpoint(ctx, s.Endpoint)
			}
		}
	}
	_ = bytes.TrimSpace
	return nil
}
