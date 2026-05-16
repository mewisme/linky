package socketio

import (
	"strings"
	"time"

	socket "github.com/zishang520/socket.io/servers/socket/v3"
)

const (
	maxChatMessageLength  = 200
	maxChatAttachmentSize = 5 * 1024 * 1024
	minChatMessageIDLen   = 4
)

var allowedChatMessageTypes = map[string]struct{}{
	"text": {}, "image": {}, "gif": {}, "sticker": {}, "system": {},
}

func parseChatInput(args []any) map[string]any {
	if len(args) == 0 {
		return nil
	}
	if m, ok := args[0].(map[string]any); ok {
		return m
	}
	return nil
}

func sanitizeChatMessageText(v any) any {
	s, ok := v.(string)
	if !ok {
		return nil
	}
	trimmed := strings.TrimSpace(s)
	if trimmed == "" {
		return nil
	}
	if len(trimmed) > maxChatMessageLength {
		trimmed = trimmed[:maxChatMessageLength]
	}
	return trimmed
}

func isAllowedChatType(v any) bool {
	s, ok := v.(string)
	if !ok {
		return false
	}
	_, ok = allowedChatMessageTypes[s]
	return ok
}

func buildChatMessagePayload(s *socket.Socket, data map[string]any) map[string]any {
	uname, uimg := userInfoFromSocket(s)
	uid := userIDFromSocket(s)
	if uid == "" {
		uid = "unknown"
	}

	ts := time.Now().UnixMilli()
	if v, ok := data["timestamp"].(float64); ok && v > 0 {
		ts = int64(v)
	}

	msg := sanitizeChatMessageText(data["message"])

	attachment := data["attachment"]
	if attachment == nil {
		attachment = nil
	}

	metadata := data["metadata"]
	if metadata == nil {
		metadata = nil
	}

	var avatarURL any
	if uimg != "" {
		avatarURL = uimg
	}

	return map[string]any{
		"id":   data["id"],
		"type": data["type"],
		"sender": map[string]any{
			"socketId":    string(s.Id()),
			"userId":      uid,
			"displayName": uname,
			"avatarUrl":   avatarURL,
		},
		"timestamp":  ts,
		"message":    msg,
		"attachment": attachment,
		"metadata":   metadata,
	}
}

func isValidChatInput(data map[string]any) bool {
	if data == nil || !isAllowedChatType(data["type"]) {
		return false
	}
	id, ok := data["id"].(string)
	if !ok || len(id) < minChatMessageIDLen {
		return false
	}
	msgType, _ := data["type"].(string)
	switch msgType {
	case "text":
		return sanitizeChatMessageText(data["message"]) != nil
	case "image":
		if att, ok := data["attachment"].(map[string]any); ok {
			if d, ok := att["data"].(string); ok && d != "" {
				return true
			}
		}
		return false
	case "gif", "sticker":
		if meta, ok := data["metadata"].(map[string]any); ok {
			if u, ok := meta["url"].(string); ok && u != "" {
				return true
			}
		}
		return false
	default:
		return true
	}
}
