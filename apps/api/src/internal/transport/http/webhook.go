package routes

import (
	"encoding/json"
	"io"
	"net/http"

	"github.com/labstack/echo/v4"
	svix "github.com/svix/svix-webhooks/go"

	"linky-api/src/internal/app/clerkwebhook"
	"linky-api/src/internal/config"
	"linky-api/src/internal/httpx"
	"linky-api/src/internal/logger"
)

var webhookLog = logger.New("routes:webhook")

func RegisterWebhook(g *echo.Group, cfg *config.Config) {
	g.POST("/clerk", func(c echo.Context) error {
		svixID := c.Request().Header.Get("svix-id")
		svixTs := c.Request().Header.Get("svix-timestamp")
		svixSig := c.Request().Header.Get("svix-signature")
		if svixID == "" || svixTs == "" || svixSig == "" {
			webhookLog.Warn().Msg("Webhook request missing svix headers")
			return httpx.SendError(c, http.StatusBadRequest, "Bad Request",
				httpx.UM("MISSING_SVIX", "missingSvixHeaders", "Missing svix headers"))
		}

		body, err := io.ReadAll(c.Request().Body)
		if err != nil {
			return httpx.SendError(c, http.StatusBadRequest, "Bad Request",
				httpx.UMDetail("WEBHOOK_VERIFY_FAILED", err.Error()))
		}

		if cfg.ClerkWebhookSecret != "" {
			wh, err := svix.NewWebhook(cfg.ClerkWebhookSecret)
			if err != nil {
				webhookLog.Error().Err(err).Msg("Webhook secret invalid")
				return httpx.SendError(c, http.StatusInternalServerError, "Internal Server Error",
					httpx.UM("FAILED_PROCESS_WEBHOOK", "failedProcessWebhook", "Failed to process webhook"))
			}
			if err := wh.Verify(body, c.Request().Header); err != nil {
				webhookLog.Error().Err(err).Msg("Webhook verification failed")
				return httpx.SendError(c, http.StatusBadRequest, "Bad Request",
					httpx.UM("WEBHOOK_VERIFY_FAILED", "webhookVerificationFailed", "Webhook verification failed"))
			}
		}

		var evt map[string]interface{}
		if err := json.Unmarshal(body, &evt); err != nil {
			return httpx.SendError(c, http.StatusBadRequest, "Bad Request",
				httpx.UMDetail("WEBHOOK_VERIFY_FAILED", err.Error()))
		}

		if err := clerkwebhook.ProcessDelivery(c.Request().Context(), svixID, evt); err != nil {
			webhookLog.Error().Err(err).Msg("Error processing webhook")
			return httpx.SendError(c, http.StatusInternalServerError, "Internal Server Error",
				httpx.UM("FAILED_PROCESS_WEBHOOK", "failedProcessWebhook", "Failed to process webhook"))
		}

		fallback := "Webhook processed"
		um := httpx.UserMessage{
			Code:            "WEBHOOK_OK",
			I18n:            &httpx.I18nPayload{Key: "api.webhookProcessed"},
			FallbackMessage: &fallback,
		}
		return httpx.SendUserMessage(c, http.StatusOK, map[string]interface{}{"success": true}, um)
	})
}
