package api

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"io"
	"log/slog"
	"math"
	"net"
	"net/http"
	"strings"
	"sync"
	"time"

	"github.com/google/uuid"
)

type EnvConfig struct {
	InternalAPIBaseURL          string
	InternalAPISocketPath       string
	InternalAPITimeoutMs        int
	InternalAPIMaxRetries       int
	InternalAPIRetryBaseDelayMs int
}

type Result struct {
	OK           bool
	Dropped      bool
	Attempts     int
	LastStatus   int
	ErrorMessage string
}

const internalWorkerJobsPath = "/internal/worker/v1/jobs"

var (
	clientOnce sync.Once
	httpClient *http.Client
	clientCfg  EnvConfig
)

func internalAPIClient(cfg EnvConfig) *http.Client {
	clientOnce.Do(func() {
		clientCfg = cfg
		httpClient = newInternalAPIClient(cfg)
	})
	return httpClient
}

func newInternalAPIClient(cfg EnvConfig) *http.Client {
	transport := &http.Transport{
		MaxIdleConns:          100,
		IdleConnTimeout:       90 * time.Second,
		TLSHandshakeTimeout:   10 * time.Second,
		ExpectContinueTimeout: 1 * time.Second,
	}

	if cfg.InternalAPISocketPath != "" {
		socketPath := cfg.InternalAPISocketPath
		dialer := &net.Dialer{}
		transport.DialContext = func(ctx context.Context, _, _ string) (net.Conn, error) {
			return dialer.DialContext(ctx, "unix", socketPath)
		}
	} else {
		transport.DialContext = (&net.Dialer{
			Timeout:   30 * time.Second,
			KeepAlive: 30 * time.Second,
		}).DialContext
	}

	return &http.Client{Transport: transport}
}

func internalAPIURL(cfg EnvConfig) string {
	if cfg.InternalAPISocketPath != "" {
		return "http://unix" + internalWorkerJobsPath
	}
	return strings.TrimRight(cfg.InternalAPIBaseURL, "/") + internalWorkerJobsPath
}

func PostEnvelope(ctx context.Context, cfg EnvConfig, envelope interface{}, rawRedisPayload string, logger *slog.Logger) Result {
	url := internalAPIURL(cfg)
	body, err := json.Marshal(envelope)
	if err != nil {
		logger.Error("failed to marshal envelope", "error", err)
		return Result{OK: false, Dropped: true, Attempts: 0, ErrorMessage: err.Error()}
	}

	idempotencyKey := SHA256Hex(rawRedisPayload)
	requestID := uuid.New().String()

	var lastResult Result
	for attempt := 0; attempt <= cfg.InternalAPIMaxRetries; attempt++ {
		result := tryPost(ctx, url, body, cfg, idempotencyKey, requestID, attempt, logger)
		result.Attempts = attempt + 1
		if result.OK || result.Dropped {
			return result
		}
		lastResult = result

		if attempt < cfg.InternalAPIMaxRetries {
			delay := time.Duration(cfg.InternalAPIRetryBaseDelayMs)*time.Millisecond * time.Duration(math.Pow(2, float64(attempt)))
			select {
			case <-ctx.Done():
				lastResult.ErrorMessage = ctx.Err().Error()
				return lastResult
			case <-time.After(delay):
			}
		}
	}

	return lastResult
}

func tryPost(ctx context.Context, url string, body []byte, cfg EnvConfig, idempotencyKey, requestID string, attempt int, logger *slog.Logger) Result {
	reqCtx, cancel := context.WithTimeout(ctx, time.Duration(cfg.InternalAPITimeoutMs)*time.Millisecond)
	defer cancel()

	req, err := http.NewRequestWithContext(reqCtx, http.MethodPost, url, bytes.NewReader(body))
	if err != nil {
		logger.Warn("internal API request creation failed", "attempt", attempt, "requestId", requestID, "error", err)
		if attempt >= cfg.InternalAPIMaxRetries {
			logger.Error("internal API transport gave up", "requestId", requestID, "error", err)
		}
		return Result{OK: false, Dropped: false, ErrorMessage: err.Error()}
	}

	for k, v := range BuildHeaders(idempotencyKey, requestID) {
		req.Header.Set(k, v)
	}

	resp, err := internalAPIClient(cfg).Do(req)
	if err != nil {
		logger.Warn("internal API transport error", "attempt", attempt, "requestId", requestID, "error", err)
		if attempt >= cfg.InternalAPIMaxRetries {
			logger.Error("internal API transport gave up", "requestId", requestID, "error", err)
		}
		return Result{OK: false, Dropped: false, ErrorMessage: err.Error()}
	}
	defer resp.Body.Close()

	respBody, _ := io.ReadAll(resp.Body)

	if resp.StatusCode == http.StatusOK || resp.StatusCode == http.StatusNoContent {
		return Result{OK: true, LastStatus: resp.StatusCode}
	}

	parsedErr := parseErrorBody(respBody)
	bodyStr := string(respBody)
	if parsedErr != nil {
		bodyStr = fmt.Sprintf("%s: %s", parsedErr.Error, parsedErr.Message)
	}

	if resp.StatusCode == http.StatusBadRequest || resp.StatusCode == http.StatusUnauthorized || resp.StatusCode == http.StatusConflict {
		logger.Error("internal API rejected job",
			"status", resp.StatusCode,
			"requestId", requestID,
			"body", bodyStr,
		)
		return Result{OK: false, Dropped: true, LastStatus: resp.StatusCode, ErrorMessage: bodyStr}
	}

	logger.Warn("internal API transient failure",
		"status", resp.StatusCode,
		"attempt", attempt,
		"requestId", requestID,
	)

	if attempt >= cfg.InternalAPIMaxRetries {
		logger.Error("internal API gave up",
			"status", resp.StatusCode,
			"requestId", requestID,
		)
	}

	return Result{OK: false, Dropped: false, LastStatus: resp.StatusCode, ErrorMessage: bodyStr}
}

type errorBody struct {
	Error   string `json:"error"`
	Message string `json:"message"`
}

func parseErrorBody(body []byte) *errorBody {
	var eb errorBody
	if err := json.Unmarshal(body, &eb); err != nil {
		return nil
	}
	if eb.Error == "" || eb.Message == "" {
		return nil
	}
	return &eb
}
