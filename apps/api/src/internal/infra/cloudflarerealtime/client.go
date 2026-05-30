package cloudflarerealtime

import (
	"bytes"
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"net/http"
	"net/url"
	"reflect"
	"strings"
	"time"

	"github.com/rs/zerolog"

	"linky-api/src/internal/config"
	"linky-api/src/internal/logger"
)

const (
	defaultRequestTimeout    = 30 * time.Second
	sessionReadyPollInterval = 400 * time.Millisecond
	sessionReadyMaxWait      = 15 * time.Second
	maxRetryAttempts         = 4
	retryBaseDelay           = 500 * time.Millisecond
	maxLoggedResponseBody    = 512
)

var (
	log        = logger.New("infra:cloudflare-realtime")
	httpClient = &http.Client{
		Transport: &http.Transport{
			MaxIdleConns:        16,
			IdleConnTimeout:     90 * time.Second,
			TLSHandshakeTimeout: 10 * time.Second,
		},
	}
)

type SessionDescription struct {
	SDP  string `json:"sdp,omitempty"`
	Type string `json:"type,omitempty"`
}

type SimulcastConfig struct {
	PreferredRid     string `json:"preferredRid,omitempty"`
	PriorityOrdering string `json:"priorityOrdering,omitempty"`
	RidNotAvailable  string `json:"ridNotAvailable,omitempty"`
}

type TrackObject struct {
	Location                 string           `json:"location,omitempty"`
	MID                      string           `json:"mid,omitempty"`
	SessionID                string           `json:"sessionId,omitempty"`
	TrackName                string           `json:"trackName,omitempty"`
	BidirectionalMediaStream *bool            `json:"bidirectionalMediaStream,omitempty"`
	Kind                     string           `json:"kind,omitempty"`
	Simulcast                *SimulcastConfig `json:"simulcast,omitempty"`
}

type CloseTrackObject struct {
	MID string `json:"mid,omitempty"`
}

type NewSessionRequest struct {
	SessionDescription *SessionDescription `json:"sessionDescription,omitempty"`
}

type NewSessionResponse struct {
	SessionID          string              `json:"sessionId,omitempty"`
	SessionDescription *SessionDescription `json:"sessionDescription,omitempty"`
	ErrorCode          string              `json:"errorCode,omitempty"`
	ErrorDescription   string              `json:"errorDescription,omitempty"`
}

type TracksRequest struct {
	SessionDescription *SessionDescription `json:"sessionDescription,omitempty"`
	Tracks             []TrackObject       `json:"tracks,omitempty"`
	AutoDiscover       *bool               `json:"autoDiscover,omitempty"`
}

type TrackResult struct {
	TrackObject
	ErrorCode        string `json:"errorCode,omitempty"`
	ErrorDescription string `json:"errorDescription,omitempty"`
}

type TracksResponse struct {
	ErrorCode                      string              `json:"errorCode,omitempty"`
	ErrorDescription               string              `json:"errorDescription,omitempty"`
	RequiresImmediateRenegotiation bool                `json:"requiresImmediateRenegotiation,omitempty"`
	SessionDescription             *SessionDescription `json:"sessionDescription,omitempty"`
	Tracks                         []TrackResult       `json:"tracks,omitempty"`
}

type RenegotiateRequest struct {
	SessionDescription *SessionDescription `json:"sessionDescription,omitempty"`
}

type RenegotiateResponse struct {
	ErrorCode          string              `json:"errorCode,omitempty"`
	ErrorDescription   string              `json:"errorDescription,omitempty"`
	SessionDescription *SessionDescription `json:"sessionDescription,omitempty"`
}

type CloseTracksRequest struct {
	SessionDescription *SessionDescription `json:"sessionDescription,omitempty"`
	Tracks             []CloseTrackObject  `json:"tracks,omitempty"`
	Force              bool                `json:"force,omitempty"`
}

type CloseTrackResult struct {
	CloseTrackObject
	ErrorCode        string `json:"errorCode,omitempty"`
	ErrorDescription string `json:"errorDescription,omitempty"`
}

type CloseTracksResponse struct {
	ErrorCode                      string              `json:"errorCode,omitempty"`
	ErrorDescription               string              `json:"errorDescription,omitempty"`
	SessionDescription             *SessionDescription `json:"sessionDescription,omitempty"`
	Tracks                         []CloseTrackResult  `json:"tracks,omitempty"`
	RequiresImmediateRenegotiation bool                `json:"requiresImmediateRenegotiation,omitempty"`
}

