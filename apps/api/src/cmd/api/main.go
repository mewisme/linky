package main

import (
	"context"
	"net/http"
	"os"
	"os/signal"
	"strings"
	"syscall"
	"time"

	"linky-api/src/internal/config"
	"linky-api/src/internal/infra/admincache"
	"linky-api/src/internal/infra/aiconfig"
	"linky-api/src/internal/infra/clerkapi"
	"linky-api/src/internal/infra/clerkx"
	"linky-api/src/internal/infra/cloudflarerealtime"
	"linky-api/src/internal/infra/expbonus"
	"linky-api/src/internal/infra/openaix"
	"linky-api/src/internal/infra/preload"
	"linky-api/src/internal/infra/redisx"
	"linky-api/src/internal/infra/supax"
	"linky-api/src/internal/infra/webpush"
	"linky-api/src/internal/jobs/pool"
	"linky-api/src/internal/logger"
	"linky-api/src/internal/server"
	routes "linky-api/src/internal/transport/http"
	"linky-api/src/internal/transport/socketio"
	"linky-api/src/internal/transport/worker"
)

func roomFromSocket(io *socketio.Server, socketID string) string {
	rooms := io.Rooms()
	if rooms == nil {
		return ""
	}
	if r := rooms.BySocket(socketID); r != nil {
		return r.ID
	}
	return ""
}

func main() {
	cfg := config.Load()
	log := logger.New("api")
	logger.SetLevel(strings.ToLower(os.Getenv("LOG_LEVEL")))

	clerkx.Init(cfg)
	clerkapi.Init(cfg)
	if err := supax.Init(cfg); err != nil {
		log.Error().Err(err).Msg("Failed to init Supabase client")
	}
	redisx.Init(cfg)
	webpush.Init(cfg)
	aiconfig.Init(cfg)
	openaix.Init(cfg)
	worker.Init(cfg)
	if err := routes.InitS3(cfg); err != nil {
		log.Error().Err(err).Msg("Failed to init S3 client")
	}

	rootCtx, rootCancel := context.WithCancel(context.Background())
	defer rootCancel()

	if err := admincache.Initialize(rootCtx); err != nil {
		log.Error().Err(err).Msg("Failed to initialize admin cache")
	}
	preload.PreloadReferenceData(rootCtx)
	if err := aiconfig.Load(rootCtx); err != nil {
		log.Warn().Err(err).Msg("Failed to load AI config")
	}
	aiconfig.StartRefresher(rootCtx)
	if err := expbonus.Load(rootCtx); err != nil {
		log.Warn().Err(err).Msg("Failed to load EXP bonus config")
	}
	expbonus.StartRefresher(rootCtx)
	openaix.StartModelsRefresher(rootCtx)
	openaix.LogConfigured()

	connectCtx, connectCancel := context.WithTimeout(rootCtx, 10*time.Second)
	if err := redisx.Connect(connectCtx); err != nil {
		log.Warn().Err(err).Msg("Redis connect failed; jobs will not be processed")
	}
	connectCancel()

	publicEcho := server.NewPublicApp(cfg)
	io := socketio.NewServer(cfg)
	routes.QueueSizeFn = io.QueueSize

	cloudflarerealtime.Init(cfg)
	routes.SetRealtimeContext(&routes.RealtimeContext{
		Rooms:                 io.Rooms(),
		SFU:                   io.SFU(),
		OwnerLookupBySocketID: io.OwnerLookup,
	})
	routes.SetEndCallUnload(func(socketID, callerClerkID string) int {
		ownerClerkID := io.OwnerLookup(roomFromSocket(io, socketID), socketID)
		if ownerClerkID != "" && ownerClerkID != callerClerkID {
			return 403
		}
		if io.EndCallUnload(socketID) {
			return 200
		}
		return 204
	})

	mux := http.NewServeMux()
	mux.Handle("/ws/", io.Handler())
	mux.Handle("/", publicEcho)

	publicHandle, err := server.StartPublic(cfg, mux)
	if err != nil {
		log.Fatal().Err(err).Msg("Failed to start public listener")
	}

	jobPool := pool.New(cfg)
	jobPool.Start(rootCtx)

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

	io.PersistActiveRoomsCallHistory(shutdownCtx)

	io.Close(func(err error) {
		if err != nil {
			log.Error().Err(err).Msg("Socket.IO close error")
		}
	})

	jobPool.Stop()

	if err := redisx.Close(); err != nil {
		log.Warn().Err(err).Msg("Redis close error")
	}

	if err := server.Shutdown(shutdownCtx, publicHandle); err != nil {
		log.Error().Err(err).Msg("Public listener shutdown error")
	}
}
