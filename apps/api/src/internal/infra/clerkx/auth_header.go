package clerkx

import "strings"

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
