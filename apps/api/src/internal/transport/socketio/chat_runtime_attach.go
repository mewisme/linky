package socketio

import (
	"context"

	socket "github.com/zishang520/socket.io/servers/socket/v3"

	appuser "linky-api/src/internal/app/user"
)

func (r *chatRuntime) close() {
	close(r.stopMatch)
	close(r.stopHB)
	close(r.stopCleanup)
}

func (r *chatRuntime) attach(s *socket.Socket) {
	uid := userIDFromSocket(s)
	uname, uimg := userInfoFromSocket(s)

	dbUserID := ""
	if uid != "" {
		if id, err := appuser.InternalIDFromClerk(context.Background(), uid); err == nil {
			dbUserID = id
		}
	}
	saveDBUserID(s, dbUserID)

	s.On("message", func(args ...any) { r.onGenericMessage(s, args) })
	s.On("join-room", func(args ...any) { r.onJoinRoom(s, args) })
	s.On("leave-room", func(args ...any) { r.onLeaveRoom(s, args) })

	s.On("join", func(args ...any) { r.onJoin(s, dbUserID, uname, uimg) })
	s.On("skip", func(args ...any) { r.onSkip(s, dbUserID) })
	s.On("signal", func(args ...any) { r.onSignal(s, args) })
	s.On("end-call", func(args ...any) { r.onEndCall(s) })
	s.On("resync-room-state", func(args ...any) { r.onResyncRoom(s) })
	s.On("resync-session", func(args ...any) { r.onResyncSession(s, args) })

	s.On("chat:send", func(args ...any) { r.onChatSend(s, args, uname) })
	s.On("chat:attachment:send", func(args ...any) { r.onChatSend(s, args, uname) })
	s.On("chat:typing", func(args ...any) { r.forwardToPeer(s, "chat:typing", args) })
	s.On("mute-toggle", func(args ...any) { r.forwardToPeer(s, "mute-toggle", args) })
	s.On("video-toggle", func(args ...any) { r.forwardToPeer(s, "video-toggle", args) })
	s.On("screen-share:toggle", func(args ...any) { r.onScreenShareToggle(s, args, uname) })
	s.On("reaction:triggered", func(args ...any) { r.forwardToPeer(s, "reaction:triggered", args) })
	s.On("favorite:notify-peer", func(args ...any) { r.onFavoriteNotify(s, args, uname) })

	s.On("client:visibility:foreground", func(args ...any) { setVisibility(s, "foreground") })
	s.On("client:visibility:background", func(args ...any) { setVisibility(s, "background") })
	s.On("client:presence", func(args ...any) { handlePresenceEvent(s, args) })

	s.On("disconnect", func(args ...any) { r.onDisconnect(s, dbUserID) })
}
