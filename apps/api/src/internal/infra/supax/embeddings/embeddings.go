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
	"linky-api/src/internal/infra/supax/pgclient"
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
	c := pgclient.Client()
	if c == nil {
		return errors.New("supabase: not configured")
	}
	hash := sha256.Sum256([]byte(sourceText))
	body := map[string]any{
		"user_id":     userID,
		col:           encodePgVector(embedding),
		"source_hash": hex.EncodeToString(hash[:]),
		"model_name":  modelName,
	}
	_, _, err := c.From("user_embeddings").
		Upsert(body, "user_id", "representation", "exact").
		ExecuteWithContext(ctx)
	return err
}

func ListByUserIDs(ctx context.Context, userIDs []string) (map[string][]float32, error) {
	if len(userIDs) == 0 {
		return map[string][]float32{}, nil
	}
	col := embeddingconfig.ColumnName()
	if col == "" {
		return nil, errors.New("embedding column not configured")
	}
	c := pgclient.Client()
	if c == nil {
		return nil, errors.New("supabase: not configured")
	}
	raw, _, err := c.From("user_embeddings").
		Select("user_id,"+col, "exact", false).
		In("user_id", userIDs).
		ExecuteWithContext(ctx)
	if err != nil {
		return nil, err
	}
	var rows []map[string]json.RawMessage
	if err := json.Unmarshal(raw, &rows); err != nil {
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
