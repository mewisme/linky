package openaix

import (
	"context"
	"encoding/json"
	"errors"
	"strings"
	"time"

	"linky-api/src/internal/infra/aiconfig"
)

type ChatMessage struct {
	Role    string
	Content string
}

type chatCompletionRequest struct {
	Model    string            `json:"model"`
	Messages []chatMessageWire `json:"messages"`
	Stream   bool              `json:"stream"`
}

type chatMessageWire struct {
	Role    string `json:"role"`
	Content string `json:"content"`
}

type chatCompletionResponse struct {
	Model   string `json:"model"`
	Choices []struct {
		Message struct {
			Content string `json:"content"`
		} `json:"message"`
	} `json:"choices"`
}

func ChatCompletion(ctx context.Context, useCase ChatUseCase, messages []ChatMessage) (string, error) {
	model := ChatModel(useCase)
	if strings.TrimSpace(model) == "" {
		return "", errors.New("openai: chat model not configured for use case")
	}
	return chatCompletionWithModel(ctx, model, messages)
}

func chatCompletionWithModel(ctx context.Context, model string, messages []ChatMessage) (string, error) {
	if !Configured() {
		return "", errors.New("openai: provider not configured")
	}
	if strings.TrimSpace(model) == "" {
		return "", errors.New("openai: chat completion requested without a model")
	}
	if len(messages) == 0 {
		return "", errors.New("openai: chat completion requires at least one message")
	}

	e := aiconfig.EffectiveConfig()
	timeout := time.Duration(e.RequestTimeoutMs) * time.Millisecond
	if timeout <= 0 {
		timeout = 60 * time.Second
	}
	callCtx, cancel := context.WithTimeout(ctx, timeout)
	defer cancel()

	wire := make([]chatMessageWire, 0, len(messages))
	for _, m := range messages {
		role := m.Role
		switch role {
		case "system", "user", "assistant", "developer":
		default:
			role = "user"
		}
		wire = append(wire, chatMessageWire{Role: role, Content: m.Content})
	}

	reqBody := chatCompletionRequest{
		Model:    model,
		Messages: wire,
		Stream:   false,
	}

	var respBody []byte
	err := withRetries(callCtx, func() error {
		body, err := postJSON(callCtx, CapabilityChat, reqBody, httpClient())
		if err != nil {
			return err
		}
		respBody = body
		return nil
	})
	if err != nil {
		return "", err
	}

	logChatCompletionResponse(model, respBody)

	var parsed chatCompletionResponse
	if err := json.Unmarshal(respBody, &parsed); err != nil {
		return "", err
	}
	if len(parsed.Choices) == 0 {
		return "", errors.New("openai: chat completion returned no choices")
	}
	content := strings.TrimSpace(parsed.Choices[0].Message.Content)
	if content == "" {
		return "", errors.New("openai: chat completion returned empty content")
	}
	return content, nil
}

func logChatCompletionResponse(model string, raw []byte) {
	if len(raw) == 0 {
		return
	}
	log.Debug().
		Str("model", model).
		Str("capability", string(CapabilityChat)).
		RawJSON("response", raw).
		Msg("OpenAI chat completion response")
}
