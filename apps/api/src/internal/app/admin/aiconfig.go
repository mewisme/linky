package admin

import (
	"context"
	"encoding/json"
	"errors"

	"linky-api/src/internal/infra/aiconfig"
	"linky-api/src/internal/infra/openaix"
	"linky-api/src/internal/infra/supax"
)

var (
	ErrAIConfigValueRequired = errors.New("value is required")
	ErrAIConfigInvalid       = errors.New("invalid AI config JSON")
)

func GetAIConfig(ctx context.Context) (map[string]any, error) {
	var adminValue map[string]any
	raw, err := supax.GetAdminConfigValue(ctx, aiconfig.AdminConfigKey)
	if err != nil {
		return nil, err
	}
	if len(raw) > 0 {
		_ = json.Unmarshal(raw, &adminValue)
		adminValue = aiconfig.RedactSettingsMap(adminValue)
	}
	return map[string]any{
		"key":                aiconfig.AdminConfigKey,
		"admin":              adminValue,
		"effective":          aiconfig.EffectiveToPublicMap(),
		"env_defaults":       aiconfig.DefaultSettingsPublicFromEnv(),
		"has_admin_config":   aiconfig.HasAdminOverlay(),
		"api_key_configured": aiconfig.APIKeyConfigured(),
	}, nil
}

func PutAIConfig(ctx context.Context, value map[string]any) (map[string]any, error) {
	if value == nil {
		return nil, ErrAIConfigValueRequired
	}
	incoming, err := aiconfig.SettingsFromMap(value)
	if err != nil {
		return nil, ErrAIConfigInvalid
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
		return nil, err
	}
	if _, err := supax.UpsertAdminConfig(ctx, aiconfig.AdminConfigKey, mergedMap); err != nil {
		return nil, err
	}
	aiconfig.NotifyConfigChanged(ctx, aiconfig.AdminConfigKey, mergedMap)
	openaix.TriggerModelsRefreshAsync()
	return map[string]any{
		"key":                aiconfig.AdminConfigKey,
		"effective":          aiconfig.EffectiveToPublicMap(),
		"api_key_configured": aiconfig.APIKeyConfigured(),
	}, nil
}

func ListAIModels(ctx context.Context, capability *string) (any, error) {
	if capability != nil && *capability != "" {
		cap := openaix.Capability(*capability)
		list, err := openaix.ListModels(ctx, cap)
		if err != nil {
			return nil, err
		}
		return map[string]any{
			"capability": *capability,
			"data":       list.Data,
			"object":     list.Object,
		}, nil
	}
	all, err := openaix.ListAllCapabilityModels(ctx)
	if err != nil {
		return nil, err
	}
	out := make(map[string]any, len(all))
	for k, v := range all {
		if v == nil {
			continue
		}
		out[k] = map[string]any{"object": v.Object, "data": v.Data}
	}
	return map[string]any{"capabilities": out}, nil
}
