package supax

import (
	"bytes"
	"context"
	"errors"
	"io"
	"net/http"
	"time"
)

func postgrestRaw(ctx context.Context, method, url string, headers map[string]string, body []byte) ([]byte, error) {
	if rpcCfg == nil || rpcCfg.SupabaseURL == "" {
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
	timeout := time.Duration(rpcCfg.SupabaseTimeoutMs) * time.Millisecond
	if timeout <= 0 {
		timeout = 10 * time.Second
	}
	client := &http.Client{Timeout: timeout}
	resp, err := client.Do(req)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()
	raw, _ := io.ReadAll(resp.Body)
	if resp.StatusCode >= 400 {
		return nil, errors.New("postgrest " + method + " " + url + " status " + resp.Status + " body " + string(raw))
	}
	return raw, nil
}
