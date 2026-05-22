package user

import (
	"context"
	"errors"

	"linky-api/src/internal/infra/supax"
)

var (
	ErrBlockSelf      = errors.New("cannot block yourself")
	ErrAlreadyBlocked = errors.New("user is already blocked")
	ErrNotBlocked     = errors.New("user is not blocked")
)

func ListBlocks(ctx context.Context, userID string) ([]map[string]any, error) {
	rows, err := supax.GetBlockedUsersWithDetails(ctx, userID)
	if err != nil {
		return nil, err
	}
	if rows == nil {
		return []map[string]any{}, nil
	}
	return rows, nil
}

func CreateBlock(ctx context.Context, userID, blockedUserID string) (map[string]any, error) {
	if blockedUserID == userID {
		return nil, ErrBlockSelf
	}
	exists, _ := supax.CheckBlockExists(ctx, userID, blockedUserID)
	if exists {
		return nil, ErrAlreadyBlocked
	}
	return supax.CreateBlock(ctx, userID, blockedUserID)
}

func DeleteBlock(ctx context.Context, userID, blockedUserID string) error {
	exists, _ := supax.CheckBlockExists(ctx, userID, blockedUserID)
	if !exists {
		return ErrNotBlocked
	}
	return supax.DeleteBlock(ctx, userID, blockedUserID)
}
