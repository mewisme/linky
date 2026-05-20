package cloudflarerealtime

import (
	"bytes"
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"net/http"
	"reflect"
	"strings"
	"time"

	"linky-api/src/internal/config"
	"linky-api/src/internal/logger"
)

const requestTimeout = 10 * time.Second

var log = logger.New("infra:cloudflare-realtime")

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
	_, secret, _, err := ensureConfigured()
	if err != nil {
		return err
	}
	url, err := appPath(path)
	if err != nil {
		return err
	}
	var reader io.Reader
	if !isNilBody(body) {
		buf, err := json.Marshal(body)
		if err != nil {
			return err
		}
		reader = bytes.NewReader(buf)
	}

	reqCtx, cancel := context.WithTimeout(ctx, requestTimeout)
	defer cancel()

	req, err := http.NewRequestWithContext(reqCtx, method, url, reader)
	if err != nil {
		return err
	}
	req.Header.Set("Authorization", "Bearer "+secret)
	req.Header.Set("Content-Type", "application/json")
	resp, err := http.DefaultClient.Do(req)
	if err != nil {
		log.Error().Err(err).Str("method", method).Str("path", path).Msg("Cloudflare Realtime request failed")
		return &Error{Status: 502, Code: "REALTIME_FETCH_FAILED", Message: err.Error()}
	}
	defer resp.Body.Close()
	raw, _ := io.ReadAll(resp.Body)
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
		return &Error{Status: resp.StatusCode, StatusText: resp.Status, Code: parsed.ErrorCode, Message: message}
	}
	if out != nil && len(raw) > 0 {
		if err := json.Unmarshal(raw, out); err != nil {
			return err
		}
	}
	return nil
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
