package clerkx

import "strings"

// ExtractBearerToken parses an Authorization header value into the JWT string.
// It accepts a case-insensitive "Bearer " prefix (RFC 6750) and trims surrounding
// whitespace. A non-empty value without the Bearer prefix is returned as-is so
// behavior matches Express clerkMiddleware (authHeader.replace("Bearer ", "")).
func ExtractBearerToken(authHeader string) (string, bool) {
	h := strings.TrimSpace(authHeader)
	if h == "" {
		return "", false
	}
	const bearer = "bearer"
	if len(h) >= len(bearer) && strings.EqualFold(h[:len(bearer)], bearer) {
		token := strings.TrimSpace(h[len(bearer):])
		if token == "" {
			return "", false
		}
		return token, true
	}
	return h, true
}
