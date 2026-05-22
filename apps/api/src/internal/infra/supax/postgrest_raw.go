package supax

import (
	"context"

	"linky-api/src/internal/infra/supax/postgrest"
)

func postgrestRaw(ctx context.Context, method, url string, headers map[string]string, body []byte) ([]byte, error) {
	return postgrest.Raw(ctx, method, url, headers, body)
}
