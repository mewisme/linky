package main

import (
	"context"
	"net/http"
	"os"
	"os/signal"
	"strings"
	"syscall"
	"time"

	sentry "github.com/getsentry/sentry-go"

	"linky-api/src-go/internal/config"
	"linky-api/src-go/internal/infra/admincache"
	"linky-api/src-go/internal/infra/clerkx"
	"linky-api/src-go/internal/infra/ollamax"
	"linky-api/src-go/internal/infra/preload"
	"linky-api/src-go/internal/infra/redisx"
	"linky-api/src-go/internal/infra/supax"
	"linky-api/src-go/internal/infra/webpush"
	"linky-api/src-go/internal/logger"
	"linky-api/src-go/internal/routes"
	"linky-api/src-go/internal/server"
	"linky-api/src-go/internal/socketio"
	"linky-api/src-go/internal/worker"
)

func main() {
	cfg := config.Load()
	log := logger.New("api")
	logger.SetLevel(strings.ToLower(os.Getenv("LOG_LEVEL")))

	clerkx.Init(cfg)
	redisx.Init(cfg)
	if err := supax.Init(cfg); err != nil {
		log.Error().Err(err).Msg("Failed to init Supabase client")
	}
	supax.InitRPC(cfg)
	webpush.Init(cfg)
	ollamax.Init(cfg)
	worker.Init(cfg)
	if err := routes.InitS3(cfg); err != nil {
		log.Error().Err(err).Msg("Failed to init S3 client")
	}

	if dsn := os.Getenv("SENTRY_DSN"); dsn != "" {
		if err := sentry.Init(sentry.ClientOptions{
			Dsn:              dsn,
			Environment:      cfg.NodeEnv,
			TracesSampleRate: 0.0,
		}); err != nil {
			log.Warn().Err(err).Msg("Sentry init failed")
		} else {
			defer sentry.Flush(2 * time.Second)
			log.Info().Msg("Sentry initialized")
		}
	}

	rootCtx, rootCancel := context.WithCancel(context.Background())
	defer rootCancel()

	connectCtx, connectCancel := context.WithTimeout(rootCtx, 10*time.Second)
	if err := redisx.Connect(connectCtx); err != nil {
		log.Error().Err(err).Msg("Failed to connect to Redis, continuing without Redis")
	}
	connectCancel()

	if err := admincache.Initialize(rootCtx); err != nil {
		log.Error().Err(err).Msg("Failed to initialize admin cache")
	}
	preload.PreloadReferenceData(rootCtx)
	go ollamax.PullEmbeddingModelAtStartup(context.Background())

	internalEcho := server.NewInternalApp(cfg)
	internalHandle, err := server.StartInternal(cfg, internalEcho)
	if err != nil {
		log.Fatal().Err(err).Msg("Failed to start internal listener")
	}

	publicEcho := server.NewPublicApp(cfg)
	io := socketio.NewServer(cfg)
	routes.QueueSizeFn = io.QueueSize

	mux := http.NewServeMux()
	mux.Handle("/ws/", io.Handler())
	mux.Handle("/", publicEcho)

	publicHandle, err := server.StartPublic(cfg, mux)
	if err != nil {
		log.Fatal().Err(err).Msg("Failed to start public listener")
	}

	stop := make(chan os.Signal, 1)
	signal.Notify(stop, os.Interrupt, syscall.SIGTERM)
	<-stop

	log.Info().Msg("Shutting down")
	shutdownTimeout := time.Duration(cfg.ShutdownTimeoutMs) * time.Millisecond
	if shutdownTimeout <= 0 {
		shutdownTimeout = 30 * time.Second
	}
	shutdownCtx, shutdownCancel := context.WithTimeout(context.Background(), shutdownTimeout)
	defer shutdownCancel()

	io.Close(func(err error) {
		if err != nil {
			log.Error().Err(err).Msg("Socket.IO close error")
		}
	})

	if err := server.Shutdown(shutdownCtx, publicHandle); err != nil {
		log.Error().Err(err).Msg("Public listener shutdown error")
	}
	if err := server.Shutdown(shutdownCtx, internalHandle); err != nil {
		log.Error().Err(err).Msg("Internal listener shutdown error")
	}
	if err := redisx.Close(); err != nil {
		log.Error().Err(err).Msg("Redis close error")
	}
}
