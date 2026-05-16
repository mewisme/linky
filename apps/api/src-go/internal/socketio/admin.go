package socketio

import socket "github.com/zishang520/socket.io/servers/socket/v3"

func setupAdminHandlers(s *socket.Socket) {
	uid := userIDFromSocket(s)
	socketLog.Debug().Str("socketId", string(s.Id())).Str("userId", uid).Msg("admin namespace connected")
	s.On("disconnect", func(args ...any) {})
}
