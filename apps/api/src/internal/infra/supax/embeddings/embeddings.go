package embeddings

import (
	"context"
	"crypto/sha256"
	"encoding/hex"
	"encoding/json"
	"errors"
	"fmt"
	"strings"

	"linky-api/src/internal/infra/embeddingconfig"
	"linky-api/src/internal/infra/supax/postgrest"
	"linky-api/src/internal/infra/supax/rpc"
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

func UpsertUser(ctx context.Context, userID string, embedding []float32, sourceText, modelName string) error {
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
	cfg := rpc.Config()
	if cfg == nil || cfg.SupabaseURL == "" {
		return errors.New("supabase rpc not configured")
	}
	url := strings.TrimRight(cfg.SupabaseURL, "/") + "/rest/v1/user_embeddings?on_conflict=user_id"
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

func ListByUserIDs(ctx context.Context, userIDs []string) (map[string][]float32, error) {
	if len(userIDs) == 0 {
		return map[string][]float32{}, nil
	}
	cfg := rpc.Config()
	if cfg == nil || cfg.SupabaseURL == "" {
		return nil, errors.New("supabase rpc not configured")
	}
	col := embeddingconfig.ColumnName()
	if col == "" {
		return nil, errors.New("embedding column not configured")
	}
	in := strings.Join(userIDs, ",")
	url := strings.TrimRight(cfg.SupabaseURL, "/") +
		"/rest/v1/user_embeddings?select=user_id," + col + "&user_id=in.(" + in + ")"
	headers := map[string]string{
		"apikey":        cfg.SupabaseServiceRoleKey,
		"Authorization": "Bearer " + cfg.SupabaseServiceRoleKey,
	}
	body, err := postgrest.Raw(ctx, "GET", url, headers, nil)
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
