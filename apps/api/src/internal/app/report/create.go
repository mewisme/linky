package report

import (
	"context"
	"errors"

	"linky-api/src/internal/infra/supax"
)

var (
	ErrReportTargetRequired = errors.New("reported_user_id is required")
	ErrReportReasonRequired = errors.New("reason is required")
	ErrReportSelf           = errors.New("cannot report yourself")
)

type CreateInput struct {
	ReportedUserID string
	Reason         string
	Description    string
	Metadata       map[string]any
}

func Create(ctx context.Context, reporterID string, input CreateInput) (*supax.ReportRow, error) {
	if input.ReportedUserID == "" {
		return nil, ErrReportTargetRequired
	}
	if input.Reason == "" {
		return nil, ErrReportReasonRequired
	}
	if input.ReportedUserID == reporterID {
		return nil, ErrReportSelf
	}
	body := map[string]any{
		"reporter_user_id": reporterID,
		"reported_user_id": input.ReportedUserID,
		"reason":           input.Reason,
		"status":           "pending",
	}
	row, err := supax.CreateReport(ctx, body)
	if err != nil {
		return nil, err
	}
	if row != nil && input.Metadata != nil {
		_ = supax.CreateReportContext(ctx, row.ID, input.Metadata)
	}
	if row != nil {
		go OnReportCreated(context.Background(), row.ID)
	}
	return row, nil
}
