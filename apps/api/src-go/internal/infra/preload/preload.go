package preload

import (
	"context"
	"encoding/json"
	"time"

	"linky-api/src-go/internal/infra/redisx"
	"linky-api/src-go/internal/infra/supax"
	"linky-api/src-go/internal/logger"
)

var log = logger.New("infra:redis:cache-preload")

const (
	interestTagsKey      = "cache:interest_tags:list"
	interestTagItemPref  = "cache:interest_tag:"
	interestTagsTTL      = 24 * time.Hour
)

func PreloadReferenceData(ctx context.Context) {
	c := redisx.Client()
	if c == nil {
		log.Warn().Msg("Redis not available, skipping cache preload")
		return
	}
	rows, count, err := supax.GetInterestTags(ctx, "", "", true, 1000, 0)
	if err != nil {
		log.Error().Err(err).Msg("Cache preload failed")
		return
	}
	listPayload := map[string]any{
		"data":  rows,
		"count": count,
	}
	if buf, err := json.Marshal(listPayload); err == nil {
		_ = c.Set(ctx, interestTagsKey, buf, interestTagsTTL).Err()
	}
	for _, t := range rows {
		if buf, err := json.Marshal(t); err == nil {
			_ = c.Set(ctx, interestTagItemPref+t.ID, buf, interestTagsTTL).Err()
		}
	}
	log.Info().Int("interest_tags", len(rows)).Msg("Cache preload completed")
}
