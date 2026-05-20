package openaix

import (
	"context"
	"strings"
	"sync"
	"time"

	"linky-api/src/internal/infra/aiconfig"
	"linky-api/src/internal/logger"
)

const (
	modelsRefreshInterval = 10 * time.Minute
	modelsRefreshTimeout  = 60 * time.Second
)

var (
	modelsLog = logger.New("infra:openaix:models")

	modelsMu     sync.RWMutex
	modelsByCap  map[string]*ModelsListResponse
	modelsLoaded bool

	modelsRefreshOnce sync.Once
)

func allCapabilities() []Capability {
	return []Capability{
		CapabilityChat,
		CapabilityEmbedding,
		CapabilityImage,
		CapabilityTTS,
		CapabilitySTT,
		CapabilityWebSearch,
		CapabilityWebFetch,
	}
}

func fetchAllCapabilityModels(ctx context.Context) (map[string]*ModelsListResponse, error) {
	caps := allCapabilities()
	out := make(map[string]*ModelsListResponse, len(caps))
	for _, cap := range caps {
		list, err := fetchModels(ctx, cap)
		if err != nil {
			return nil, err
		}
		out[string(cap)] = list
	}
	return out, nil
}

func RefreshModelsCache(ctx context.Context) error {
	e := aiconfig.EffectiveConfig()
	if strings.TrimSpace(e.BaseURL) == "" {
		modelsMu.Lock()
		modelsByCap = map[string]*ModelsListResponse{}
		modelsLoaded = true
		modelsMu.Unlock()
		return nil
	}
	all, err := fetchAllCapabilityModels(ctx)
	if err != nil {
		return err
	}
	modelsMu.Lock()
	modelsByCap = all
	modelsLoaded = true
	modelsMu.Unlock()
	modelsLog.Info().Int("capabilities", len(all)).Msg("AI models cache refreshed")
	return nil
}

func copyModelsCache() (map[string]*ModelsListResponse, bool) {
	modelsMu.RLock()
	defer modelsMu.RUnlock()
	if !modelsLoaded {
		return nil, false
	}
	out := make(map[string]*ModelsListResponse, len(modelsByCap))
	for k, v := range modelsByCap {
		out[k] = v
	}
	return out, true
}

func ListAllCapabilityModels(ctx context.Context) (map[string]*ModelsListResponse, error) {
	if out, ok := copyModelsCache(); ok {
		return out, nil
	}
	if err := RefreshModelsCache(ctx); err != nil {
		return nil, err
	}
	out, _ := copyModelsCache()
	return out, nil
}

func ListModels(ctx context.Context, cap Capability) (*ModelsListResponse, error) {
	modelsMu.RLock()
	if modelsLoaded {
		if list, ok := modelsByCap[string(cap)]; ok && list != nil {
			modelsMu.RUnlock()
			return list, nil
		}
	}
	modelsMu.RUnlock()
	return fetchModels(ctx, cap)
}

func StartModelsRefresher(ctx context.Context) {
	modelsRefreshOnce.Do(func() {
		go func() {
			refresh := func() {
				rctx, cancel := context.WithTimeout(context.Background(), modelsRefreshTimeout)
				err := RefreshModelsCache(rctx)
				cancel()
				if err != nil {
					modelsLog.Warn().Err(err).Msg("AI models cache refresh failed")
				}
			}
			refresh()
			t := time.NewTicker(modelsRefreshInterval)
			defer t.Stop()
			for {
				select {
				case <-ctx.Done():
					return
				case <-t.C:
					refresh()
				}
			}
		}()
	})
}

func TriggerModelsRefreshAsync() {
	go func() {
		rctx, cancel := context.WithTimeout(context.Background(), modelsRefreshTimeout)
		defer cancel()
		if err := RefreshModelsCache(rctx); err != nil {
			modelsLog.Warn().Err(err).Msg("AI models cache refresh failed")
		}
	}()
}
