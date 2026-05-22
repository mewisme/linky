package reports

import (
	"context"
	"encoding/json"
	"errors"
	"strings"

	"linky-api/src/internal/infra/supax/client"
	"linky-api/src/internal/infra/supax/codec"
	"linky-api/src/internal/infra/supax/postgrest"
	"linky-api/src/internal/infra/supax/rpc"
)

type AISummaryRow struct {
	ReportID  string `json:"report_id"`
	Summary   string `json:"summary"`
	ModelName string `json:"model_name"`
	CreatedAt string `json:"created_at"`
}

func GetContext(ctx context.Context, reportID string) (map[string]any, error) {
	c := client.Client()
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
	body := map[string]any{
		"report_id":  reportID,
		"summary":    summary,
		"model_name": modelName,
	}
	cfg := rpc.Config()
	if cfg == nil || cfg.SupabaseURL == "" {
		return errors.New("supabase rpc not configured")
	}
	url := strings.TrimRight(cfg.SupabaseURL, "/") + "/rest/v1/report_ai_summaries?on_conflict=report_id"
	bodyJSON, _ := json.Marshal(body)
	headers := map[string]string{
		"Content-Type":  "application/json",
		"apikey":        cfg.SupabaseServiceRoleKey,
		"Authorization": "Bearer " + cfg.SupabaseServiceRoleKey,
		"Prefer":        "resolution=merge-duplicates,return=representation",
	}
	_, err := postgrest.Raw(ctx, "POST", url, headers, bodyJSON)
	return err
}

func GetExistingAISummary(ctx context.Context, reportID string) (*AISummaryRow, error) {
	c := client.Client()
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
