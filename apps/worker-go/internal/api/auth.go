package api

import "fmt"

func BuildAuthHeaders(secret, idempotencyKey, requestID string) map[string]string {
	headers := map[string]string{
		"authorization": fmt.Sprintf("Bearer %s", secret),
		"content-type":  "application/json",
	}
	if idempotencyKey != "" {
		headers["idempotency-key"] = idempotencyKey
	}
	if requestID != "" {
		headers["x-request-id"] = requestID
	}
	return headers
}
