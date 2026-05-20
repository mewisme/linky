package supax

import (
	"context"

	"linky-api/src/internal/infra/embeddingconfig"
)

func RefreshEmbeddingConfig(ctx context.Context) error {
	raw, err := GetAdminConfigValue(ctx, embeddingconfig.AdminConfigKey)
	if err != nil {
		return err
	}
	if len(raw) == 0 {
		return embeddingconfig.ApplySettings(nil)
	}
	return embeddingconfig.ApplySettings(raw)
}

func init() {
	embeddingconfig.SetReloadFunc(RefreshEmbeddingConfig)
}
