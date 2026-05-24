package routes

import (
	"encoding/json"
	"io"
	"net/http"

	"github.com/labstack/echo/v4"

	"linky-api/src/internal/httpx"
	"linky-api/src/internal/infra/supax"
)

func registerUserSettingsRoutes(g *echo.Group) {
	g.GET("/me", handleUserSettingsGet)
	g.PUT("/me", handleUserSettingsPut)
	g.PATCH("/me", handleUserSettingsPut)
}

func handleUserSettingsGet(c echo.Context) error {
	clerkID := httpx.MustClerkUserID(c)
	uid, _ := supax.GetUserInternalID(c.Request().Context(), clerkID)
	if uid == "" {
		return httpx.SendError(c, 404, "Not Found",
			httpx.UM("USER_NOT_IN_DB", "userNotInDatabase", "User not found in database"))
	}
	settings, err := supax.GetUserSettings(c.Request().Context(), uid)
	if err != nil {
		return httpx.SendError(c, 500, "Internal Server Error",
			httpx.UM("FAILED_FETCH_SETTINGS", "failedFetchUserSettings", "Failed to fetch user settings"))
	}
	if settings == nil {
		return httpx.SendError(c, 404, "Not Found",
			httpx.UM("USER_SETTINGS_NOT_FOUND", "userSettingsNotFound", "User settings not found"))
	}
	return c.JSON(http.StatusOK, settings)
}

func handleUserSettingsPut(c echo.Context) error {
	clerkID := httpx.MustClerkUserID(c)
	uid, _ := supax.GetUserInternalID(c.Request().Context(), clerkID)
	if uid == "" {
		return httpx.SendError(c, 404, "Not Found",
			httpx.UM("USER_NOT_IN_DB", "userNotInDatabase", "User not found in database"))
	}
	raw, _ := io.ReadAll(c.Request().Body)
	var body map[string]any
	_ = json.Unmarshal(raw, &body)
	if body == nil {
		body = map[string]any{}
	}
	delete(body, "user_id")
	out, err := supax.UpsertUserSettings(c.Request().Context(), uid, body)
	if err != nil {
		return httpx.SendError(c, 500, "Internal Server Error",
			httpx.UM("FAILED_UPDATE_SETTINGS", "failedUpdateUserSettings", "Failed to update user settings"))
	}
	return c.JSON(http.StatusOK, out)
}
