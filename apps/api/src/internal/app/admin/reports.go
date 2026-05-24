package admin

import (
	"context"
	"errors"

	"linky-api/src/internal/infra/supax"
	"linky-api/src/internal/jobs"
)

var ErrReportIDRequired = errors.New("report id required")

func PatchReport(ctx context.Context, id string, body map[string]any) (*supax.ReportRow, error) {
	return supax.PatchReport(ctx, id, body)
}

type AsyncJobResult struct {
	Queued    bool `json:"queued"`
	Enqueued  *int `json:"enqueued,omitempty"`
	Scheduled *int `json:"scheduled,omitempty"`
}

func EnqueueReportAISummary(ctx context.Context, id string) (*AsyncJobResult, error) {
	if id == "" {
		return nil, ErrReportIDRequired
	}
	if err := jobs.EnqueueReportAISummary(ctx, id, true); err != nil {
		return nil, err
	}
	return &AsyncJobResult{Queued: true}, nil
}
