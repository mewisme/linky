package openaix

import (
	"context"
	"errors"
)

type ImageGenerateParams struct {
	Model  string
	Prompt string
	N      int
	Size   string
}

type ImageGenerateResult struct {
	URLs []string
}

var ErrCapabilityNotConfigured = errors.New("openai: capability not configured")

func GenerateImage(ctx context.Context, p ImageGenerateParams) (*ImageGenerateResult, error) {
	_ = ctx
	_ = p
	return nil, ErrCapabilityNotConfigured
}
