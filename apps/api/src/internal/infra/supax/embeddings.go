package supax

import (
	"context"
	"crypto/sha256"
	"encoding/hex"
	"encoding/json"
	"errors"
	"fmt"
	"strings"

	"linky-api/src/internal/infra/embeddingconfig"
)

func encodePgVector(v []float32) string {
	var b strings.Builder
	b.WriteByte('[')
	for i, x := range v {
		if i > 0 {
			b.WriteByte(',')
		}
		b.WriteString(fmt.Sprintf("%g", x))
	}
	b.WriteByte(']')
	return b.String()
}

func decodePgVector(s string) []float32 {
	s = strings.TrimSpace(s)
	if s == "" {
		return nil
	}
	if len(s) > 0 && s[0] == '[' {
		s = s[1:]
	}
	if len(s) > 0 && s[len(s)-1] == ']' {
		s = s[:len(s)-1]
	}
	parts := strings.Split(s, ",")
	out := make([]float32, 0, len(parts))
	for _, p := range parts {
		p = strings.TrimSpace(p)
		if p == "" {
			continue
		}
		var f float32
		_, err := fmt.Sscanf(p, "%g", &f)
		if err != nil {
			return nil
		}
		out = append(out, f)
	}
	return out
}

func UpsertUserEmbedding(ctx context.Context, userID string, embedding []float32, sourceText string, modelName string) error {
	if userID == "" || len(embedding) == 0 {
		return errors.New("invalid embedding upsert input")
	}
	expectedDim := embeddingconfig.Dimension()
	if len(embedding) != expectedDim {
		return fmt.Errorf("embedding dimension mismatch: got %d want %d", len(embedding), expectedDim)
	}
	col := embeddingconfig.ColumnName()
	if col == "" {
		return errors.New("embedding column not configured")
	}
	hash := sha256.Sum256([]byte(sourceText))
	body := map[string]any{
		"user_id":     userID,
		col:           encodePgVector(embedding),
		"source_hash": hex.EncodeToString(hash[:]),
		"model_name":  modelName,
	}
	url := strings.TrimRight(rpcCfg.SupabaseURL, "/") + "/rest/v1/user_embeddings?on_conflict=user_id"
	bodyJSON, _ := json.Marshal(body)
	headers := map[string]string{
		"Content-Type":  "application/json",
		"apikey":        rpcCfg.SupabaseServiceRoleKey,
		"Authorization": "Bearer " + rpcCfg.SupabaseServiceRoleKey,
		"Prefer":        "resolution=merge-duplicates,return=representation",
	}
	_, err := postgrestRaw(ctx, "POST", url, headers, bodyJSON)
	return err
}

func ListUserEmbeddings(ctx context.Context, userIDs []string) (map[string][]float32, error) {
	if len(userIDs) == 0 {
		return map[string][]float32{}, nil
	}
	if rpcCfg == nil || rpcCfg.SupabaseURL == "" {
		return nil, errors.New("supabase rpc not configured")
	}
	col := embeddingconfig.ColumnName()
	if col == "" {
		return nil, errors.New("embedding column not configured")
	}
	in := strings.Join(userIDs, ",")
	url := strings.TrimRight(rpcCfg.SupabaseURL, "/") +
		"/rest/v1/user_embeddings?select=user_id," + col + "&user_id=in.(" + in + ")"
	headers := map[string]string{
		"apikey":        rpcCfg.SupabaseServiceRoleKey,
		"Authorization": "Bearer " + rpcCfg.SupabaseServiceRoleKey,
	}
	body, err := postgrestRaw(ctx, "GET", url, headers, nil)
	if err != nil {
		return nil, err
	}
	var rows []map[string]json.RawMessage
	if err := json.Unmarshal(body, &rows); err != nil {
		return nil, err
	}
	out := make(map[string][]float32, len(rows))
	for _, r := range rows {
		var userID string
		if raw, ok := r["user_id"]; ok {
			_ = json.Unmarshal(raw, &userID)
		}
		rawEmb, ok := r[col]
		if !ok || len(rawEmb) == 0 || string(rawEmb) == "null" {
			continue
		}
		var embStr string
		if err := json.Unmarshal(rawEmb, &embStr); err != nil {
			continue
		}
		v := decodePgVector(embStr)
		if len(v) > 0 {
			out[userID] = v
		}
	}
	return out, nil
}

type ReportAISummaryRow struct {
	ReportID  string `json:"report_id"`
	Summary   string `json:"summary"`
	ModelName string `json:"model_name"`
	CreatedAt string `json:"created_at"`
}

func GetReportContext(ctx context.Context, reportID string) (map[string]any, error) {
	c := Client()
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
	r, err := decodeOne[map[string]any](raw)
	if err != nil || r == nil {
		return nil, err
	}
	return *r, nil
}

func UpsertReportAISummary(ctx context.Context, reportID, summary, modelName string) error {
	if reportID == "" || summary == "" {
		return errors.New("invalid report ai summary input")
	}
	body := map[string]any{
		"report_id":  reportID,
		"summary":    summary,
		"model_name": modelName,
	}
	url := strings.TrimRight(rpcCfg.SupabaseURL, "/") + "/rest/v1/report_ai_summaries?on_conflict=report_id"
	bodyJSON, _ := json.Marshal(body)
	headers := map[string]string{
		"Content-Type":  "application/json",
		"apikey":        rpcCfg.SupabaseServiceRoleKey,
		"Authorization": "Bearer " + rpcCfg.SupabaseServiceRoleKey,
		"Prefer":        "resolution=merge-duplicates,return=representation",
	}
	_, err := postgrestRaw(ctx, "POST", url, headers, bodyJSON)
	return err
}

func GetExistingReportAISummary(ctx context.Context, reportID string) (*ReportAISummaryRow, error) {
	c := Client()
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
	return decodeOne[ReportAISummaryRow](raw)
}
