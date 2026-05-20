package openaix

import (
	"context"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"strings"

	"linky-api/src/internal/infra/aiconfig"
)

type ModelEntry struct {
	ID      string `json:"id"`
	Object  string `json:"object"`
	OwnedBy string `json:"owned_by"`
	Kind    string `json:"kind,omitempty"`
	Created int64  `json:"created,omitempty"`
}

type ModelsListResponse struct {
	Object string       `json:"object"`
	Data   []ModelEntry `json:"data"`
}

func fetchModels(ctx context.Context, cap Capability) (*ModelsListResponse, error) {
	e := aiconfig.EffectiveConfig()
	base := strings.TrimRight(strings.TrimSpace(e.BaseURL), "/")
	if base == "" {
		return nil, fmt.Errorf("openai: base URL not configured")
	}
	if strings.HasSuffix(base, "/v1") {
		base = strings.TrimSuffix(base, "/v1")
	}
	path := cap.ModelsListPath()
	url := base + "/v1" + path

	req, err := http.NewRequestWithContext(ctx, http.MethodGet, url, nil)
	if err != nil {
		return nil, err
	}
	if e.APIKey != "" {
		req.Header.Set("Authorization", "Bearer "+e.APIKey)
	}
	resp, err := httpClient().Do(req)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()
	body, err := io.ReadAll(io.LimitReader(resp.Body, 4<<20))
	if err != nil {
		return nil, err
	}
	if resp.StatusCode < 200 || resp.StatusCode >= 300 {
		msg := strings.TrimSpace(string(body))
		if len(msg) > 512 {
			msg = msg[:512] + "..."
		}
		return nil, &apiError{StatusCode: resp.StatusCode, Body: msg}
	}
	var out ModelsListResponse
	if err := json.Unmarshal(body, &out); err != nil {
		return nil, err
	}
	return &out, nil
}
