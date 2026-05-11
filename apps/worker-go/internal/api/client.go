package api

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"io"
	"log/slog"
	"math"
	"net/http"
	"strings"
	"time"

	"github.com/google/uuid"
)

type EnvConfig struct {
	InternalAPIBaseURL        string
	InternalWorkerSecret      string
	InternalAPITimeoutMs      int
	InternalAPIMaxRetries     int
	InternalAPIRetryBaseDelayMs int
}

type Result struct {
	OK      bool
	Dropped bool
}

func PostEnvelope(ctx context.Context, cfg EnvConfig, envelope interface{}, rawRedisPayload string, logger *slog.Logger) Result {
	url := strings.TrimRight(cfg.InternalAPIBaseURL, "/") + "/internal/worker/v1/jobs"
	body, err := json.Marshal(envelope)
	if err != nil {
		logger.Error("failed to marshal envelope", "error", err)
		return Result{OK: false, Dropped: true}
	}

	idempotencyKey := SHA256Hex(rawRedisPayload)
	requestID := uuid.New().String()

	for attempt := 0; attempt <= cfg.InternalAPIMaxRetries; attempt++ {
		result := tryPost(ctx, url, body, cfg, idempotencyKey, requestID, attempt, logger)
		if result.OK || result.Dropped {
			return result
		}

		if attempt < cfg.InternalAPIMaxRetries {
			delay := time.Duration(cfg.InternalAPIRetryBaseDelayMs)*time.Millisecond * time.Duration(math.Pow(2, float64(attempt)))
			select {
			case <-ctx.Done():
				return Result{OK: false, Dropped: false}
			case <-time.After(delay):
			}
		}
	}

	return Result{OK: false, Dropped: false}
}

func tryPost(ctx context.Context, url string, body []byte, cfg EnvConfig, idempotencyKey, requestID string, attempt int, logger *slog.Logger) Result {
	reqCtx, cancel := context.WithTimeout(ctx, time.Duration(cfg.InternalAPITimeoutMs)*time.Millisecond)
	defer cancel()

	req, err := http.NewRequestWithContext(reqCtx, http.MethodPost, url, bytes.NewReader(body))
	if err != nil {
		logger.Warn("internal API request creation failed", "attempt", attempt, "requestId", requestID, "error", err)
		if attempt >= cfg.InternalAPIMaxRetries {
			logger.Error("internal API transport gave up", "requestId", requestID, "error", err)
			return Result{OK: false, Dropped: false}
		}
		return Result{OK: false, Dropped: false}
	}

	for k, v := range BuildAuthHeaders(cfg.InternalWorkerSecret, idempotencyKey, requestID) {
		req.Header.Set(k, v)
	}

	resp, err := http.DefaultClient.Do(req)
	if err != nil {
		logger.Warn("internal API transport error", "attempt", attempt, "requestId", requestID, "error", err)
		if attempt >= cfg.InternalAPIMaxRetries {
			logger.Error("internal API transport gave up", "requestId", requestID, "error", err)
			return Result{OK: false, Dropped: false}
		}
		return Result{OK: false, Dropped: false}
	}
	defer resp.Body.Close()

	respBody, _ := io.ReadAll(resp.Body)

	if resp.StatusCode == http.StatusOK || resp.StatusCode == http.StatusNoContent {
		return Result{OK: true}
	}

	parsedErr := parseErrorBody(respBody)

	if resp.StatusCode == http.StatusBadRequest || resp.StatusCode == http.StatusUnauthorized || resp.StatusCode == http.StatusConflict {
		bodyStr := string(respBody)
		if parsedErr != nil {
			bodyStr = fmt.Sprintf("%s: %s", parsedErr.Error, parsedErr.Message)
		}
		logger.Error("internal API rejected job",
			"status", resp.StatusCode,
			"requestId", requestID,
			"body", bodyStr,
		)
		return Result{OK: false, Dropped: true}
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
		return Result{OK: false, Dropped: false}
	}

	return Result{OK: false, Dropped: false}
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
