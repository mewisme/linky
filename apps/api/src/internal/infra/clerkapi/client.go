package clerkapi

import (
	"bytes"
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"net/http"
	"net/url"
	"strings"
	"sync"
	"time"

	"linky-api/src/internal/config"
	"linky-api/src/internal/logger"
)

const (
	defaultBaseURL = "https://api.clerk.com/v1"
	defaultTimeout = 15 * time.Second
)

var (
	cfg           *config.Config
	once          sync.Once
	defaultClient *Client
	log           = logger.New("infra:clerkapi")
)

type Client struct {
	baseURL    string
	secretKey  string
	httpClient *http.Client
}

func Init(c *config.Config) {
	cfg = c
	once.Do(func() {
		defaultClient = NewClient(c.ClerkSecretKey, "")
	})
}

func NewClient(secretKey, baseURL string) *Client {
	if baseURL == "" {
		baseURL = defaultBaseURL
	}
	baseURL = strings.TrimRight(baseURL, "/")
	return &Client{
		baseURL:    baseURL,
		secretKey:  strings.TrimSpace(secretKey),
		httpClient: &http.Client{Timeout: defaultTimeout},
	}
}

func Default() (*Client, error) {
	if defaultClient == nil || defaultClient.secretKey == "" {
		return nil, ErrNotConfigured
	}
	return defaultClient, nil
}

func (c *Client) configured() bool {
	return c != nil && c.secretKey != ""
}

type requestOptions struct {
	query url.Values
	body  any
}

func (c *Client) Get(ctx context.Context, path string, query url.Values, out any) error {
	return c.do(ctx, http.MethodGet, path, requestOptions{query: query}, out)
}

func (c *Client) Post(ctx context.Context, path string, body any, out any) error {
	return c.do(ctx, http.MethodPost, path, requestOptions{body: body}, out)
}

func (c *Client) Patch(ctx context.Context, path string, body any, out any) error {
	return c.do(ctx, http.MethodPatch, path, requestOptions{body: body}, out)
}

func (c *Client) Put(ctx context.Context, path string, body any, out any) error {
	return c.do(ctx, http.MethodPut, path, requestOptions{body: body}, out)
}

func (c *Client) Delete(ctx context.Context, path string, out any) error {
	return c.do(ctx, http.MethodDelete, path, requestOptions{}, out)
}

func (c *Client) do(ctx context.Context, method, path string, opts requestOptions, out any) error {
	if !c.configured() {
		return ErrNotConfigured
	}
	path = "/" + strings.Trim(path, "/")
	u, err := url.Parse(c.baseURL + path)
	if err != nil {
		return err
	}
	if len(opts.query) > 0 {
		u.RawQuery = opts.query.Encode()
	}

	var bodyReader io.Reader
	if opts.body != nil {
		raw, err := json.Marshal(opts.body)
		if err != nil {
			return err
		}
		bodyReader = bytes.NewReader(raw)
	}

	req, err := http.NewRequestWithContext(ctx, method, u.String(), bodyReader)
	if err != nil {
		return err
	}
	req.Header.Set("Authorization", "Bearer "+c.secretKey)
	if opts.body != nil {
		req.Header.Set("Content-Type", "application/json")
	}

	resp, err := c.httpClient.Do(req)
	if err != nil {
		return err
	}
	defer resp.Body.Close()

	raw, err := io.ReadAll(resp.Body)
	if err != nil {
		return err
	}

	if resp.StatusCode < 200 || resp.StatusCode >= 300 {
		return parseAPIError(resp.StatusCode, raw)
	}

	if out == nil || len(raw) == 0 || bytes.Equal(bytes.TrimSpace(raw), []byte("null")) {
		return nil
	}
	if err := json.Unmarshal(raw, out); err != nil {
		return fmt.Errorf("clerkapi: decode response: %w", err)
	}
	return nil
}

func userPath(id string, segments ...string) (string, error) {
	id = strings.TrimSpace(id)
	if id == "" {
		return "", errors.New("clerkapi: user id required")
	}
	parts := append([]string{"/users", id}, segments...)
	return strings.Join(parts, "/"), nil
}
