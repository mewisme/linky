package clerkapi

import (
	"encoding/json"
	"errors"
	"fmt"
)

var ErrNotConfigured = errors.New("clerkapi: clerk secret key not configured")

type APIError struct {
	HTTPStatus int
	Errors     []ErrorDetail
	TraceID    string
	Raw        json.RawMessage
}

type ErrorDetail struct {
	Code        string          `json:"code"`
	Message     string          `json:"message"`
	LongMessage string          `json:"long_message"`
	Meta        json.RawMessage `json:"meta,omitempty"`
}

func (e *APIError) Error() string {
	if e == nil {
		return "clerkapi: unknown error"
	}
	if len(e.Errors) > 0 && e.Errors[0].Message != "" {
		return e.Errors[0].Message
	}
	if len(e.Raw) > 0 {
		return string(e.Raw)
	}
	return fmt.Sprintf("clerkapi: request failed with status %d", e.HTTPStatus)
}

func parseAPIError(status int, raw []byte) error {
	apiErr := &APIError{HTTPStatus: status, Raw: raw}
	var envelope struct {
		Errors  []ErrorDetail `json:"errors"`
		TraceID string        `json:"clerk_trace_id"`
	}
	if err := json.Unmarshal(raw, &envelope); err == nil {
		apiErr.Errors = envelope.Errors
		apiErr.TraceID = envelope.TraceID
	}
	return apiErr
}

func HTTPStatus(err error) int {
	var apiErr *APIError
	if errors.As(err, &apiErr) && apiErr.HTTPStatus > 0 {
		return apiErr.HTTPStatus
	}
	return 0
}

func ErrorMessage(err error) string {
	var apiErr *APIError
	if errors.As(err, &apiErr) {
		return apiErr.Error()
	}
	return ""
}
