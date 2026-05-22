package server

import (
	"context"
	"net"
	"net/http"
	"strings"

	"github.com/labstack/echo/v4"
	echomw "github.com/labstack/echo/v4/middleware"

	"linky-api/src/internal/config"
	"linky-api/src/internal/httpx"
	"linky-api/src/internal/lib/corsorigin"
	"linky-api/src/internal/logger"
	"linky-api/src/internal/transport/http/middleware"
	"linky-api/src/internal/transport/http"
)

var serverLog = logger.New("api:server")

func corsConfig(cfg *config.Config) echomw.CORSConfig {
	rules := cfg.CorsOrigin
	return echomw.CORSConfig{
		AllowOriginFunc: func(origin string) (bool, error) {
			return corsorigin.Match(origin, rules), nil
		},
		AllowCredentials: true,
		AllowMethods:     []string{"GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"},
		AllowHeaders:     []string{"Origin", "Content-Type", "Authorization", "X-Request-ID", "svix-id", "svix-timestamp", "svix-signature"},
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
	e.Use(middleware.AccessLog())
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

	routes.RegisterRoot(e)
	routes.RegisterHealth(e)

	webhookGroup := e.Group("/webhook", middleware.RateLimit(cfg))
	routes.RegisterWebhook(webhookGroup, cfg)

	routes.RegisterInterestTagsPublic(e.Group("/api/v1/interest-tags"))
	routes.RegisterQueueStatus(e.Group("/api/v1/matchmaking", middleware.RateLimit(cfg)), cfg)

	authed := e.Group("/api/v1", middleware.Clerk())
	routes.RegisterAPIv1(authed, cfg)

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

type ListenerHandle struct {
	Listener net.Listener
	Server   *http.Server
}

func StartPublic(cfg *config.Config, handler http.Handler) (*ListenerHandle, error) {
	addr := ":" + intToStr(cfg.Port)
	reclaim := strings.ToLower(strings.TrimSpace(cfg.NodeEnv)) != "production"
	l, err := listenTCP(addr, reclaim)
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
