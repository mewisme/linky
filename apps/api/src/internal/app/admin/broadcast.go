package admin

import (
	"context"
	"errors"
	"strings"

	"linky-api/src/internal/app/broadcastai"
	"linky-api/src/internal/infra/supax"
)

var ErrBroadcastMessageRequired = errors.New("message is required")

type CreateBroadcastInput struct {
	Message      string
	Title        string
	DeliveryMode string
	URL          string
	CreatorClerk string
}

func CreateBroadcast(ctx context.Context, input CreateBroadcastInput) (map[string]any, error) {
	if input.Message == "" {
		return nil, ErrBroadcastMessageRequired
	}
	creatorID, err := supax.GetUserInternalID(ctx, input.CreatorClerk)
	if err != nil {
		return nil, err
	}
	if creatorID == "" {
		return nil, errors.New("user not found in database")
	}
	row, err := supax.InsertBroadcastHistory(ctx, creatorID, input.Title, input.Message)
	if err != nil {
		return nil, err
	}
	if row == nil {
		return nil, errors.New("failed to create broadcast")
	}
	return map[string]any{
		"message": "Broadcast saved",
		"sent":    0,
		"row":     row,
	}, nil
}

type GenerateBroadcastAIInput struct {
	Audience        string
	KeyPoints       string
	CreatedByUserID string
}

func GenerateBroadcastAI(ctx context.Context, input GenerateBroadcastAIInput) (any, error) {
	return broadcastai.Generate(ctx, broadcastai.GenerateParams{
		Audience:        strings.TrimSpace(input.Audience),
		KeyPoints:       strings.TrimSpace(input.KeyPoints),
		CreatedByUserID: input.CreatedByUserID,
	})
}

var ErrBroadcastAIBusy = broadcastai.ErrInProgress
