package cloudflarerealtime

import (
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

func TestIsRetryable_nonRetryableClientError(t *testing.T) {
	t.Parallel()
	err := &Error{Status: http.StatusBadRequest, Code: "bad_request"}
	if isRetryable(err) {
		t.Fatal("expected 400 to be non-retryable")
	}
}
