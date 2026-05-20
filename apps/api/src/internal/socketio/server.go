package socketio

import (
	"context"
	"net/http"
	"sync"
	"time"

	socket "github.com/zishang520/socket.io/servers/socket/v3"
	"github.com/zishang520/socket.io/v3/pkg/types"

	"linky-api/src/internal/config"
	"linky-api/src/internal/domains/rooms"
	"linky-api/src/internal/domains/videochat/realtime"
	"linky-api/src/internal/infra/admincache"
	"linky-api/src/internal/infra/clerkx"
	"linky-api/src/internal/logger"
)

const (
	dataKeyUserID       = "userId"
	dataKeyUserName     = "userName"
	dataKeyUserImageURL = "userImageUrl"
	dataKeyAuth         = "auth"
)

var log = logger.New("api:socket:server")

type Server struct {
	io          *socket.Server
	chat        socket.Namespace
	admin       socket.Namespace
	cfg         *config.Config
	startupOnce sync.Once
	chatRuntime *chatRuntime
}

func NewServer(cfg *config.Config) *Server {
	opts := socket.DefaultServerOptions()
	opts.SetPath("/ws")
	opts.SetServeClient(false)
	opts.SetCors(&types.Cors{
		Origin:      cfg.CorsOrigin,
		Credentials: true,
		Methods:     []string{"GET", "POST"},
	})
	opts.SetMaxHttpBufferSize(int64(cfg.SocketMaxHTTPBufferSize))

	io := socket.NewServer(nil, opts)

	srv := &Server{io: io, cfg: cfg}
	srv.chat = io.Of("/chat", nil)
	srv.admin = io.Of("/admin", nil)

	srv.chat.Use(authMiddleware(false))
	srv.admin.Use(authMiddleware(true))

	initAdminPresenceFanout(srv.admin)

	runtime := newChatRuntime(srv.chat)

	srv.chat.On("connection", func(args ...any) {
		if len(args) == 0 {
			return
		}
		s, ok := args[0].(*socket.Socket)
		if !ok {
			return
		}
		runtime.attach(s)
	})

	srv.admin.On("connection", func(args ...any) {
		if len(args) == 0 {
			return
		}
		s, ok := args[0].(*socket.Socket)
		if !ok {
			return
		}
		setupAdminHandlers(s)
	})

	srv.chatRuntime = runtime
	return srv
}

func (s *Server) QueueSize() int {
	if s == nil || s.chatRuntime == nil {
		return 0
	}
	return s.chatRuntime.queue.Size()
}

func (s *Server) PersistActiveRoomsCallHistory(ctx context.Context) {
	if s == nil || s.chatRuntime == nil {
		return
	}
	s.chatRuntime.persistActiveRoomsOnShutdown(ctx)
}

func (s *Server) Rooms() *rooms.RoomService {
	if s == nil || s.chatRuntime == nil {
		return nil
	}
	return s.chatRuntime.rooms
}

func (s *Server) SFU() *realtime.Service {
	if s == nil || s.chatRuntime == nil {
		return nil
	}
	return s.chatRuntime.sfu
}

func (s *Server) OwnerLookup(roomID, socketID string) string {
	if s == nil || s.chatRuntime == nil {
		return ""
	}
	room := s.chatRuntime.rooms.ByID(roomID)
	if room == nil {
		return ""
	}
	target := s.chatRuntime.chat.Sockets()
	if target == nil {
		return ""
	}
	if peerSock, ok := target.Load(socket.SocketId(socketID)); ok && peerSock != nil {
		return userIDFromSocket(peerSock)
	}
	return ""
}

func (s *Server) EndCallUnload(socketID string) bool {
	if s == nil || s.chatRuntime == nil {
		return false
	}
	target := s.chatRuntime.chat.Sockets()
	var sock *socket.Socket
	if target != nil {
		if v, ok := target.Load(socket.SocketId(socketID)); ok {
			sock = v
		}
	}
	if sock != nil {
		dbUserID := dbUserIDFromSocket(sock)
		if dbUserID != "" {
			s.chatRuntime.queue.DequeueIfOwner(dbUserID, socketID)
		}
	}
	_, room := s.chatRuntime.rooms.PeerOf(socketID)
	if room == nil {
		return false
	}
	s.chatRuntime.endRoom(room, "disconnect")
	return true
}

func (s *Server) Handler() http.Handler {
	return s.io.ServeHandler(nil)
}

func (s *Server) Close(cb func(error)) {
	if s.chatRuntime != nil {
		s.chatRuntime.close()
	}
	s.io.Close(cb)
}

func authMiddleware(requireAdmin bool) socket.NamespaceMiddleware {
	return func(sock *socket.Socket, next func(*socket.ExtendedError)) {
		hs := sock.Handshake()
		if hs == nil {
			next(socket.NewExtendedError("Authentication required", nil))
			return
		}
		var token string
		if hs.Auth != nil {
			if t, ok := hs.Auth["token"].(string); ok {
				token = t
			}
		}
		if token == "" {
			log.Warn().Str("socketId", string(sock.Id())).Msg("Socket connection rejected: No token provided")
			next(socket.NewExtendedError("Authentication required", nil))
			return
		}

		verifyCtx, verifyCancel := context.WithTimeout(context.Background(), 10*time.Second)
		defer verifyCancel()
		payload, err := clerkx.VerifyToken(verifyCtx, token)
		if err != nil {
			log.Error().Err(err).Str("socketId", string(sock.Id())).Msg("Socket authentication failed")
			next(socket.NewExtendedError("Authentication failed", nil))
			return
		}

		userName := "Anonymous"
		var userImage string
		profileCtx, profileCancel := context.WithTimeout(context.Background(), 5*time.Second)
		if u, err := clerkx.GetUser(profileCtx, payload.Sub); err == nil && u != nil {
			if u.FirstName != "" {
				userName = u.FirstName
			} else if u.Username != "" {
				userName = u.Username
			}
			userImage = u.ImageURL
		} else if err != nil {
			log.Warn().Err(err).Str("userId", payload.Sub).Msg("Failed to fetch user profile from Clerk")
		}
		profileCancel()

		data := map[string]any{
			dataKeyUserID:       payload.Sub,
			dataKeyUserName:     userName,
			dataKeyUserImageURL: userImage,
			dataKeyAuth:         payload.Raw,
		}
		sock.SetData(data)

		if requireAdmin {
			adminCtx, adminCancel := context.WithTimeout(context.Background(), 5*time.Second)
			ok, err := admincache.IsAdmin(adminCtx, payload.Sub)
			adminCancel()
			if err != nil {
				log.Error().Err(err).Msg("Admin namespace auth failed")
				next(socket.NewExtendedError("Authorization failed", nil))
				return
			}
			if !ok {
				next(socket.NewExtendedError("Admin access required", nil))
				return
			}
		}

		next(nil)
	}
}

func userIDFromSocket(sock *socket.Socket) string {
	d := sock.Data()
	if d == nil {
		return ""
	}
	if m, ok := d.(map[string]any); ok {
		if s, ok := m[dataKeyUserID].(string); ok {
			return s
		}
	}
	return ""
}
