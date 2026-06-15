package cloudflarerealtime

import (
	"context"
	"errors"
	"net/http"
	"testing"
)

func TestIsSessionNotReady(t *testing.T) {
	t.Parallel()
	cases := []struct {
		name string
		err  error
		want bool
	}{
		{"nil", nil, false},
		{"425 status", &Error{Status: 425, Code: "session_error"}, true},
		{"session_error code", &Error{Status: 400, Code: "session_error"}, true},
		{"404 stale", &Error{Status: 404}, false},
		{"500", &Error{Status: 500}, false},
		{"wrapped", errors.Join(&Error{Status: 425}), true},
	}
	for _, tc := range cases {
		t.Run(tc.name, func(t *testing.T) {
			t.Parallel()
			if got := IsSessionNotReady(tc.err); got != tc.want {
				t.Fatalf("IsSessionNotReady() = %v, want %v", got, tc.want)
			}
		})
	}
}

func TestIsRetryable_sessionNotReady(t *testing.T) {
	t.Parallel()
	err := &Error{Status: http.StatusTooEarly, Code: "session_error", Message: "Session is not ready yet"}
	if isRetryable(err) {
		t.Fatal("expected 425 session_error to be non-retryable (client must wait for PeerConnection)")
	}
}

func TestIsBenignCloseError(t *testing.T) {
	t.Parallel()
	cases := []struct {
		name string
		err  error
		want bool
	}{
		{"425", &Error{Status: 425, Code: "session_error"}, true},
		{"404", &Error{Status: 404}, true},
		{"410", &Error{Status: 410}, true},
		{"500", &Error{Status: 500}, false},
	}
	for _, tc := range cases {
		t.Run(tc.name, func(t *testing.T) {
			t.Parallel()
			if got := IsBenignCloseError(tc.err); got != tc.want {
				t.Fatalf("IsBenignCloseError() = %v, want %v", got, tc.want)
			}
		})
	}
}

func TestNormalizeSessionNotReady(t *testing.T) {
	t.Parallel()
	upstream := &Error{Status: http.StatusTooEarly, Code: "session_error", Message: "Session is not ready yet"}
	normalized := NormalizeSessionNotReady(upstream).(*Error)
	if normalized.Code != "REALTIME_SESSION_NOT_READY" {
		t.Fatalf("code = %q, want REALTIME_SESSION_NOT_READY", normalized.Code)
	}
	if normalized.Status != http.StatusTooEarly {
		t.Fatalf("status = %d, want 425", normalized.Status)
	}
}

func TestClientSessionNotReadyError(t *testing.T) {
	t.Parallel()
	err := ClientSessionNotReadyError("")
	if !IsSessionNotReady(err) {
		t.Fatal("expected client session-not-ready error to match IsSessionNotReady")
	}
	if err.Code != "REALTIME_SESSION_NOT_READY" {
		t.Fatalf("code = %q", err.Code)
	}
}

func TestContextWithOperation(t *testing.T) {
	t.Parallel()
	ctx := ContextWithOperation(context.Background(), OperationSubscribe)
	if got := operationFromContext(ctx); got != OperationSubscribe {
		t.Fatalf("operation = %q, want %q", got, OperationSubscribe)
	}
}

func TestIsRetryable_nonRetryableClientError(t *testing.T) {
	t.Parallel()
	err := &Error{Status: http.StatusBadRequest, Code: "bad_request"}
	if isRetryable(err) {
		t.Fatal("expected 400 to be non-retryable")
	}
}
