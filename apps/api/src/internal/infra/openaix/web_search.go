package openaix

import "context"

type WebSearchParams struct {
	Model string
	Query string
}

type WebSearchResult struct {
	Answer string
	Raw    map[string]any
}

func WebSearch(ctx context.Context, p WebSearchParams) (*WebSearchResult, error) {
	_ = ctx
	_ = p
	return nil, ErrCapabilityNotConfigured
}
