package postgrest

import (
	"bytes"
	"context"
	"errors"
	"io"
	"net/http"
	"time"

	"linky-api/src/internal/infra/supax/rpc"
)

func Raw(ctx context.Context, method, url string, headers map[string]string, body []byte) ([]byte, error) {
	cfg := rpc.Config()
	if cfg == nil || cfg.SupabaseURL == "" {
		return nil, errors.New("supabase not configured")
	}
	var reader io.Reader
	if body != nil {
		reader = bytes.NewReader(body)
	}
	req, err := http.NewRequestWithContext(ctx, method, url, reader)
	if err != nil {
		return nil, err
	}
	for k, v := range headers {
		req.Header.Set(k, v)
	}
	timeout := time.Duration(cfg.SupabaseTimeoutMs) * time.Millisecond
	if timeout <= 0 {
		timeout = 30 * time.Second
	}
	client := &http.Client{Timeout: timeout}
	resp, err := client.Do(req)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()
	data, err := io.ReadAll(resp.Body)
	if err != nil {
		return nil, err
	}
	if resp.StatusCode >= 400 {
		return nil, errors.New("postgrest error: " + string(data))
	}
	return data, nil
}
