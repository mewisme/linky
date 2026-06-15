package cloudflarerealtime

import (
	"bytes"
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"net"
	"net/http"
	"reflect"
	"strings"
	"sync/atomic"
	"time"

	"linky-api/src/internal/config"
	"linky-api/src/internal/logger"
)

const (
	requestTimeout         = 30 * time.Second
	maxRetries             = 3
	initialBackoff         = 500 * time.Millisecond
	maxBackoff             = 4 * time.Second
	statusCheckThreshold   = 5
	statusCheckCooldown    = 5 * time.Minute
	cloudflareStatusAPIURL = "https://www.cloudflarestatus.com/api/v2/status.json"
)

var (
	log        = logger.New("infra:cloudflare-realtime")
	httpClient = &http.Client{Timeout: requestTimeout}

	consecutiveFailures atomic.Int64
	lastStatusCheck     atomic.Int64
)

type SDPDescription struct {
	SDP  string `json:"sdp"`
	Type string `json:"type"`
}

type TrackRequest struct {
	Location  string                 `json:"location,omitempty"`
	MID       string                 `json:"mid,omitempty"`
	TrackName string                 `json:"trackName,omitempty"`
	SessionID string                 `json:"sessionId,omitempty"`
	Simulcast map[string]interface{} `json:"simulcast,omitempty"`
}

type TrackResponse struct {
	TrackName        string `json:"trackName,omitempty"`
	MID              string `json:"mid,omitempty"`
	Kind             string `json:"kind,omitempty"`
	ErrorCode        string `json:"errorCode,omitempty"`
	ErrorDescription string `json:"errorDescription,omitempty"`
}

type NewSessionRequest struct {
	SessionDescription *SDPDescription `json:"sessionDescription,omitempty"`
}

type NewSessionResponse struct {
	SessionID          string          `json:"sessionId,omitempty"`
	SessionDescription *SDPDescription `json:"sessionDescription,omitempty"`
	ErrorCode          string          `json:"errorCode,omitempty"`
	ErrorDescription   string          `json:"errorDescription,omitempty"`
}

type TracksRequest struct {
	SessionDescription *SDPDescription `json:"sessionDescription,omitempty"`
	Tracks             []TrackRequest  `json:"tracks"`
}

type TracksResponse struct {
	SessionDescription             *SDPDescription `json:"sessionDescription,omitempty"`
	Tracks                         []TrackResponse `json:"tracks,omitempty"`
	RequiresImmediateRenegotiation bool            `json:"requiresImmediateRenegotiation,omitempty"`
	ErrorCode                      string          `json:"errorCode,omitempty"`
	ErrorDescription               string          `json:"errorDescription,omitempty"`
}

type RenegotiateRequest struct {
	SessionDescription *SDPDescription `json:"sessionDescription"`
}

type RenegotiateResponse struct {
	ErrorCode        string `json:"errorCode,omitempty"`
	ErrorDescription string `json:"errorDescription,omitempty"`
}

type CloseTracksRequest struct {
	Tracks []TrackRequest `json:"tracks"`
	Force  bool           `json:"force,omitempty"`
}

type CloseTracksResponse struct {
	ErrorCode        string `json:"errorCode,omitempty"`
	ErrorDescription string `json:"errorDescription,omitempty"`
}

type Error struct {
	Status     int
	StatusText string
	Code       string
	Message    string
}

func (e *Error) Error() string {
	if e == nil {
		return ""
	}
	if e.Code != "" {
		return fmt.Sprintf("cloudflare realtime: %d %s (%s) %s", e.Status, e.StatusText, e.Code, e.Message)
	}
	return fmt.Sprintf("cloudflare realtime: %d %s %s", e.Status, e.StatusText, e.Message)
}

func IsStaleSession(err error) bool {
	var e *Error
	if errors.As(err, &e) {
		return e.Status == 410 || e.Status == 404
	}
	return false
}

var cfg *config.Config

func Init(c *config.Config) {
	cfg = c
}

func IsConfigured() bool {
	return cfg != nil && cfg.CloudflareRealtimeAppID != "" && cfg.CloudflareRealtimeAppSecret != ""
}

