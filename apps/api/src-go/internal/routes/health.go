package routes

import (
	"context"
	"encoding/json"
	"net/http"
	"os"
	"path/filepath"
	"sync"
	"time"

	"github.com/labstack/echo/v4"

	"linky-api/src-go/internal/config"
	"linky-api/src-go/internal/httpx"
	"linky-api/src-go/internal/infra/redisx"
	"linky-api/src-go/internal/infra/supax"
)

var (
	packageVersionOnce sync.Once
	packageVersion     string
)

func readPackageVersion() string {
	packageVersionOnce.Do(func() {
		packageVersion = "unknown"
		cwd, err := os.Getwd()
		if err != nil {
			return
		}
		dir := cwd
		for i := 0; i < 6; i++ {
			data, err := os.ReadFile(filepath.Join(dir, "package.json"))
			if err == nil {
				var pkg struct {
					Version string `json:"version"`
				}
				if jerr := json.Unmarshal(data, &pkg); jerr == nil && pkg.Version != "" {
					packageVersion = pkg.Version
					return
				}
				return
			}
			parent := filepath.Dir(dir)
			if parent == dir {
				return
			}
			dir = parent
		}
	})
	return packageVersion
}

func RegisterHealth(e *echo.Echo) {
	e.GET("/healthz", func(c echo.Context) error {
		return c.JSON(http.StatusOK, map[string]interface{}{
			"status":  "ok",
			"version": readPackageVersion(),
		})
	})

	e.GET("/readyz", func(c echo.Context) error {
		ctx, cancel := context.WithTimeout(c.Request().Context(), 5*time.Second)
		defer cancel()

		redisReady := false
		if redisx.IsOpen() {
			if err := redisx.Client().Ping(ctx).Err(); err == nil {
				redisReady = true
			}
		}

		supabaseReady := supax.Ping(ctx) == nil

		if redisReady && supabaseReady {
			return c.JSON(http.StatusOK, map[string]interface{}{
				"status":   "ready",
				"redis":    "ok",
				"supabase": "ok",
			})
		}
		return c.JSON(http.StatusServiceUnavailable, map[string]interface{}{
			"status":   "not ready",
			"redis":    statusOK(redisReady),
			"supabase": statusOK(supabaseReady),
		})
	})
}

func statusOK(b bool) string {
	if b {
		return "ok"
	}
	return "error"
}

func RegisterRoot(e *echo.Echo, cfg *config.Config) {
	e.GET("/", func(c echo.Context) error {
		return c.JSON(http.StatusOK, map[string]interface{}{
			"environment": cfg.NodeEnv,
			"timestamp":   time.Now().UTC().Format(time.RFC3339Nano),
			"status":      "running",
		})
	})

	e.GET("/health", func(c echo.Context) error {
		return c.JSON(http.StatusOK, map[string]interface{}{
			"status":    "ok",
			"timestamp": time.Now().UTC().Format(time.RFC3339Nano),
		})
	})

	e.GET("/api", func(c echo.Context) error {
		fallback := "API is running"
		um := httpx.UserMessage{
			Code:            "API_RUNNING",
			I18n:            &httpx.I18nPayload{Key: "api.apiRunning"},
			FallbackMessage: &fallback,
		}
		return httpx.SendUserMessage(c, http.StatusOK, map[string]interface{}{}, um)
	})
}
