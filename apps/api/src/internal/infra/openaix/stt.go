package openaix

import "context"

type STTParams struct {
	Model string
	File  []byte
}

type STTResult struct {
	Text string
}

func SpeechToText(ctx context.Context, p STTParams) (*STTResult, error) {
	_ = ctx
	_ = p
	return nil, ErrCapabilityNotConfigured
}
