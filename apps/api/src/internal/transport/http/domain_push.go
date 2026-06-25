package routes

import (
	"encoding/json"
	"io"
	"net/http"

	"github.com/labstack/echo/v4"

	apppush "linky-api/src/internal/app/push"
	"linky-api/src/internal/app/user"
	"linky-api/src/internal/config"
	"linky-api/src/internal/httpx"
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
		uid, _ := user.InternalIDFromClerk(c.Request().Context(), clerkID)
		if uid == "" {
			return httpx.SendError(c, 404, "Not Found",
				httpx.UM("USER_NOT_IN_DB", "userNotInDatabase", "User not found in database"))
		}
		row, err := apppush.Subscribe(c.Request().Context(), uid, s.Endpoint, s.Keys.P256dh, s.Keys.Auth)
		if err != nil {
			return sendPushStatusError(c, err)
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
		uid, _ := user.InternalIDFromClerk(c.Request().Context(), clerkID)
		if uid == "" {
			return httpx.SendError(c, 404, "Not Found",
				httpx.UM("USER_NOT_IN_DB", "userNotInDatabase", "User not found in database"))
		}
		if err := apppush.Unsubscribe(c.Request().Context(), uid, input.Endpoint); err != nil {
			return sendPushStatusError(c, err)
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