type SessionTrackState struct {
	TrackObject
	Status string `json:"status,omitempty"`
}

type GetSessionStateResponse struct {
	ErrorCode        string              `json:"errorCode,omitempty"`
	ErrorDescription string              `json:"errorDescription,omitempty"`
	Tracks           []SessionTrackState `json:"tracks,omitempty"`
}

type CreateSessionOptions struct {
	ThirdParty    *bool
	CorrelationID string
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

type SDPDescription = SessionDescription
type TrackRequest = TrackObject
type TrackResponse = TrackResult

func IsStaleSession(err error) bool {
	var e *Error
	if errors.As(err, &e) {
		return e.Status == 410 || e.Status == 404
	}
	return false
}

func IsSessionNotReady(err error) bool {
	var e *Error
	if errors.As(err, &e) {
		if e.Status == 425 {
			return true
		}
		return strings.EqualFold(e.Code, "session_error")
	}
	return false
}

func sessionReadyForRemoteTracks(state *GetSessionStateResponse) bool {
	if state == nil {
		return false
	}
	hasLocal := false
	for _, t := range state.Tracks {
		if t.Location != "local" {
			continue
		}
		hasLocal = true
		if t.Status != "active" {
			return false
		}
	}
	return hasLocal
}

func waitForSessionReady(ctx context.Context, sessionID string) error {
	deadline := time.Now().Add(sessionReadyMaxWait)
	for {
		state, err := GetSessionState(ctx, sessionID)
		if err == nil && sessionReadyForRemoteTracks(state) {
			return nil
		}
		if err != nil && IsStaleSession(err) {
			return err
		}
		if ctx.Err() != nil {
			return ctx.Err()
		}
		if time.Now().After(deadline) {
			if err != nil {
				return err
			}
			return &Error{
				Status:  425,
				Code:    "session_error",
				Message: "Session is not ready yet. Please ensure the PeerConnection is connected before making this request",
			}
		}
		select {
		case <-ctx.Done():
			return ctx.Err()
		case <-time.After(sessionReadyPollInterval):
		}
	}
}

func AddTracksWhenSessionReady(ctx context.Context, sessionID string, body *TracksRequest) (*TracksResponse, error) {
	if err := waitForSessionReady(ctx, sessionID); err != nil {
		return nil, err
	}
	return AddTracks(ctx, sessionID, body)
}

var cfg *config.Config

func Init(c *config.Config) {
	cfg = c
}

func requestTimeout() time.Duration {
	if cfg != nil && cfg.CloudflareRealtimeTimeoutMs > 0 {
		return time.Duration(cfg.CloudflareRealtimeTimeoutMs) * time.Millisecond
	}
	return defaultRequestTimeout
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

func appPath(suffix string, query url.Values) (string, error) {
	appID, _, base, err := ensureConfigured()
	if err != nil {
		return "", err
	}
	u := base + "/apps/" + appID + suffix
	if len(query) > 0 {
		u += "?" + query.Encode()
	}
	return u, nil
}

func isDeadlineExceeded(err error) bool {
	if errors.Is(err, context.DeadlineExceeded) {
		return true
	}
	var e *Error
	if errors.As(err, &e) {
		if strings.EqualFold(e.Code, "REALTIME_TIMEOUT") {
			return true
		}
		return strings.Contains(strings.ToLower(e.Message), "context deadline exceeded")
	}
	return strings.Contains(strings.ToLower(err.Error()), "context deadline exceeded")
}

func isRetryableError(err error) bool {
	if err == nil {
		return false
	}
	if errors.Is(err, context.Canceled) && !isDeadlineExceeded(err) {
		return false
	}
	var e *Error
	if errors.As(err, &e) {
		switch {
		case e.Status == 401 || e.Status == 403:
			return false
		case e.Status == 404 || e.Status == 410:
			return false
		case e.Status == 400:
			return false
		case e.Status == 425 || IsSessionNotReady(err):
			return true
		case e.Status == 502 || e.Status == 503 || e.Status == 504:
			return true
		case strings.EqualFold(e.Code, "REALTIME_FETCH_FAILED"),
			strings.EqualFold(e.Code, "REALTIME_TIMEOUT"):
			return true
		case e.Status >= 400 && e.Status < 500:
			return false
		}
		return false
	}
	if isDeadlineExceeded(err) {
		return true
	}
	if errors.Is(err, context.Canceled) {
		return false
	}
	return true
}

func extractSessionIDFromPath(path string) string {
	const prefix = "/sessions/"
	if !strings.HasPrefix(path, prefix) {
		return ""
	}
	rest := strings.TrimPrefix(path, prefix)
	if rest == "new" {
		return ""
	}
	if idx := strings.IndexByte(rest, '/'); idx >= 0 {
		return rest[:idx]
	}
	return rest
}

func trackCountFromBody(body interface{}) int {
	tr, ok := body.(*TracksRequest)
	if !ok || tr == nil {
		return -1
	}
	return len(tr.Tracks)
}

func truncateForLog(s string) string {
	if len(s) <= maxLoggedResponseBody {
		return s
	}
	return s[:maxLoggedResponseBody] + "..."
}

type callLogFields struct {
	method       string
	path         string
	sessionID    string
	attempt      int
	duration     time.Duration
	status       int
	errorCode    string
	responseBody string
	trackCount   int
}

func (f callLogFields) apply(ev *zerolog.Event) *zerolog.Event {
	ev = ev.Str("method", f.method).Str("path", f.path).Int("attempt", f.attempt).Dur("duration", f.duration)
	if f.sessionID != "" {
		ev = ev.Str("sessionId", f.sessionID)
	}
	if f.status > 0 {
		ev = ev.Int("status", f.status)
	}
	if f.errorCode != "" {
		ev = ev.Str("errorCode", f.errorCode)
	}
	if f.responseBody != "" {
		ev = ev.Str("responseBody", f.responseBody)
	}
	if f.trackCount >= 0 {
		ev = ev.Int("trackCount", f.trackCount)
	}
	return ev
}

func call(ctx context.Context, method, path string, query url.Values, body interface{}, out interface{}) error {
	return callWithRetry(ctx, method, path, query, body, out)
}

func callWithRetry(ctx context.Context, method, path string, query url.Values, body interface{}, out interface{}) error {
	sessionID := extractSessionIDFromPath(path)
	trackCount := trackCountFromBody(body)
	var lastErr error
	for attempt := 1; attempt <= maxRetryAttempts; attempt++ {
		fields, err := callOnce(ctx, method, path, query, body, out, attempt, sessionID, trackCount)
		if err == nil {
			fields.apply(log.Info()).Msg("Cloudflare Realtime request succeeded")
			return nil
		}
		lastErr = err
		if !isRetryableError(err) || attempt == maxRetryAttempts {
			fields.apply(log.Warn()).Err(err).Msg("Cloudflare Realtime request failed")
			return err
		}
		fields.apply(log.Warn()).Err(err).Msg("Cloudflare Realtime request failed; retrying")
		delay := retryBaseDelay * time.Duration(1<<(attempt-1))
		select {
		case <-ctx.Done():
			return ctx.Err()
		case <-time.After(delay):
		}
	}
	return lastErr
}

func callOnce(ctx context.Context, method, path string, query url.Values, body interface{}, out interface{}, attempt int, sessionID string, trackCount int) (callLogFields, error) {
	fields := callLogFields{
		method:     method,
		path:       path,
		sessionID:  sessionID,
		attempt:    attempt,
		trackCount: trackCount,
	}
	startedAt := time.Now()
	defer func() {
		fields.duration = time.Since(startedAt)
	}()

	_, secret, _, err := ensureConfigured()
	if err != nil {
		return fields, err
	}
	targetURL, err := appPath(path, query)
	if err != nil {
		return fields, err
	}
	var reader io.Reader
	if !isNilBody(body) {
		buf, err := json.Marshal(body)
		if err != nil {
			return fields, err
		}
		reader = bytes.NewReader(buf)
	}

	timeout := requestTimeout()
	reqCtx, cancel := context.WithTimeout(ctx, timeout)
	defer cancel()

	req, err := http.NewRequestWithContext(reqCtx, method, targetURL, reader)
	if err != nil {
		return fields, err
	}
	req.Header.Set("Authorization", "Bearer "+secret)
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("Accept", "application/json")
	resp, err := httpClient.Do(req)
	if err != nil {
		status := 502
		code := "REALTIME_FETCH_FAILED"
		if isDeadlineExceeded(err) || isDeadlineExceeded(reqCtx.Err()) {
			status = 504
			code = "REALTIME_TIMEOUT"
		}
		fields.status = status
		fields.errorCode = code
		return fields, &Error{Status: status, Code: code, Message: err.Error()}
	}
	defer resp.Body.Close()
	raw, _ := io.ReadAll(resp.Body)
	fields.status = resp.StatusCode
	fields.responseBody = truncateForLog(strings.TrimSpace(string(raw)))
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
		code := parsed.ErrorCode
		if code == "" {
			code = "REALTIME_ERROR"
		}
		fields.errorCode = code
		return fields, &Error{Status: resp.StatusCode, StatusText: resp.Status, Code: code, Message: message}
	}
	if out != nil && len(raw) > 0 {
		if err := json.Unmarshal(raw, out); err != nil {
			return fields, err
		}
	}
	return fields, nil
}

func responseError(code, description string) error {
	if code == "" {
		return nil
	}
	message := description
	if message == "" {
		message = code
	}
	return &Error{Status: 502, Code: code, Message: message}
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

func CreateSession(ctx context.Context, body *NewSessionRequest, opts *CreateSessionOptions) (*NewSessionResponse, error) {
	query := url.Values{}
	if opts != nil {
		if opts.ThirdParty != nil {
			query.Set("thirdparty", fmt.Sprintf("%t", *opts.ThirdParty))
		}
		if opts.CorrelationID != "" {
			query.Set("correlationId", opts.CorrelationID)
		}
	}
	out := &NewSessionResponse{}
	if err := call(ctx, http.MethodPost, "/sessions/new", query, body, out); err != nil {
		return nil, err
	}
	if err := responseError(out.ErrorCode, out.ErrorDescription); err != nil {
		return nil, err
	}
	return out, nil
}

func AddTracks(ctx context.Context, sessionID string, body *TracksRequest) (*TracksResponse, error) {
	var lastErr error
	for attempt := 1; attempt <= maxRetryAttempts; attempt++ {
		out := &TracksResponse{}
		if err := call(ctx, http.MethodPost, "/sessions/"+sessionID+"/tracks/new", nil, body, out); err != nil {
			return nil, err
		}
		if err := responseError(out.ErrorCode, out.ErrorDescription); err != nil {
			lastErr = err
			if !isRetryableError(err) || attempt == maxRetryAttempts {
				return nil, err
			}
			delay := retryBaseDelay * time.Duration(1<<(attempt-1))
			select {
			case <-ctx.Done():
				return nil, ctx.Err()
			case <-time.After(delay):
			}
			continue
		}
		return out, nil
	}
	return nil, lastErr
}

func Renegotiate(ctx context.Context, sessionID string, body *RenegotiateRequest) (*RenegotiateResponse, error) {
	out := &RenegotiateResponse{}
	if err := call(ctx, http.MethodPut, "/sessions/"+sessionID+"/renegotiate", nil, body, out); err != nil {
		if IsStaleSession(err) {
			return out, nil
		}
		return nil, err
	}
	if err := responseError(out.ErrorCode, out.ErrorDescription); err != nil {
		if IsStaleSession(err) {
			return out, nil
		}
		return nil, err
	}
	return out, nil
}

func CloseTracks(ctx context.Context, sessionID string, body *CloseTracksRequest) (*CloseTracksResponse, error) {
	out := &CloseTracksResponse{}
	if err := call(ctx, http.MethodPut, "/sessions/"+sessionID+"/tracks/close", nil, body, out); err != nil {
		if IsStaleSession(err) {
			return out, nil
		}
		return nil, err
	}
	if err := responseError(out.ErrorCode, out.ErrorDescription); err != nil {
		if IsStaleSession(err) {
			return out, nil
		}
		return nil, err
	}
	return out, nil
}

func GetSessionState(ctx context.Context, sessionID string) (*GetSessionStateResponse, error) {
	out := &GetSessionStateResponse{}
	if err := call(ctx, http.MethodGet, "/sessions/"+sessionID, nil, nil, out); err != nil {
		return nil, err
	}
	if err := responseError(out.ErrorCode, out.ErrorDescription); err != nil {
		return nil, err
	}
	return out, nil
}

func GetSession(ctx context.Context, sessionID string) error {
	_, err := GetSessionState(ctx, sessionID)
	return err
}
