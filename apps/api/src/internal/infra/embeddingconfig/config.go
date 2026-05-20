package embeddingconfig

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"sync"
	"time"

	"linky-api/src/internal/logger"
)

const (
	AdminConfigKey     = "user_embeddings"
	defaultDimension   = 3072
	refreshInterval    = 30 * time.Second
	refreshTimeout     = 10 * time.Second
)

var (
	log = logger.New("infra:embeddingconfig")

	mu         sync.RWMutex
	dimension  = defaultDimension
	columnName = columnForDimension(defaultDimension)

	startOnce sync.Once

	reloadFn func(context.Context) error
)

type settings struct {
	Dimension int `json:"dimension"`
}

func Dimension() int {
	mu.RLock()
	defer mu.RUnlock()
	return dimension
}

func ColumnName() string {
	mu.RLock()
	defer mu.RUnlock()
	return columnName
}

func ColumnForDimension(dim int) (string, error) {
	col := columnForDimension(dim)
	if col == "" {
		return "", fmt.Errorf("unsupported embedding dimension %d", dim)
	}
	return col, nil
}

func columnForDimension(dim int) string {
	switch dim {
	case 384:
		return "e384"
	case 768:
		return "e768"
	case 1024:
		return "e1024"
	case 1536:
		return "e1536"
	case 3072:
		return "e3072"
	default:
		return ""
	}
}

func SetReloadFunc(fn func(context.Context) error) {
	reloadFn = fn
}

func ApplySettings(raw json.RawMessage) error {
	var s settings
	if len(raw) == 0 {
		return applyDimension(defaultDimension)
	}
	if err := json.Unmarshal(raw, &s); err != nil {
		return err
	}
	if s.Dimension <= 0 {
		return errors.New("user_embeddings.dimension must be positive")
	}
	return applyDimension(s.Dimension)
}

func applyDimension(dim int) error {
	col, err := ColumnForDimension(dim)
	if err != nil {
		return err
	}
	mu.Lock()
	prev := dimension
	dimension = dim
	columnName = col
	mu.Unlock()
	if prev != dim {
		log.Info().Int("dimension", dim).Str("column", col).Msg("User embedding dimension updated")
	}
	return nil
}

func Load(ctx context.Context) error {
	return Reload(ctx)
}

func Reload(ctx context.Context) error {
	if reloadFn == nil {
		return applyDimension(defaultDimension)
	}
	return reloadFn(ctx)
}

func StartRefresher(ctx context.Context) {
	startOnce.Do(func() {
		go func() {
			t := time.NewTicker(refreshInterval)
			defer t.Stop()
			for {
				select {
				case <-ctx.Done():
					return
				case <-t.C:
					rctx, cancel := context.WithTimeout(context.Background(), refreshTimeout)
					if err := Reload(rctx); err != nil {
						log.Warn().Err(err).Msg("User embedding config refresh failed")
					}
					cancel()
				}
			}
		}()
	})
}

func NotifyConfigChanged(ctx context.Context, key string, value map[string]any) {
	if key != AdminConfigKey {
		return
	}
	raw, err := json.Marshal(value)
	if err != nil {
		log.Warn().Err(err).Msg("Failed to encode user_embeddings admin config")
		return
	}
	if err := ApplySettings(raw); err != nil {
		log.Warn().Err(err).Msg("Failed to apply user_embeddings admin config")
		return
	}
	_ = ctx
}
