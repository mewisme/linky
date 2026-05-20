package openaix

import "context"

type TTSParams struct {
	Model string
	Input string
	Voice string
}

func TextToSpeech(ctx context.Context, p TTSParams) ([]byte, error) {
	_ = ctx
	_ = p
	return nil, ErrCapabilityNotConfigured
}
