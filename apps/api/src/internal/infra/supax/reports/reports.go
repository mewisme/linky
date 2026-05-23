package reports

import (
	"context"
	"errors"

	"linky-api/src/internal/infra/supax/codec"
	"linky-api/src/internal/infra/supax/pgclient"
)

type AISummaryRow struct {
	ReportID  string `json:"report_id"`
	Summary   string `json:"summary"`
	ModelName string `json:"model_name"`
	CreatedAt string `json:"created_at"`
}

func GetContext(ctx context.Context, reportID string) (map[string]any, error) {
	c := pgclient.Client()
	if c == nil {
		return nil, errors.New("supabase: not configured")
	}
	raw, _, err := c.From("report_contexts").
		Select("*", "exact", false).
		Eq("report_id", reportID).
		ExecuteWithContext(ctx)
	if err != nil {
		return nil, err
	}
	r, err := codec.DecodeOne[map[string]any](raw)
	if err != nil || r == nil {
		return nil, err
	}
	return *r, nil
}

func UpsertAISummary(ctx context.Context, reportID, summary, modelName string) error {
	if reportID == "" || summary == "" {
		return errors.New("invalid report ai summary input")
	}
	c := pgclient.Client()
	if c == nil {
		return errors.New("supabase: not configured")
	}
	body := map[string]any{
		"report_id":  reportID,
		"summary":    summary,
		"model_name": modelName,
	}
	_, _, err := c.From("report_ai_summaries").
		Upsert(body, "report_id", "representation", "exact").
		ExecuteWithContext(ctx)
	return err
}

func GetExistingAISummary(ctx context.Context, reportID string) (*AISummaryRow, error) {
	c := pgclient.Client()
	if c == nil {
		return nil, errors.New("supabase: not configured")
	}
	raw, _, err := c.From("report_ai_summaries").
		Select("*", "exact", false).
		Eq("report_id", reportID).
		ExecuteWithContext(ctx)
	if err != nil {
		return nil, err
	}
	return codec.DecodeOne[AISummaryRow](raw)
}
