package routes

import (
	"context"
	"encoding/json"
	"io"
	"net/http"

	"github.com/labstack/echo/v4"

	"linky-api/src/internal/httpx"
	"linky-api/src/internal/infra/aiconfig"
	"linky-api/src/internal/infra/openaix"
	"linky-api/src/internal/infra/supax"
)

func handleAdminConfigList(c echo.Context) error {
	rows, err := supax.ListAdminConfig(c.Request().Context())
	if err != nil {
		adminLog.Error().Err(err).Msg("ListAdminConfig failed")
		return httpx.SendError(c, 500, "Internal Server Error",
			httpx.UM("FAILED_FETCH_ADMIN_CONFIG", "failedFetchAdminConfig", "Failed to fetch admin config"))
	}
	if rows == nil {
		rows = []supax.AdminConfigRow{}
	}
	for i := range rows {
		rows[i].Value = aiconfig.RedactAdminConfigRow(rows[i].Key, rows[i].Value)
	}
	return c.JSON(http.StatusOK, map[string]any{"data": rows})
}

const deprecatedUserEmbeddingsConfigKey = "user_embeddings"

func handleAdminConfigUpsert(c echo.Context) error {
	key := c.Param("key")
	if key == "" {
		return httpx.SendError(c, 400, "Bad Request",
			httpx.UM("ADMIN_CONFIG_KEY_REQUIRED", "adminConfigKeyRequired", "key required"))
	}
	if key == deprecatedUserEmbeddingsConfigKey {
		return httpx.SendError(c, 400, "Bad Request",
			httpx.UMDetail("ADMIN_CONFIG_KEY_DEPRECATED", "Use /admin/config/ai (ai.embedding.dimension) instead of user_embeddings"))
	}
	rawBody, _ := io.ReadAll(c.Request().Body)
	var input struct {
		Value map[string]any `json:"value"`
	}
	_ = json.Unmarshal(rawBody, &input)
	if input.Value == nil {
		input.Value = map[string]any{}
	}
	ctx := c.Request().Context()
	value := input.Value
	if key == aiconfig.AdminConfigKey {
		prepared, err := prepareAIConfigMap(ctx, value)
		if err != nil {
			return httpx.SendError(c, 400, "Bad Request",
				httpx.UM("AI_CONFIG_INVALID", "aiConfigInvalid", "Invalid AI config JSON"))
		}
		value = prepared
	}
	row, err := supax.UpsertAdminConfig(ctx, key, value)
	if err != nil {
		return httpx.SendError(c, 500, "Internal Server Error",
			httpx.UM("FAILED_UPSERT_ADMIN_CONFIG", "failedUpsertAdminConfig", "Failed to upsert admin config"))
	}
	notifyAdminConfigChanged(ctx, key, value)
	if key == aiconfig.AdminConfigKey && row != nil {
		if v, ok := row["value"].(map[string]any); ok {
			row["value"] = aiconfig.RedactSettingsMap(v)
		}
	}
	return c.JSON(http.StatusOK, row)
}

func prepareAIConfigMap(ctx context.Context, value map[string]any) (map[string]any, error) {
	incoming, err := aiconfig.SettingsFromMap(value)
	if err != nil {
		return nil, err
	}
	existing := aiconfig.AdminSettings()
	if raw, err := supax.GetAdminConfigValue(ctx, aiconfig.AdminConfigKey); err == nil && len(raw) > 0 {
		if prev, err := aiconfig.SettingsMapFromRaw(raw); err == nil {
			existing = prev
		}
	}
	return aiconfig.SettingsToMap(aiconfig.MergeSettingsForUpsert(incoming, existing))
}

func notifyAdminConfigChanged(ctx context.Context, key string, value map[string]any) {
	aiconfig.NotifyConfigChanged(ctx, key, value)
	if key == aiconfig.AdminConfigKey {
		openaix.TriggerModelsRefreshAsync()
	}
}

func handleAdminConfigGet(c echo.Context) error {
	key := c.Param("key")
	if key == "" {
		return httpx.SendError(c, 400, "Bad Request",
			httpx.UM("ADMIN_CONFIG_KEY_REQUIRED", "adminConfigKeyRequired", "key required"))
	}
	rows, err := supax.ListAdminConfig(c.Request().Context())
	if err != nil {
		return httpx.SendError(c, 500, "Internal Server Error",
			httpx.UM("FAILED_FETCH_ADMIN_CONFIG", "failedFetchAdminConfig", "Failed to fetch admin config"))
	}
	for _, r := range rows {
		if r.Key == key {
			return c.JSON(http.StatusOK, r)
		}
	}
	return httpx.SendError(c, 404, "Not Found",
		httpx.UM("ADMIN_CONFIG_NOT_FOUND", "adminConfigNotFound", "admin config not found"))
}

func handleAdminConfigPost(c echo.Context) error {
	body, _ := io.ReadAll(c.Request().Body)
	var input struct {
		Key   string         `json:"key"`
		Value map[string]any `json:"value"`
	}
	_ = json.Unmarshal(body, &input)
	if input.Value == nil {
		input.Value = map[string]any{}
	}
	if input.Key == "" {
		return httpx.SendError(c, 400, "Bad Request",
			httpx.UM("ADMIN_CONFIG_KEY_REQUIRED", "adminConfigKeyRequired", "key required"))
	}
	if input.Key == deprecatedUserEmbeddingsConfigKey {
		return httpx.SendError(c, 400, "Bad Request",
			httpx.UMDetail("ADMIN_CONFIG_KEY_DEPRECATED", "Use /admin/config/ai (ai.embedding.dimension) instead of user_embeddings"))
	}
	ctx := c.Request().Context()
	value := input.Value
	if input.Key == aiconfig.AdminConfigKey {
		prepared, err := prepareAIConfigMap(ctx, value)
		if err != nil {
			return httpx.SendError(c, 400, "Bad Request",
				httpx.UM("AI_CONFIG_INVALID", "aiConfigInvalid", "Invalid AI config JSON"))
		}
		value = prepared
	}
	row, err := supax.UpsertAdminConfig(ctx, input.Key, value)
	if err != nil {
		return httpx.SendError(c, 500, "Internal Server Error",
			httpx.UM("FAILED_UPSERT_ADMIN_CONFIG", "failedUpsertAdminConfig", "Failed to upsert admin config"))
	}
	notifyAdminConfigChanged(ctx, input.Key, value)
	if input.Key == aiconfig.AdminConfigKey && row != nil {
		if v, ok := row["value"].(map[string]any); ok {
			row["value"] = aiconfig.RedactSettingsMap(v)
		}
	}
	return c.JSON(http.StatusCreated, row)
}

func handleAdminConfigDelete(c echo.Context) error {
	key := c.Param("key")
	if key == "" {
		return httpx.SendError(c, 400, "Bad Request",
			httpx.UM("ADMIN_CONFIG_KEY_REQUIRED", "adminConfigKeyRequired", "key required"))
	}
	if err := supax.DeleteAdminConfig(c.Request().Context(), key); err != nil {
		return httpx.SendError(c, 500, "Internal Server Error",
			httpx.UM("FAILED_DELETE_ADMIN_CONFIG", "failedDeleteAdminConfig", "Failed to delete admin config"))
	}
	return c.NoContent(http.StatusNoContent)
}
