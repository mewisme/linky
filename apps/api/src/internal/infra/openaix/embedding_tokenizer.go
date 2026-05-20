package openaix

import (
	"sync"

	"github.com/pkoukk/tiktoken-go"
)

var embeddingEncoders sync.Map

func EmbeddingTokenizer(model string) (*tiktoken.Tiktoken, error) {
	if model == "" {
		model = "text-embedding-3-small"
	}
	if v, ok := embeddingEncoders.Load(model); ok {
		return v.(*tiktoken.Tiktoken), nil
	}
	enc, err := tiktoken.EncodingForModel(model)
	if err != nil {
		enc, err = tiktoken.GetEncoding("cl100k_base")
		if err != nil {
			return nil, err
		}
	}
	embeddingEncoders.Store(model, enc)
	return enc, nil
}
