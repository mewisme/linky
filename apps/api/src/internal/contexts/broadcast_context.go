package contexts

import (
	"context"
	"time"

	"linky-api/src/internal/infra/supax"
	"linky-api/src/internal/infra/webpush"
	"linky-api/src/internal/logger"
)

var broadcastLog = logger.New("context:broadcast")

func FanOutBroadcast(ctx context.Context, broadcastID, title, body string, audienceUserIDs []string) {
	if broadcastID == "" {
		return
	}
	if len(audienceUserIDs) == 0 {
		broadcastLog.Info().Str("broadcastId", broadcastID).Msg("broadcast has empty audience; skipping fan-out")
		return
	}
	for _, uid := range audienceUserIDs {
		uid := uid
		go func() {
			ctx2, cancel := contextWithDeadlineSeconds(5)
			defer cancel()
			_ = webpush.SendToUser(ctx2, uid, webpush.Payload{
				Title: title,
				Body:  body,
				Tag:   "broadcast:" + broadcastID,
				Data:  map[string]any{"broadcastId": broadcastID},
			})
		}()
	}
	_, _ = supax.PatchGeneric(ctx, "broadcasts", broadcastID, map[string]any{
		"sent_count": len(audienceUserIDs),
	})
}

func contextWithDeadlineSeconds(seconds int) (context.Context, context.CancelFunc) {
	return context.WithTimeout(context.Background(), time.Duration(seconds)*time.Second)
}
