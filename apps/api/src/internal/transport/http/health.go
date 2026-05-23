package routes

import (
	"context"
	"net/http"
	"time"

	"github.com/labstack/echo/v4"

	"linky-api/src/internal/httpx"
	"linky-api/src/internal/infra/supax/graphqlclient"
	"linky-api/src/internal/infra/supax/pgclient"
)

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

		supabaseReady := pgclient.Ping(ctx) == nil
		graphqlReady := !graphqlclient.Configured() || graphqlclient.Ping(ctx) == nil
		ready := supabaseReady && graphqlReady

		body := map[string]interface{}{
			"status":   statusReady(ready),
			"supabase": statusOK(supabaseReady),
		}
		if graphqlclient.Configured() {
			body["graphql"] = statusOK(graphqlReady)
		}
		if ready {
			return c.JSON(http.StatusOK, body)
		}
		return c.JSON(http.StatusServiceUnavailable, body)
	})
}

func statusOK(b bool) string {
	if b {
		return "ok"
	}
	return "error"
}

func statusReady(ready bool) string {
	if ready {
		return "ready"
	}
	return "not ready"
}

func RegisterRoot(e *echo.Echo) {
	e.GET("/", func(c echo.Context) error {
		return c.JSON(http.StatusOK, map[string]interface{}{
			"status": "running",
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
