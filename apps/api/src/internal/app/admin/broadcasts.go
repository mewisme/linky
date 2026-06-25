package admin

import (
	"context"

	"linky-api/src/internal/infra/supax"
)

type StatusError struct {
	Status    int
	Code      string
	KeySuffix string
	Fallback  string
}

func (e *StatusError) Error() string { return e.Fallback }

func statusErr(status int, code, keySuffix, fallback string) *StatusError {
	return &StatusError{Status: status, Code: code, KeySuffix: keySuffix, Fallback: fallback}
}

type BroadcastListResult struct {
	Rows       []supax.BroadcastHistoryRow
	Count      int64
	Limit      int
	Offset     int
	TotalPages int64
}

func ListBroadcasts(ctx context.Context, limit, offset int) (*BroadcastListResult, error) {
	if limit <= 0 {
		limit = 50
	}
	if limit > 100 {
		limit = 100
	}
	if offset < 0 {
		offset = 0
	}
	rows, count, err := supax.ListBroadcastHistory(ctx, limit, offset)
	if err != nil {
		return nil, statusErr(500, "FAILED_FETCH_BROADCASTS", "failedFetchBroadcasts", "Failed to fetch broadcasts")
	}
	if rows == nil {
		rows = []supax.BroadcastHistoryRow{}
	}
	totalPages := int64(0)
	if limit > 0 {
		totalPages = (count + int64(limit) - 1) / int64(limit)
	}
	return &BroadcastListResult{
		Rows: rows, Count: count, Limit: limit, Offset: offset, TotalPages: totalPages,
	}, nil
}

type CreateBroadcastInput struct {
	CreatorUserID string
	Title         string
	Message       string
}

func CreateBroadcast(ctx context.Context, in CreateBroadcastInput) (*supax.BroadcastHistoryRow, error) {
	if in.Message == "" {
		return nil, statusErr(400, "BROADCAST_MESSAGE_REQUIRED", "broadcastMessageRequired", "message is required")
	}
	if in.CreatorUserID == "" {
		return nil, statusErr(404, "USER_NOT_IN_DB", "userNotInDatabase", "User not found in database")
	}
	row, err := supax.InsertBroadcastHistory(ctx, in.CreatorUserID, in.Title, in.Message)
	if err != nil || row == nil {
		return nil, statusErr(500, "FAILED_CREATE_BROADCAST", "failedCreateBroadcast", "Failed to create broadcast")
	}
	return row, nil
}

func ListUsers(ctx context.Context, opts supax.AdminUsersOptions) ([]map[string]any, int64, error) {
	rows, count, err := supax.ListAdminUsersUnified(ctx, opts)
	if err != nil {
		return nil, 0, statusErr(500, "FAILED_FETCH_USERS", "failedFetchUsers", "Failed to fetch users")
	}
	return rows, count, nil
}
