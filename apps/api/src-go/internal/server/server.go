package server

import (
	"context"
	"net"
	"net/http"
	"os"
	"strings"

	"github.com/labstack/echo/v4"
	echomw "github.com/labstack/echo/v4/middleware"

	"linky-api/src-go/internal/config"
	"linky-api/src-go/internal/httpx"
	"linky-api/src-go/internal/logger"
	"linky-api/src-go/internal/middleware"
	"linky-api/src-go/internal/routes"
)

var serverLog = logger.New("api:server")

func corsConfig(cfg *config.Config) echomw.CORSConfig {
	return echomw.CORSConfig{
		AllowOrigins:     cfg.CorsOrigin,
		AllowCredentials: true,
		AllowMethods:     []string{"GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"},
		AllowHeaders:     []string{"Origin", "Content-Type", "Authorization", "X-Request-ID", "Idempotency-Key", "svix-id", "svix-timestamp", "svix-signature"},
	}
}

func bodyLimitFromConfig(cfg *config.Config) string {
	limit := strings.TrimSpace(cfg.JSONBodySizeLimit)
	if limit == "" {
		return "500K"
	}
	return strings.ToUpper(limit)
}

func NewPublicApp(cfg *config.Config) *echo.Echo {
	e := echo.New()
	e.HideBanner = true
	e.HidePort = true
	e.JSONSerializer = &echo.DefaultJSONSerializer{}

	e.Use(middleware.RequestID())
	e.Use(middleware.ClientIP())
	e.Use(echomw.CORSWithConfig(corsConfig(cfg)))
	e.Use(echomw.BodyLimit(bodyLimitFromConfig(cfg)))
	e.Use(echomw.Recover())
	e.Use(echomw.GzipWithConfig(echomw.GzipConfig{
		Level:     5,
		MinLength: 1024,
		Skipper: func(c echo.Context) bool {
			return strings.HasPrefix(c.Path(), "/webhook")
		},
	}))
	e.Use(echomw.LoggerWithConfig(echomw.LoggerConfig{
		Format: `${time_rfc3339_nano} ${remote_ip} "${method} ${uri} HTTP/${protocol}" ${status} ${bytes_out} - ${latency_human}` + "\n",
		Output: os.Stdout,
	}))

	routes.RegisterRoot(e)
	routes.RegisterHealth(e)

	webhookGroup := e.Group("/webhook", middleware.RateLimit(cfg))
	routes.RegisterWebhook(webhookGroup, cfg)

	routes.RegisterInterestTagsPublic(e.Group("/api/v1/interest-tags"))
	routes.RegisterQueueStatus(e.Group("/api/v1/matchmaking", middleware.RateLimit(cfg)), cfg)

	authed := e.Group("/api/v1", middleware.Clerk())
	routes.RegisterAPIv1(authed, cfg)

	routes.RegisterICE(e.Group("/api", middleware.Clerk()), cfg)

	admin := e.Group("/api/v1/admin", middleware.Clerk(), middleware.Admin(), middleware.RateLimit(cfg))
	routes.RegisterAdminAPI(admin)

	e.HTTPErrorHandler = func(err error, c echo.Context) {
		if c.Response().Committed {
			return
		}
		if he, ok := err.(*echo.HTTPError); ok {
			switch he.Code {
			case http.StatusNotFound:
				_ = httpx.NotFound(c)
				return
			case http.StatusUnauthorized:
				_ = httpx.Unauthorized(c)
				return
			}
			_ = httpx.SendError(c, he.Code, http.StatusText(he.Code),
				httpx.UMDetail("HTTP_ERROR", strings.TrimSpace(stringify(he.Message))))
			return
		}
		serverLog.Error().Err(err).Msg("Internal server error")
		_ = httpx.Internal(c, err.Error())
	}

	return e
}

func stringify(v interface{}) string {
	if s, ok := v.(string); ok {
		return s
	}
	return ""
}

func NewInternalApp(cfg *config.Config) *echo.Echo {
	e := echo.New()
	e.HideBanner = true
	e.HidePort = true

	e.Use(middleware.RequestID())
	e.Use(echomw.BodyLimit(bodyLimitFromConfig(cfg)))
	e.Use(echomw.Recover())

	g := e.Group(routes.InternalWorkerV1Prefix)
	routes.RegisterInternalWorkerRoutes(g)

	e.HTTPErrorHandler = func(err error, c echo.Context) {
		if c.Response().Committed {
			return
		}
		if he, ok := err.(*echo.HTTPError); ok && he.Code == http.StatusNotFound {
			_ = httpx.NotFound(c)
			return
		}
		serverLog.Error().Err(err).Msg("Internal server error on internal listener")
		_ = httpx.Internal(c, err.Error())
	}

	return e
}

type ListenerHandle struct {
	Listener net.Listener
	Server   *http.Server
}

func StartInternal(cfg *config.Config, e *echo.Echo) (*ListenerHandle, error) {
	if cfg.InternalAPISocketPath != "" {
		_ = os.Remove(cfg.InternalAPISocketPath)
		l, err := net.Listen("unix", cfg.InternalAPISocketPath)
		if err != nil {
			return nil, err
		}
		_ = os.Chmod(cfg.InternalAPISocketPath, 0o666)
		serverLog.Info().Str("socket", cfg.InternalAPISocketPath).Msg("Internal API listening on unix socket")
		srv := &http.Server{Handler: e}
		go func() { _ = srv.Serve(l) }()
		return &ListenerHandle{Listener: l, Server: srv}, nil
	}
	addr := "127.0.0.1:" + intToStr(cfg.InternalAPIPort)
	l, err := net.Listen("tcp", addr)
	if err != nil {
		return nil, err
	}
	serverLog.Info().Str("addr", addr).Msg("Internal API listening")
	srv := &http.Server{Handler: e}
	go func() { _ = srv.Serve(l) }()
	return &ListenerHandle{Listener: l, Server: srv}, nil
}

func StartPublic(cfg *config.Config, handler http.Handler) (*ListenerHandle, error) {
	addr := ":" + intToStr(cfg.Port)
	l, err := net.Listen("tcp", addr)
	if err != nil {
		return nil, err
	}
	srv := &http.Server{Handler: handler}
	go func() { _ = srv.Serve(l) }()
	serverLog.Info().Int("port", cfg.Port).Str("env", cfg.NodeEnv).Msg("Server started")
	return &ListenerHandle{Listener: l, Server: srv}, nil
}

func Shutdown(ctx context.Context, h *ListenerHandle) error {
	if h == nil || h.Server == nil {
		return nil
	}
	return h.Server.Shutdown(ctx)
}

func intToStr(v int) string {
	return strings.TrimSpace(intStr(v))
}

func intStr(v int) string {
	const digits = "0123456789"
	if v == 0 {
		return "0"
	}
	negative := v < 0
	if negative {
		v = -v
	}
	out := make([]byte, 0, 20)
	for v > 0 {
		out = append([]byte{digits[v%10]}, out...)
		v /= 10
	}
	if negative {
		out = append([]byte{'-'}, out...)
	}
	return string(out)
}
