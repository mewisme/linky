package socketio

import (
	"net/http"
	"sync"

	socket "github.com/zishang520/socket.io/servers/socket/v3"
	"github.com/zishang520/socket.io/v3/pkg/types"

	"linky-api/src-go/internal/config"
	"linky-api/src-go/internal/infra/admincache"
	"linky-api/src-go/internal/infra/clerkx"
	"linky-api/src-go/internal/logger"
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

		ctx := sock.Request().Context()
		payload, err := clerkx.VerifyToken(ctx, token)
		if err != nil {
			log.Error().Err(err).Msg("Socket authentication failed")
			next(socket.NewExtendedError("Authentication failed", nil))
			return
		}

		userName := "Anonymous"
		var userImage string
		if u, err := clerkx.GetUser(ctx, payload.Sub); err == nil && u != nil {
			if u.FirstName != "" {
				userName = u.FirstName
			} else if u.Username != "" {
				userName = u.Username
			}
			userImage = u.ImageURL
		}

		data := map[string]any{
			dataKeyUserID:       payload.Sub,
			dataKeyUserName:     userName,
			dataKeyUserImageURL: userImage,
			dataKeyAuth:         payload.Raw,
		}
		sock.SetData(data)

		if requireAdmin {
			ok, err := admincache.IsAdmin(ctx, payload.Sub)
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
