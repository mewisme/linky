package clerkapi

import (
	"errors"
	"testing"
)

func TestParseAPIError(t *testing.T) {
	t.Parallel()
	err := parseAPIError(404, []byte(`{"errors":[{"code":"resource_not_found","message":"User not found"}],"clerk_trace_id":"tr_1"}`))
	apiErr, ok := err.(*APIError)
	if !ok {
		t.Fatalf("expected *APIError, got %T", err)
	}
	if apiErr.HTTPStatus != 404 {
		t.Fatalf("status = %d, want 404", apiErr.HTTPStatus)
	}
	if len(apiErr.Errors) != 1 || apiErr.Errors[0].Message != "User not found" {
		t.Fatalf("errors = %+v", apiErr.Errors)
	}
	if HTTPStatus(err) != 404 {
		t.Fatalf("HTTPStatus = %d", HTTPStatus(err))
	}
	if ErrorMessage(err) != "User not found" {
		t.Fatalf("message = %q", ErrorMessage(err))
	}
}

func TestHTTPStatusNonAPIError(t *testing.T) {
	t.Parallel()
	if HTTPStatus(errors.New("other")) != 0 {
		t.Fatal("expected 0 for non-API error")
	}
}