func ensureConfigured() (string, string, string, error) {
	if cfg == nil {
		return "", "", "", &Error{Status: 500, Code: "REALTIME_NOT_CONFIGURED", Message: "Cloudflare Realtime not configured"}
	}
	if cfg.CloudflareRealtimeAppID == "" || cfg.CloudflareRealtimeAppSecret == "" {
		return "", "", "", &Error{Status: 500, Code: "REALTIME_NOT_CONFIGURED", Message: "Cloudflare Realtime is not configured (missing CLOUDFLARE_REALTIME_APP_ID or CLOUDFLARE_REALTIME_APP_SECRET)"}
	}
	base := cfg.CloudflareRealtimeBaseURL
	if base == "" {
		base = "https://rtc.live.cloudflare.com/v1"
	}
	return cfg.CloudflareRealtimeAppID, cfg.CloudflareRealtimeAppSecret, base, nil
}

func appPath(suffix string) (string, error) {
	appID, _, base, err := ensureConfigured()
	if err != nil {
		return "", err
	}
	return base + "/apps/" + appID + suffix, nil
}

func call(ctx context.Context, method, path string, body interface{}, out interface{}) error {
	var payload []byte
	if !isNilBody(body) {
		var err error
		payload, err = json.Marshal(body)
		if err != nil {
			return err
		}
	}

	var lastErr error
	backoff := initialBackoff
	for attempt := 0; attempt <= maxRetries; attempt++ {
		if attempt > 0 {
			if !isRetryable(lastErr) {
				break
			}
			log.Warn().
				Str("method", method).
				Str("path", path).
				Int("attempt", attempt+1).
				Dur("backoff", backoff).
				Err(lastErr).
				Msg("Retrying Cloudflare Realtime request")
			select {
			case <-ctx.Done():
				return ctx.Err()
			case <-time.After(backoff):
			}
			backoff = min(backoff*2, maxBackoff)
		}

		lastErr = doRequest(ctx, method, path, payload, out, attempt+1)
		if lastErr == nil {
			recordSuccess()
			return nil
		}
		if !isRetryable(lastErr) {
			break
		}
	}

	recordFailure()
	return lastErr
}

func doRequest(ctx context.Context, method, path string, payload []byte, out interface{}, attempt int) error {
	_, secret, _, err := ensureConfigured()
	if err != nil {
		return err
	}
	url, err := appPath(path)
	if err != nil {
		return err
	}

	var reader io.Reader
	if len(payload) > 0 {
		reader = bytes.NewReader(payload)
	}

	reqCtx, cancel := context.WithTimeout(ctx, requestTimeout)
	defer cancel()

	start := time.Now()
	req, err := http.NewRequestWithContext(reqCtx, method, url, reader)
	if err != nil {
		return err
	}
	req.Header.Set("Authorization", "Bearer "+secret)
	req.Header.Set("Content-Type", "application/json")

	resp, err := httpClient.Do(req)
	duration := time.Since(start)
	if err != nil {
		logEvent := log.Error().
			Err(err).
			Str("method", method).
			Str("path", path).
			Int("attempt", attempt).
			Dur("duration", duration)
		logEvent.Msg("Cloudflare Realtime request failed")
		return &Error{Status: 502, Code: "REALTIME_FETCH_FAILED", Message: err.Error()}
	}
	defer resp.Body.Close()

	raw, _ := io.ReadAll(resp.Body)
	cfRay := resp.Header.Get("Cf-Ray")
	cfRequestID := resp.Header.Get("Cf-Request-Id")
	requestID := cfRay
	if requestID == "" {
		requestID = cfRequestID
	}

	if resp.StatusCode >= 400 {
		var parsed struct {
			ErrorCode        string `json:"errorCode"`
			ErrorDescription string `json:"errorDescription"`
		}
		_ = json.Unmarshal(raw, &parsed)
		message := parsed.ErrorDescription
		if message == "" {
			message = strings.TrimSpace(string(raw))
		}
		log.Warn().
			Str("method", method).
			Str("path", path).
			Int("status", resp.StatusCode).
			Int("attempt", attempt).
			Dur("duration", duration).
			Str("requestId", requestID).
			Str("errorCode", parsed.ErrorCode).
			Msg("Cloudflare Realtime upstream error")
		return &Error{Status: resp.StatusCode, StatusText: resp.Status, Code: parsed.ErrorCode, Message: message}
	}

	log.Debug().
		Str("method", method).
		Str("path", path).
		Int("status", resp.StatusCode).
		Int("attempt", attempt).
		Dur("duration", duration).
		Str("requestId", requestID).
		Msg("Cloudflare Realtime request succeeded")

	if out != nil && len(raw) > 0 {
		if err := json.Unmarshal(raw, out); err != nil {
			return err
		}
	}
	return nil
}

