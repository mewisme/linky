package routes

import (
	"encoding/json"
	"io"
	"net/http"
	"strings"

	"github.com/labstack/echo/v4"

	"linky-api/src/internal/config"
	"linky-api/src/internal/httpx"
	"linky-api/src/internal/infra/supax"
	"linky-api/src/internal/lib/pushendpoint"
)

type subscribeBody struct {
	Subscription struct {
		Endpoint string `json:"endpoint"`
		Keys     struct {
			P256dh string `json:"p256dh"`
			Auth   string `json:"auth"`
		} `json:"keys"`
	} `json:"subscription"`
}

func registerPushRoutes(g *echo.Group, cfg *config.Config) {
	g.POST("/subscribe", func(c echo.Context) error {
		clerkID := httpx.MustClerkUserID(c)
		body, _ := io.ReadAll(c.Request().Body)
		var input subscribeBody
		_ = json.Unmarshal(body, &input)
		s := input.Subscription
		if s.Endpoint == "" || s.Keys.P256dh == "" || s.Keys.Auth == "" {
			return httpx.SendError(c, 400, "Bad Request",
				httpx.UM("VALID_SUBSCRIPTION_REQUIRED", "validSubscriptionRequired", "Valid subscription object is required"))
		}
		if !pushendpoint.IsAllowed(s.Endpoint) {
			return httpx.SendError(c, 400, "Bad Request",
				httpx.UM("INVALID_PUSH_ENDPOINT", "invalidPushEndpoint", "Push subscription endpoint is not from an allowed push service"))
		}
		uid, _ := supax.GetUserInternalID(c.Request().Context(), clerkID)
		if uid == "" {
			return httpx.SendError(c, 404, "Not Found",
				httpx.UM("USER_NOT_IN_DB", "userNotInDatabase", "User not found in database"))
		}
		row, err := supax.UpsertPushSubscription(c.Request().Context(), uid, s.Endpoint, s.Keys.P256dh, s.Keys.Auth)
		if err != nil {
			return httpx.SendError(c, 500, "Internal Server Error",
				httpx.UM("FAILED_SUBSCRIBE_PUSH", "failedSubscribePush", "Failed to subscribe to push notifications"))
		}
		return c.JSON(http.StatusCreated, row)
	})

	g.DELETE("/unsubscribe", func(c echo.Context) error {
		clerkID := httpx.MustClerkUserID(c)
		body, _ := io.ReadAll(c.Request().Body)
		var input struct {
			Endpoint string `json:"endpoint"`
		}
		_ = json.Unmarshal(body, &input)
		ep := strings.TrimSpace(input.Endpoint)
		if ep == "" {
			return httpx.SendError(c, 400, "Bad Request",
				httpx.UM("ENDPOINT_REQUIRED", "endpointRequired", "endpoint is required"))
		}
		if !pushendpoint.IsAllowed(ep) {
			return httpx.SendError(c, 400, "Bad Request",
				httpx.UM("INVALID_PUSH_ENDPOINT", "invalidPushEndpoint", "Push subscription endpoint is not from an allowed push service"))
		}
		uid, _ := supax.GetUserInternalID(c.Request().Context(), clerkID)
		if uid == "" {
			return httpx.SendError(c, 404, "Not Found",
				httpx.UM("USER_NOT_IN_DB", "userNotInDatabase", "User not found in database"))
		}
		if err := supax.DeletePushSubscription(c.Request().Context(), uid, ep); err != nil {
			return httpx.SendError(c, 500, "Internal Server Error",
				httpx.UM("FAILED_UNSUBSCRIBE_PUSH", "failedUnsubscribePush", "Failed to unsubscribe from push notifications"))
		}
		return c.NoContent(http.StatusNoContent)
	})

	g.GET("/vapid-public-key", func(c echo.Context) error {
		if cfg.VAPIDPublicKey == "" {
			return httpx.SendError(c, 503, "Service Unavailable",
				httpx.UM("PUSH_NOT_CONFIGURED", "pushNotConfigured", "Push notifications are not configured"))
		}
		return c.JSON(http.StatusOK, map[string]any{"publicKey": cfg.VAPIDPublicKey})
	})
}
