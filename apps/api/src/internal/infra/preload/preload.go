package preload

import (
	"context"
	"sync"
	"time"

	"linky-api/src/internal/infra/supax"
	"linky-api/src/internal/logger"
)

var log = logger.New("infra:preload")

const (
	interestTagsTTL = 5 * time.Minute
)

type interestTagSnapshot struct {
	rows      []supax.InterestTagRow
	count     int64
	cachedAt  time.Time
	expiresAt time.Time
}

var (
	mu       sync.RWMutex
	tagsSnap *interestTagSnapshot
	tagByID  = map[string]supax.InterestTagRow{}

	startOnce sync.Once
)

func PreloadReferenceData(ctx context.Context) {
	if err := refreshInterestTagsOnce(ctx); err != nil {
		log.Error().Err(err).Msg("Initial interest tags preload failed")
	}
	startOnce.Do(func() {
		go refresher(ctx)
	})
}

func refresher(ctx context.Context) {
	t := time.NewTicker(interestTagsTTL)
	defer t.Stop()
	for {
		select {
		case <-ctx.Done():
			return
		case <-t.C:
			rctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
			if err := refreshInterestTagsOnce(rctx); err != nil {
				log.Warn().Err(err).Msg("Interest tags refresh failed")
			}
			cancel()
		}
	}
}

func refreshInterestTagsOnce(ctx context.Context) error {
	rows, count, err := supax.GetInterestTags(ctx, "", "", true, 1000, 0)
	if err != nil {
		return err
	}
	now := time.Now()
	mu.Lock()
	tagsSnap = &interestTagSnapshot{
		rows:      rows,
		count:     count,
		cachedAt:  now,
		expiresAt: now.Add(interestTagsTTL),
	}
	tagByID = make(map[string]supax.InterestTagRow, len(rows))
	for _, r := range rows {
		tagByID[r.ID] = r
	}
	mu.Unlock()
	log.Info().Int("interest_tags", len(rows)).Msg("Interest tags snapshot refreshed")
	return nil
}

func GetInterestTagsSnapshot() ([]supax.InterestTagRow, int64, bool) {
	mu.RLock()
	defer mu.RUnlock()
	if tagsSnap == nil {
		return nil, 0, false
	}
	out := make([]supax.InterestTagRow, len(tagsSnap.rows))
	copy(out, tagsSnap.rows)
	return out, tagsSnap.count, true
}

func GetInterestTagByID(id string) (supax.InterestTagRow, bool) {
	mu.RLock()
	defer mu.RUnlock()
	r, ok := tagByID[id]
	return r, ok
}