func isRetryable(err error) bool {
	if err == nil {
		return false
	}
	if errors.Is(err, context.DeadlineExceeded) || errors.Is(err, context.Canceled) {
		return errors.Is(err, context.DeadlineExceeded)
	}
	var netErr net.Error
	if errors.As(err, &netErr) && netErr.Timeout() {
		return true
	}
	var e *Error
	if errors.As(err, &e) {
		if e.Code == "REALTIME_FETCH_FAILED" {
			msg := strings.ToLower(e.Message)
			return strings.Contains(msg, "timeout") ||
				strings.Contains(msg, "deadline exceeded") ||
				strings.Contains(msg, "connection reset") ||
				strings.Contains(msg, "connection refused") ||
				strings.Contains(msg, "eof")
		}
		switch e.Status {
		case http.StatusRequestTimeout, http.StatusTooManyRequests,
			http.StatusInternalServerError, http.StatusBadGateway,
			http.StatusServiceUnavailable, http.StatusGatewayTimeout:
			return true
		}
	}
	return false
}

func recordSuccess() {
	consecutiveFailures.Store(0)
}

func recordFailure() {
	if consecutiveFailures.Add(1) >= statusCheckThreshold {
		maybeCheckCloudflareStatus()
	}
}

func maybeCheckCloudflareStatus() {
	now := time.Now().UnixNano()
	last := lastStatusCheck.Load()
	if now-last < int64(statusCheckCooldown) {
		return
	}
	if !lastStatusCheck.CompareAndSwap(last, now) {
		return
	}
	go checkCloudflareStatus()
}

func checkCloudflareStatus() {
	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	req, err := http.NewRequestWithContext(ctx, http.MethodGet, cloudflareStatusAPIURL, nil)
	if err != nil {
		return
	}
	resp, err := httpClient.Do(req)
	if err != nil {
		log.Warn().Err(err).Msg("Failed to fetch Cloudflare status page")
		return
	}
	defer resp.Body.Close()

	raw, err := io.ReadAll(io.LimitReader(resp.Body, 64<<10))
	if err != nil {
		log.Warn().Err(err).Msg("Failed to read Cloudflare status page")
		return
	}

	var status struct {
		Status struct {
			Indicator   string `json:"indicator"`
			Description string `json:"description"`
		} `json:"status"`
	}
	if err := json.Unmarshal(raw, &status); err != nil {
		log.Warn().Err(err).Msg("Failed to parse Cloudflare status page")
		return
	}

	log.Warn().
		Str("indicator", status.Status.Indicator).
		Str("description", status.Status.Description).
		Int64("consecutiveFailures", consecutiveFailures.Load()).
		Msg("Cloudflare Realtime: repeated failures — Cloudflare platform status")
}

func isNilBody(body interface{}) bool {
	if body == nil {
		return true
	}
	v := reflect.ValueOf(body)
	switch v.Kind() {
	case reflect.Ptr, reflect.Map, reflect.Slice, reflect.Interface, reflect.Chan, reflect.Func:
		return v.IsNil()
	}
	return false
}

func CreateSession(ctx context.Context, body *NewSessionRequest) (*NewSessionResponse, error) {
	out := &NewSessionResponse{}
	if err := call(ctx, http.MethodPost, "/sessions/new", body, out); err != nil {
		return nil, err
	}
	return out, nil
}

func AddTracks(ctx context.Context, sessionID string, body *TracksRequest) (*TracksResponse, error) {
	if err := GetSession(ctx, sessionID); err != nil {
		return nil, err
	}
	out := &TracksResponse{}
	if err := call(ctx, http.MethodPost, "/sessions/"+sessionID+"/tracks/new", body, out); err != nil {
		return nil, err
	}
	return out, nil
}

func Renegotiate(ctx context.Context, sessionID string, body *RenegotiateRequest) (*RenegotiateResponse, error) {
	out := &RenegotiateResponse{}
	if err := call(ctx, http.MethodPut, "/sessions/"+sessionID+"/renegotiate", body, out); err != nil {
		if IsStaleSession(err) {
			return out, nil
		}
		return nil, err
	}
	return out, nil
}

func CloseTracks(ctx context.Context, sessionID string, body *CloseTracksRequest) (*CloseTracksResponse, error) {
	out := &CloseTracksResponse{}
	if err := call(ctx, http.MethodPut, "/sessions/"+sessionID+"/tracks/close", body, out); err != nil {
		if IsStaleSession(err) {
			return out, nil
		}
		return nil, err
	}
	return out, nil
}

func GetSession(ctx context.Context, sessionID string) error {
	return call(ctx, http.MethodGet, "/sessions/"+sessionID, nil, nil)
}
