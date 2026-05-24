package routes

import (
	"encoding/json"
	"errors"
	"io"
	"net/http"

	"github.com/labstack/echo/v4"

	appadmin "linky-api/src/internal/app/admin"
	"linky-api/src/internal/httpx"
)

func handleAdminAIConfigGet(c echo.Context) error {
	out, err := appadmin.GetAIConfig(c.Request().Context())
	if err != nil {
		return httpx.SendError(c, 500, "Internal Server Error",
			httpx.UM("FAILED_FETCH_AI_CONFIG", "failedFetchAiConfig", "Failed to fetch AI config"))
	}
	return c.JSON(http.StatusOK, out)
}

func handleAdminAIConfigPut(c echo.Context) error {
	rawBody, _ := io.ReadAll(c.Request().Body)
	var input struct {
		Value map[string]any `json:"value"`
	}
	_ = json.Unmarshal(rawBody, &input)
	out, err := appadmin.PutAIConfig(c.Request().Context(), input.Value)
	if err != nil {
		if errors.Is(err, appadmin.ErrAIConfigValueRequired) {
			return httpx.SendError(c, 400, "Bad Request",
				httpx.UM("AI_CONFIG_VALUE_REQUIRED", "aiConfigValueRequired", "value is required"))
		}
		if errors.Is(err, appadmin.ErrAIConfigInvalid) {
			return httpx.SendError(c, 400, "Bad Request",
				httpx.UM("AI_CONFIG_INVALID", "aiConfigInvalid", "Invalid AI config JSON"))
		}
		return httpx.SendError(c, 500, "Internal Server Error",
			httpx.UM("FAILED_UPSERT_AI_CONFIG", "failedUpsertAiConfig", "Failed to save AI config"))
	}
	return c.JSON(http.StatusOK, out)
}

func handleAdminAIModelsList(c echo.Context) error {
	capParam := c.QueryParam("capability")
	ctx := c.Request().Context()
	var capPtr *string
	if capParam != "" {
		capPtr = &capParam
	}
	out, err := appadmin.ListAIModels(ctx, capPtr)
	if err != nil {
		adminLog.Warn().Err(err).Str("capability", capParam).Msg("ListAIModels failed")
		return httpx.SendError(c, 502, "Bad Gateway",
			httpx.UMDetail("AI_MODELS_LIST_FAIL", err.Error()))
	}
	return c.JSON(http.StatusOK, out)
}
