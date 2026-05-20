package contexts

import (
	"context"
	"encoding/json"
	"sync"
	"time"

	"linky-api/src/internal/infra/webpush"
	"linky-api/src/internal/logger"
)

var (
	peerLog       = logger.New("context:peer-action-notification")
	debounceMu    sync.Mutex
	debounceUntil = make(map[string]time.Time)
)

const peerDebounceDuration = 30 * time.Second

func SendPeerActionPush(ctx context.Context, peerUserID string, action, fromUserName string, extra map[string]any) {
	if peerUserID == "" {
		return
	}
	if !shouldSend(peerUserID, action) {
		return
	}
	title := titleFor(action, fromUserName)
	body := bodyFor(action, fromUserName)
	dataMap := map[string]any{
		"action": action,
		"from":   fromUserName,
	}
	for k, v := range extra {
		dataMap[k] = v
	}
	go func() {
		ctx2, cancel := context.WithTimeout(context.Background(), 5*time.Second)
		defer cancel()
		if err := webpush.SendToUser(ctx2, peerUserID, webpush.Payload{
			Title: title,
			Body:  body,
			Tag:   action + ":" + peerUserID,
			Data:  dataMap,
		}); err != nil {
			peerLog.Warn().Err(err).Str("peerUserId", peerUserID).Str("action", action).Msg("peer push failed")
		}
	}()
}

func shouldSend(peerUserID, action string) bool {
	key := peerUserID + ":" + action
	debounceMu.Lock()
	defer debounceMu.Unlock()
	now := time.Now()
	if exp, ok := debounceUntil[key]; ok && now.Before(exp) {
		return false
	}
	debounceUntil[key] = now.Add(peerDebounceDuration)
	if len(debounceUntil) > 1000 {
		for k, v := range debounceUntil {
			if now.After(v) {
				delete(debounceUntil, k)
			}
		}
	}
	return true
}

func titleFor(action, name string) string {
	switch action {
	case "matched":
		return "Matched on Linky"
	case "chat":
		return name + " sent you a message"
	case "favorite":
		return name + " favorited you"
	}
	return "Linky"
}

func bodyFor(action, name string) string {
	switch action {
	case "matched":
		return "Tap to join the call with " + name
	case "chat":
		return "Open Linky to read"
	case "favorite":
		return "Open Linky to see who"
	}
	return ""
}

func _silenceJSON() { _ = json.Marshal }
