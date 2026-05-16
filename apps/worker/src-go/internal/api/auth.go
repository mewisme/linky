package api

func BuildHeaders(idempotencyKey, requestID string) map[string]string {
	headers := map[string]string{
		"content-type": "application/json",
	}
	if idempotencyKey != "" {
		headers["idempotency-key"] = idempotencyKey
	}
	if requestID != "" {
		headers["x-request-id"] = requestID
	}
	return headers
}
