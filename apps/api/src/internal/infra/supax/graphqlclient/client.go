package graphqlclient

import (
	"bytes"
	"context"
	"errors"
	"io"
	"net/http"
	"strings"
	"sync"
	"time"

	"linky-api/src/internal/config"
	"linky-api/src/internal/logger"
)

const graphqlPath = "/graphql/v1"

var (
	endpointURL string
	httpClient  *http.Client
	headers     map[string]string
	mu          sync.RWMutex
	log         = logger.New("infra:graphqlclient")
)

func Init(c *config.Config) error {
	mu.Lock()
	defer mu.Unlock()
	endpointURL = ""
	httpClient = nil
	headers = nil

	if c.SupabaseURL == "" || c.SupabaseServiceRoleKey == "" {
		log.Warn().Msg("Supabase URL or service role key not configured")
		return nil
	}

	endpointURL = strings.TrimRight(c.SupabaseURL, "/") + graphqlPath
	timeout := 10 * time.Second
	if c.SupabaseTimeoutMs > 0 {
		timeout = time.Duration(c.SupabaseTimeoutMs) * time.Millisecond
	}
	httpClient = &http.Client{Timeout: timeout}
	headers = map[string]string{
		"Authorization": "Bearer " + c.SupabaseServiceRoleKey,
		"apikey":        c.SupabaseServiceRoleKey,
		"Content-Type":  "application/json",
	}
	return nil
}

func Configured() bool {
	mu.RLock()
	defer mu.RUnlock()
	return endpointURL != "" && httpClient != nil
}

func Execute(ctx context.Context, body []byte) (status int, respBody []byte, err error) {
	mu.RLock()
	url := endpointURL
	client := httpClient
	hdrs := headers
	mu.RUnlock()

	if url == "" || client == nil {
		return 0, nil, errors.New("supabase graphql: not configured")
	}
	if err := ctx.Err(); err != nil {
		return 0, nil, err
	}

	req, err := http.NewRequestWithContext(ctx, http.MethodPost, url, bytes.NewReader(body))
	if err != nil {
		return 0, nil, err
	}
	for k, v := range hdrs {
		req.Header.Set(k, v)
	}

	res, err := client.Do(req)
	if err != nil {
		return 0, nil, err
	}
	defer res.Body.Close()

	respBody, err = io.ReadAll(res.Body)
	if err != nil {
		return res.StatusCode, nil, err
	}
	return res.StatusCode, respBody, nil
}

func Ping(ctx context.Context) error {
	_, _, err := Execute(ctx, []byte(`{"query":"{ __typename }"}`))
	return err
}
