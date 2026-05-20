package openaix

import "context"

type WebFetchParams struct {
	Model string
	URL   string
}

type WebFetchResult struct {
	Markdown string
	Raw      map[string]any
}

func WebFetch(ctx context.Context, p WebFetchParams) (*WebFetchResult, error) {
	_ = ctx
	_ = p
	return nil, ErrCapabilityNotConfigured
}
