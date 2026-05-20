package openaix

import (
	"bytes"
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"net/http"
	"strings"
	"time"

	"linky-api/src/internal/infra/aiconfig"
)

type apiError struct {
	StatusCode int
	Body       string
}

func (e *apiError) Error() string {
	if e.Body != "" {
		return fmt.Sprintf("openai: http %d: %s", e.StatusCode, e.Body)
	}
	return fmt.Sprintf("openai: http %d", e.StatusCode)
}

func apiV1Base() string {
	e := aiconfig.EffectiveConfig()
	base := strings.TrimRight(strings.TrimSpace(e.BaseURL), "/")
	if base == "" {
		return ""
	}
	if strings.HasSuffix(base, "/v1") {
		return base
	}
	return base + "/v1"
}

func httpClient() *http.Client {
	e := aiconfig.EffectiveConfig()
	timeout := 60 * time.Second
	if e.RequestTimeoutMs > 0 {
		timeout = time.Duration(e.RequestTimeoutMs) * time.Millisecond
	}
	return &http.Client{Timeout: timeout}
}

func embeddingHTTPClient() *http.Client {
	e := aiconfig.EffectiveConfig()
	timeout := 60 * time.Second
	if e.EmbeddingTimeoutMs > 0 {
		timeout = time.Duration(e.EmbeddingTimeoutMs) * time.Millisecond
	}
	return &http.Client{Timeout: timeout}
}

func postJSON(ctx context.Context, cap Capability, body any, client *http.Client) ([]byte, error) {
	if !Configured() {
		return nil, errors.New("openai: provider not configured")
	}
	path := cap.Path()
	if path == "" {
		return nil, fmt.Errorf("openai: unknown capability %q", cap)
	}
	base := apiV1Base()
	if base == "" {
		return nil, errors.New("openai: OPENAI_BASE_URL not configured")
	}
	raw, err := json.Marshal(body)
	if err != nil {
		return nil, err
	}
	req, err := http.NewRequestWithContext(ctx, http.MethodPost, base+path, bytes.NewReader(raw))
	if err != nil {
		return nil, err
	}
	req.Header.Set("Content-Type", "application/json")
	if key := aiconfig.EffectiveConfig().APIKey; key != "" {
		req.Header.Set("Authorization", "Bearer "+key)
	}
	if client == nil {
		client = httpClient()
	}
	resp, err := client.Do(req)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()
	respBody, err := io.ReadAll(io.LimitReader(resp.Body, 8<<20))
	if err != nil {
		return nil, err
	}
	if resp.StatusCode < 200 || resp.StatusCode >= 300 {
		msg := strings.TrimSpace(string(respBody))
		if len(msg) > 512 {
			msg = msg[:512] + "..."
		}
		return nil, &apiError{StatusCode: resp.StatusCode, Body: msg}
	}
	return respBody, nil
}

func shouldRetry(err error) bool {
	if err == nil {
		return false
	}
	var apiErr *apiError
	if errors.As(err, &apiErr) {
		switch apiErr.StatusCode {
		case 408, 409, 425, 429:
			return true
		default:
			return apiErr.StatusCode >= 500
		}
	}
	return true
}

func withRetries(ctx context.Context, fn func() error) error {
	retries := 0
	baseDelay := 400
	if cfg != nil {
		if cfg.EmbedRetryCount >= 0 {
			retries = cfg.EmbedRetryCount
		}
		if cfg.EmbedRetryBaseDelayMs > 0 {
			baseDelay = cfg.EmbedRetryBaseDelayMs
		}
	}
	var lastErr error
	for attempt := 0; attempt <= retries; attempt++ {
		lastErr = fn()
		if lastErr == nil {
			return nil
		}
		if attempt < retries && shouldRetry(lastErr) {
			select {
			case <-ctx.Done():
				return ctx.Err()
			case <-time.After(time.Duration(baseDelay<<attempt) * time.Millisecond):
			}
			continue
		}
		return lastErr
	}
	return lastErr
}
