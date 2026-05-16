package ollamax

import (
	"bytes"
	"context"
	"encoding/json"
	"errors"
	"io"
	"net/http"
	"strings"
	"sync"
	"time"

	"linky-api/src-go/internal/config"
	"linky-api/src-go/internal/logger"
)

var (
	cfg     *config.Config
	once    sync.Once
	log     = logger.New("infra:ollama")
)

func Init(c *config.Config) {
	cfg = c
}

func enabled() bool {
	return cfg != nil && strings.TrimSpace(cfg.OllamaEmbeddingURL) != ""
}

type embedRequest struct {
	Model     string   `json:"model"`
	Input     []string `json:"input"`
	Truncate  bool     `json:"truncate"`
	KeepAlive int      `json:"keep_alive,omitempty"`
}

type embedResponse struct {
	Model      string      `json:"model"`
	Embeddings [][]float32 `json:"embeddings"`
}

type pullRequest struct {
	Model  string `json:"model"`
	Stream bool   `json:"stream"`
}

func PullModel(ctx context.Context, model string) error {
	if !enabled() {
		return nil
	}
	body, _ := json.Marshal(pullRequest{Model: model, Stream: false})
	url := strings.TrimRight(cfg.OllamaEmbeddingURL, "/") + "/api/pull"
	req, err := http.NewRequestWithContext(ctx, "POST", url, bytes.NewReader(body))
	if err != nil {
		return err
	}
	req.Header.Set("Content-Type", "application/json")
	if cfg.OllamaAPIKey != "" {
		req.Header.Set("Authorization", "Bearer "+cfg.OllamaAPIKey)
	}
	timeout := time.Duration(cfg.OllamaEmbeddingTimeout) * time.Millisecond
	if timeout <= 0 {
		timeout = 60 * time.Second
	}
	client := &http.Client{Timeout: timeout}
	resp, err := client.Do(req)
	if err != nil {
		return err
	}
	defer resp.Body.Close()
	if resp.StatusCode >= 400 {
		raw, _ := io.ReadAll(resp.Body)
		return errors.New("ollama pull failed: " + resp.Status + " body " + string(raw))
	}
	_, _ = io.Copy(io.Discard, resp.Body)
	return nil
}

func PullEmbeddingModelAtStartup(ctx context.Context) {
	if !enabled() {
		log.Warn().Msg("OLLAMA_EMBEDDING_URL is not set; skipping Ollama embedding model pull")
		return
	}
	once.Do(func() {
		log.Info().Str("model", cfg.OllamaEmbeddingModel).Msg("Pulling Ollama embedding model if missing")
		if err := PullModel(ctx, cfg.OllamaEmbeddingModel); err != nil {
			log.Error().Err(err).Msg("Failed to pull Ollama embedding model")
			return
		}
		log.Info().Str("model", cfg.OllamaEmbeddingModel).Msg("Ollama embedding model available")
	})
}

func EmbedBatch(ctx context.Context, inputs []string) ([][]float32, string, error) {
	if !enabled() {
		return nil, "", errors.New("ollama embedding not configured")
	}
	if len(inputs) == 0 {
		return nil, cfg.OllamaEmbeddingModel, nil
	}
	body, _ := json.Marshal(embedRequest{
		Model:     cfg.OllamaEmbeddingModel,
		Input:     inputs,
		Truncate:  true,
		KeepAlive: 60,
	})
	url := strings.TrimRight(cfg.OllamaEmbeddingURL, "/") + "/api/embed"
	timeout := time.Duration(cfg.OllamaEmbeddingTimeout) * time.Millisecond
	if timeout <= 0 {
		timeout = 60 * time.Second
	}
	client := &http.Client{Timeout: timeout}

	var lastErr error
	for attempt := 0; attempt <= cfg.EmbedRetryCount; attempt++ {
		req, err := http.NewRequestWithContext(ctx, "POST", url, bytes.NewReader(body))
		if err != nil {
			return nil, "", err
		}
		req.Header.Set("Content-Type", "application/json")
		if cfg.OllamaAPIKey != "" {
			req.Header.Set("Authorization", "Bearer "+cfg.OllamaAPIKey)
		}
		resp, err := client.Do(req)
		if err != nil {
			lastErr = err
			if attempt >= cfg.EmbedRetryCount {
				return nil, "", err
			}
			delay := time.Duration(cfg.EmbedRetryBaseDelayMs<<attempt) * time.Millisecond
			time.Sleep(delay)
			continue
		}
		raw, _ := io.ReadAll(resp.Body)
		resp.Body.Close()
		if resp.StatusCode >= 400 {
			lastErr = errors.New("ollama embed status " + resp.Status + " body " + string(raw))
			if resp.StatusCode == 408 || resp.StatusCode == 429 || resp.StatusCode >= 500 {
				if attempt < cfg.EmbedRetryCount {
					delay := time.Duration(cfg.EmbedRetryBaseDelayMs<<attempt) * time.Millisecond
					time.Sleep(delay)
					continue
				}
			}
			return nil, "", lastErr
		}
		var parsed embedResponse
		if err := json.Unmarshal(raw, &parsed); err != nil {
			return nil, "", err
		}
		if len(parsed.Embeddings) != len(inputs) {
			return nil, parsed.Model, errors.New("embedding row count mismatch")
		}
		model := parsed.Model
		if model == "" {
			model = cfg.OllamaEmbeddingModel
		}
		return parsed.Embeddings, model, nil
	}
	return nil, "", lastErr
}

type ChatMessage struct {
	Role    string `json:"role"`
	Content string `json:"content"`
}

type chatRequest struct {
	Model    string        `json:"model"`
	Messages []ChatMessage `json:"messages"`
	Stream   bool          `json:"stream"`
}

type chatResponse struct {
	Choices []struct {
		Message ChatMessage `json:"message"`
	} `json:"choices"`
	Message ChatMessage `json:"message"`
}

func ChatCompletion(ctx context.Context, messages []ChatMessage) (string, error) {
	if !enabled() {
		return "", errors.New("ollama chat not configured")
	}
	body, _ := json.Marshal(chatRequest{
		Model:    cfg.OllamaCloudModel,
		Messages: messages,
		Stream:   false,
	})
	url := strings.TrimRight(cfg.OllamaEmbeddingURL, "/") + "/v1/chat/completions"
	timeout := time.Duration(cfg.OllamaEmbeddingTimeout) * time.Millisecond
	if timeout <= 0 {
		timeout = 60 * time.Second
	}
	client := &http.Client{Timeout: timeout}
	req, err := http.NewRequestWithContext(ctx, "POST", url, bytes.NewReader(body))
	if err != nil {
		return "", err
	}
	req.Header.Set("Content-Type", "application/json")
	if cfg.OllamaAPIKey != "" {
		req.Header.Set("Authorization", "Bearer "+cfg.OllamaAPIKey)
	}
	resp, err := client.Do(req)
	if err != nil {
		return "", err
	}
	defer resp.Body.Close()
	raw, _ := io.ReadAll(resp.Body)
	if resp.StatusCode >= 400 {
		return "", errors.New("ollama chat status " + resp.Status + " body " + string(raw))
	}
	var parsed chatResponse
	if err := json.Unmarshal(raw, &parsed); err != nil {
		return "", err
	}
	if len(parsed.Choices) > 0 && parsed.Choices[0].Message.Content != "" {
		return parsed.Choices[0].Message.Content, nil
	}
	if parsed.Message.Content != "" {
		return parsed.Message.Content, nil
	}
	return "", errors.New("ollama chat returned empty content")
}
