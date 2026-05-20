package supax

import (
	"context"

	"linky-api/src/internal/infra/aiconfig"
)

func RefreshAIConfig(ctx context.Context) error {
	raw, err := GetAdminConfigValue(ctx, aiconfig.AdminConfigKey)
	if err != nil {
		return err
	}
	if len(raw) == 0 {
		return aiconfig.ApplySettings(nil)
	}
	return aiconfig.ApplySettings(raw)
}

func init() {
	aiconfig.SetReloadFunc(RefreshAIConfig)
}
