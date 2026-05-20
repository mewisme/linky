package openaix

import (
	"context"
	"encoding/json"
	"errors"
	"strings"
	"time"

	"linky-api/src/internal/infra/aiconfig"
)

type embeddingRequest struct {
	Model string `json:"model"`
	Input any    `json:"input"`
}

type embeddingResponse struct {
	Model string `json:"model"`
	Data  []struct {
		Index     int       `json:"index"`
		Embedding []float64 `json:"embedding"`
	} `json:"data"`
}

func EmbedBatch(ctx context.Context, inputs []string) ([][]float32, string, error) {
	model := EmbeddingModel()
	if model == "" {
		return nil, "", errors.New("openai: OPENAI_EMBEDDING_MODEL not configured")
	}
	if len(inputs) == 0 {
		return nil, model, nil
	}

	e := aiconfig.EffectiveConfig()
	timeout := time.Duration(e.EmbeddingTimeoutMs) * time.Millisecond
	if timeout <= 0 {
		timeout = 60 * time.Second
	}
	callCtx, cancel := context.WithTimeout(ctx, timeout)
	defer cancel()

	reqBody := embeddingRequest{
		Model: model,
		Input: inputs,
	}

	var respBody []byte
	err := withRetries(callCtx, func() error {
		body, err := postJSON(callCtx, CapabilityEmbedding, reqBody, embeddingHTTPClient())
		if err != nil {
			return err
		}
		respBody = body
		return nil
	})
	if err != nil {
		return nil, "", err
	}

	var parsed embeddingResponse
	if err := json.Unmarshal(respBody, &parsed); err != nil {
		return nil, "", err
	}
	if len(parsed.Data) != len(inputs) {
		return nil, "", errors.New("openai: embedding row count mismatch")
	}
	out := make([][]float32, len(parsed.Data))
	for i, row := range parsed.Data {
		vec := make([]float32, len(row.Embedding))
		for j, f := range row.Embedding {
			vec[j] = float32(f)
		}
		out[i] = vec
	}
	respModel := strings.TrimSpace(parsed.Model)
	if respModel == "" {
		respModel = model
	}
	return out, respModel, nil
}
