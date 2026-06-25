package routes

import (
	"encoding/json"
	"io"
	"net/http"

	"github.com/labstack/echo/v4"

	"linky-api/src/internal/httpx"
	"linky-api/src/internal/infra/aiconfig"
	"linky-api/src/internal/infra/openaix"
	"linky-api/src/internal/infra/supax"
)

func handleAdminAIConfigGet(c echo.Context) error {
	ctx := c.Request().Context()
	var adminValue map[string]any
	raw, err := supax.GetAdminConfigValue(ctx, aiconfig.AdminConfigKey)
	if err != nil {
		return httpx.SendError(c, 500, "Internal Server Error",
			httpx.UM("FAILED_FETCH_AI_CONFIG", "failedFetchAiConfig", "Failed to fetch AI config"))
	}
	if len(raw) > 0 {
		_ = json.Unmarshal(raw, &adminValue)
		adminValue = aiconfig.RedactSettingsMap(adminValue)
	}
	return c.JSON(http.StatusOK, map[string]any{
		"key":                aiconfig.AdminConfigKey,
		"admin":              adminValue,
		"effective":          aiconfig.EffectiveToPublicMap(),
		"env_defaults":       aiconfig.DefaultSettingsPublicFromEnv(),
		"has_admin_config":   aiconfig.HasAdminOverlay(),
		"api_key_configured": aiconfig.APIKeyConfigured(),
	})
}

func handleAdminAIConfigPut(c echo.Context) error {
	ctx := c.Request().Context()
	rawBody, _ := io.ReadAll(c.Request().Body)
	var input struct {
		Value map[string]any `json:"value"`
	}
	_ = json.Unmarshal(rawBody, &input)
	if input.Value == nil {
		return httpx.SendError(c, 400, "Bad Request",
			httpx.UM("AI_CONFIG_VALUE_REQUIRED", "aiConfigValueRequired", "value is required"))
	}
	incoming, err := aiconfig.SettingsFromMap(input.Value)
	if err != nil {
		return httpx.SendError(c, 400, "Bad Request",
			httpx.UM("AI_CONFIG_INVALID", "aiConfigInvalid", "Invalid AI config JSON"))
	}
	existing := aiconfig.AdminSettings()
	if raw, err := supax.GetAdminConfigValue(ctx, aiconfig.AdminConfigKey); err == nil && len(raw) > 0 {
		if prev, err := aiconfig.SettingsMapFromRaw(raw); err == nil {
			existing = prev
		}
	}
	merged := aiconfig.MergeSettingsForUpsert(incoming, existing)
	mergedMap, err := aiconfig.SettingsToMap(merged)
	if err != nil {
		return httpx.SendError(c, 500, "Internal Server Error",
			httpx.UM("FAILED_UPSERT_AI_CONFIG", "failedUpsertAiConfig", "Failed to save AI config"))
	}
	if _, err := supax.UpsertAdminConfig(ctx, aiconfig.AdminConfigKey, mergedMap); err != nil {
		return httpx.SendError(c, 500, "Internal Server Error",
			httpx.UM("FAILED_UPSERT_AI_CONFIG", "failedUpsertAiConfig", "Failed to save AI config"))
	}
	aiconfig.NotifyConfigChanged(ctx, aiconfig.AdminConfigKey, mergedMap)
	openaix.TriggerModelsRefreshAsync()
	return c.JSON(http.StatusOK, map[string]any{
		"key":                aiconfig.AdminConfigKey,
		"effective":          aiconfig.EffectiveToPublicMap(),
		"api_key_configured": aiconfig.APIKeyConfigured(),
	})
}

func handleAdminAIModelsList(c echo.Context) error {
	capParam := c.QueryParam("capability")
	ctx := c.Request().Context()
	if capParam != "" {
		cap := openaix.Capability(capParam)
		list, err := openaix.ListModels(ctx, cap)
		if err != nil {
			adminLog.Warn().Err(err).Str("capability", capParam).Msg("ListModels failed")
			return httpx.SendError(c, 502, "Bad Gateway",
				httpx.UMDetail("AI_MODELS_LIST_FAIL", err.Error()))
		}
		return c.JSON(http.StatusOK, map[string]any{
			"capability": capParam,
			"data":       list.Data,
			"object":     list.Object,
		})
	}
	all, err := openaix.ListAllCapabilityModels(ctx)
	if err != nil {
		adminLog.Warn().Err(err).Msg("ListAllCapabilityModels failed")
		return httpx.SendError(c, 502, "Bad Gateway",
			httpx.UMDetail("AI_MODELS_LIST_FAIL", err.Error()))
	}
	out := make(map[string]any, len(all))
	for k, v := range all {
		if v == nil {
			continue
		}
		out[k] = map[string]any{"object": v.Object, "data": v.Data}
	}
	return c.JSON(http.StatusOK, map[string]any{"capabilities": out})
}
