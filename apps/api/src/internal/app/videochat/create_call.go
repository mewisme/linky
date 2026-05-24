package videochat

import (
	"context"
	"errors"
	"time"

	"linky-api/src/internal/infra/supax"
)

var (
	ErrCallerCalleeRequired = errors.New("caller_id and callee_id are required")
	ErrCallHistorySelfOnly  = errors.New("you can only create call history records for yourself")
)

type CreateCallHistoryInput struct {
	CallerID        string
	CalleeID        string
	StartedAt       string
	EndedAt         string
	DurationSeconds *int
}

func CreateCallHistory(ctx context.Context, uid string, input CreateCallHistoryInput) (*supax.CallHistoryRow, error) {
	if input.CallerID == "" || input.CalleeID == "" {
		return nil, ErrCallerCalleeRequired
	}
	if input.CallerID != uid && input.CalleeID != uid {
		return nil, ErrCallHistorySelfOnly
	}
	startedAt := time.Now()
	if input.StartedAt != "" {
		if t, err := time.Parse(time.RFC3339, input.StartedAt); err == nil {
			startedAt = t
		}
	}
	var endedAt *time.Time
	if input.EndedAt != "" {
		if t, err := time.Parse(time.RFC3339, input.EndedAt); err == nil {
			endedAt = &t
		}
	}
	callerCountry, _ := supax.GetUserCountry(ctx, input.CallerID)
	calleeCountry, _ := supax.GetUserCountry(ctx, input.CalleeID)
	return supax.CreateCallHistory(ctx, supax.CreateCallHistoryParams{
		CallerID:        input.CallerID,
		CalleeID:        input.CalleeID,
		CallerCountry:   callerCountry,
		CalleeCountry:   calleeCountry,
		StartedAt:       startedAt,
		EndedAt:         endedAt,
		DurationSeconds: input.DurationSeconds,
	})
}
