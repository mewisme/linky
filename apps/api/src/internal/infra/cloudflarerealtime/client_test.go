package cloudflarerealtime

import (
	"context"
	"errors"
	"testing"
)

func TestIsDeadlineExceeded(t *testing.T) {
	if !isDeadlineExceeded(context.DeadlineExceeded) {
		t.Fatal("expected context.DeadlineExceeded to match")
	}
	wrapped := &Error{Status: 504, Code: "REALTIME_TIMEOUT", Message: "Post \"https://example.com\": context deadline exceeded"}
	if !isDeadlineExceeded(wrapped) {
		t.Fatal("expected REALTIME_TIMEOUT wrapped error to match")
	}
	if isDeadlineExceeded(&Error{Status: 400, Code: "invalid_params", Message: "bad request"}) {
		t.Fatal("expected invalid_params not to match deadline exceeded")
	}
}

func TestIsRetryableError(t *testing.T) {
	cases := []struct {
		name string
		err  error
		want bool
	}{
		{"session not ready", &Error{Status: 425, Code: "session_error", Message: "Session is not ready yet"}, true},
		{"502 upstream", &Error{Status: 502, Code: "REALTIME_FETCH_FAILED", Message: "fetch failed"}, true},
		{"504 timeout", &Error{Status: 504, Code: "REALTIME_TIMEOUT", Message: "context deadline exceeded"}, true},
		{"503", &Error{Status: 503, Code: "REALTIME_ERROR", Message: "unavailable"}, true},
		{"invalid params", &Error{Status: 400, Code: "invalid_params", Message: "bad"}, false},
		{"decoding error", &Error{Status: 400, Code: "decoding_error", Message: "bad json"}, false},
		{"unauthorized", &Error{Status: 401, Code: "REALTIME_ERROR", Message: "unauthorized"}, false},
		{"forbidden", &Error{Status: 403, Code: "REALTIME_ERROR", Message: "forbidden"}, false},
		{"stale session", &Error{Status: 404, Code: "session_error", Message: "not found"}, false},
		{"deadline exceeded transport", context.DeadlineExceeded, true},
		{"parent canceled", context.Canceled, false},
		{"network error", errors.New("connection reset"), true},
	}
	for _, tc := range cases {
		t.Run(tc.name, func(t *testing.T) {
			if got := isRetryableError(tc.err); got != tc.want {
				t.Fatalf("isRetryableError(%v) = %v, want %v", tc.err, got, tc.want)
			}
		})
	}
}

func TestExtractSessionIDFromPath(t *testing.T) {
	if got := extractSessionIDFromPath("/sessions/abc123/tracks/new"); got != "abc123" {
		t.Fatalf("got %q", got)
	}
	if got := extractSessionIDFromPath("/sessions/new"); got != "" {
		t.Fatalf("got %q", got)
	}
}
