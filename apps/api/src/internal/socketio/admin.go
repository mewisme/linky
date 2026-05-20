package socketio

import (
	"sync"
	"time"

	socket "github.com/zishang520/socket.io/servers/socket/v3"

	"linky-api/src/internal/contexts"
)

var (
	adminInitOnce sync.Once
	adminNS       socket.Namespace
)

func initAdminPresenceFanout(ns socket.Namespace) {
	adminInitOnce.Do(func() {
		adminNS = ns
		contexts.OnPresenceUpdate(func(userID, state string, updatedAt time.Time) {
			if adminNS == nil {
				return
			}
			adminNS.Emit("presence:update", map[string]any{
				"userId":    userID,
				"state":     state,
				"updatedAt": updatedAt.UTC().Format(time.RFC3339Nano),
			})
		})
	})
}

func setupAdminHandlers(s *socket.Socket) {
	uid := userIDFromSocket(s)
	socketLog.Debug().Str("socketId", string(s.Id())).Str("userId", uid).Msg("admin namespace connected")
	for userID, st := range contexts.SnapshotPresence() {
		_ = s.Emit("presence:update", map[string]any{
			"userId":    userID,
			"state":     st.State,
			"updatedAt": st.UpdatedAt.UTC().Format(time.RFC3339Nano),
		})
	}
	s.On("disconnect", func(args ...any) {})
}
