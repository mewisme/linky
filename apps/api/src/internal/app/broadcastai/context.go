package broadcastai

import (
	"context"
	"crypto/sha256"
	"encoding/hex"
	"encoding/json"
	"errors"
	"sort"
	"strings"
	"time"

	"linky-api/src/internal/infra/openaix"
	"linky-api/src/internal/infra/supax/pgclient"
)

const (
	cacheTTL          = 30 * time.Minute
	regenerateAfter   = 60 * time.Second
	promptVersion     = "v1"
	maxAudienceChars  = 400
	maxKeyPointsChars = 1400
)

var ErrInProgress = errors.New("broadcast AI draft generation already in progress")

type GenerateParams struct {
	Audience        string
	KeyPoints       string
	CreatedByUserID string
}

type ToneVariant struct {
	Tone  string `json:"tone"`
	Title string `json:"title"`
	Body  string `json:"body"`
	CTA   string `json:"cta"`
}

type Output struct {
	Primary      Primary       `json:"primary"`
	ToneVariants []ToneVariant `json:"tone_variants"`
}

type Primary struct {
	Title string `json:"title"`
	Body  string `json:"body"`
	CTA   string `json:"cta"`
}

func Generate(ctx context.Context, p GenerateParams) (*Output, error) {
	audience := normalize(p.Audience, maxAudienceChars)
	keyPoints := normalize(p.KeyPoints, maxKeyPointsChars)
	if audience == "" || keyPoints == "" {
		return nil, errors.New("audience and key_points are required")
	}
	hash := dedupeHash(map[string]any{
		"audience":      audience,
		"keyPoints":     keyPoints,
		"promptVersion": promptVersion,
		"model":         openaix.BroadcastModel(),
	})

	if cached, ok, err := loadCached(ctx, hash); err != nil {
		return nil, err
	} else if ok {
		return cached, nil
	}

	claimed, err := claim(ctx, hash)
	if err != nil {
		return nil, err
	}
	if !claimed {
		return nil, ErrInProgress
	}

	defer func() {
		_ = revertIfGenerating(ctx, hash)
	}()

	prompt := buildPrompt(audience, keyPoints)
	text, err := openaix.ChatCompletion(ctx, openaix.ChatUseCaseBroadcast, []openaix.ChatMessage{
		{Role: "system", Content: "You are a marketing assistant generating internal product broadcasts."},
		{Role: "user", Content: prompt},
	})
	if err != nil {
		return nil, err
	}
	parsed, err := safeParseObject(text)
	if err != nil {
		return nil, err
	}
	out, err := validateOutput(parsed)
	if err != nil {
		return nil, err
	}
	if err := persist(ctx, hash, out); err != nil {
		return nil, err
	}
	return out, nil
}

func loadCached(ctx context.Context, hash string) (*Output, bool, error) {
	c := pgclient.Client()
	if c == nil {
		return nil, false, nil
	}
	raw, _, err := c.From("broadcast_ai_drafts").
		Select("payload, status, expires_at", "exact", false).
		Eq("hash", hash).
		ExecuteWithContext(ctx)
	if err != nil {
		return nil, false, err
	}
	type row struct {
		Payload   json.RawMessage `json:"payload"`
		Status    string          `json:"status"`
		ExpiresAt string          `json:"expires_at"`
	}
	var rows []row
	if err := json.Unmarshal(raw, &rows); err != nil {
		return nil, false, err
	}
	if len(rows) == 0 {
		return nil, false, nil
	}
	r := rows[0]
	if r.Status != "ready" {
		return nil, false, nil
	}
	t, err := time.Parse(time.RFC3339Nano, r.ExpiresAt)
	if err == nil && time.Now().After(t) {
		return nil, false, nil
	}
	var out Output
	if err := json.Unmarshal(r.Payload, &out); err != nil {
		return nil, false, err
	}
	return &out, true, nil
}

func claim(ctx context.Context, hash string) (bool, error) {
	c := pgclient.Client()
	if c == nil {
		return true, nil
	}
	body := map[string]any{
		"hash":           hash,
		"payload":        map[string]any{},
		"prompt_version": promptVersion,
		"status":         "generating",
		"expires_at":     time.Now().Add(regenerateAfter).UTC().Format(time.RFC3339Nano),
	}
	raw, _, err := c.From("broadcast_ai_drafts").
		Insert(body, false, "", "representation", "exact").
		ExecuteWithContext(ctx)
	if err != nil {
		expr, _, gerr := c.From("broadcast_ai_drafts").
			Select("status, expires_at", "exact", false).
			Eq("hash", hash).
			ExecuteWithContext(ctx)
		if gerr != nil {
			return false, err
		}
		var existing []struct {
			Status    string `json:"status"`
			ExpiresAt string `json:"expires_at"`
		}
		_ = json.Unmarshal(expr, &existing)
		if len(existing) == 0 {
			return false, err
		}
		exp, perr := time.Parse(time.RFC3339Nano, existing[0].ExpiresAt)
		if existing[0].Status == "generating" && (perr != nil || time.Now().Before(exp)) {
			return false, nil
		}
		_, _, uerr := c.From("broadcast_ai_drafts").
			Update(body, "representation", "exact").
			Eq("hash", hash).
			ExecuteWithContext(ctx)
		if uerr != nil {
			return false, uerr
		}
		return true, nil
	}
	_ = raw
	return true, nil
}

func revertIfGenerating(ctx context.Context, hash string) error {
	c := pgclient.Client()
	if c == nil {
		return nil
	}
	body := map[string]any{"status": "idle"}
	_, _, err := c.From("broadcast_ai_drafts").
		Update(body, "", "exact").
		Eq("hash", hash).
		Eq("status", "generating").
		ExecuteWithContext(ctx)
	return err
}

func persist(ctx context.Context, hash string, out *Output) error {
	c := pgclient.Client()
	if c == nil {
		return nil
	}
	payload, err := json.Marshal(out)
	if err != nil {
		return err
	}
	body := map[string]any{
		"hash":           hash,
		"payload":        json.RawMessage(payload),
		"prompt_version": promptVersion,
		"model":          openaix.BroadcastModel(),
		"status":         "ready",
		"generated_at":   time.Now().UTC().Format(time.RFC3339Nano),
		"expires_at":     time.Now().Add(cacheTTL).UTC().Format(time.RFC3339Nano),
	}
	_, _, err = c.From("broadcast_ai_drafts").
		Update(body, "", "exact").
		Eq("hash", hash).
		ExecuteWithContext(ctx)
	return err
}

func dedupeHash(input map[string]any) string {
	keys := make([]string, 0, len(input))
	for k := range input {
		keys = append(keys, k)
	}
	sort.Strings(keys)
	var b strings.Builder
	for _, k := range keys {
		b.WriteString(k)
		b.WriteByte('=')
		v := input[k]
		switch t := v.(type) {
		case string:
			b.WriteString(t)
		default:
			j, _ := json.Marshal(t)
			b.Write(j)
		}
		b.WriteByte('|')
	}
	sum := sha256.Sum256([]byte(b.String()))
	return hex.EncodeToString(sum[:])
}

func normalize(input string, max int) string {
	trimmed := strings.TrimSpace(input)
	if trimmed == "" {
		return ""
	}
	if len(trimmed) <= max {
		return trimmed
	}
	return trimmed[:max] + "…"
}



func buildPrompt(audience, keyPoints string) string {
	return strings.Join([]string{
		"Generate a structured broadcast message in JSON.",
		"Audience: " + audience,
		"Key points: " + keyPoints,
		"Schema:",
		`{
  "primary": { "title": string, "body": string, "cta": string },
  "tone_variants": [
    { "tone": "friendly", "title": string, "body": string, "cta": string },
    { "tone": "professional", "title": string, "body": string, "cta": string },
    { "tone": "direct", "title": string, "body": string, "cta": string }
  ]
}`,
		"Output ONLY the JSON object, no explanation.",
	}, "\n")
}

func safeParseObject(s string) (map[string]any, error) {
	s = strings.TrimSpace(s)
	start := strings.Index(s, "{")
	end := strings.LastIndex(s, "}")
	if start == -1 || end == -1 || end <= start {
		return nil, errors.New("model output did not contain a JSON object")
	}
	var out map[string]any
	if err := json.Unmarshal([]byte(s[start:end+1]), &out); err != nil {
		return nil, err
	}
	return out, nil
}

func validateOutput(in map[string]any) (*Output, error) {
	primary, _ := in["primary"].(map[string]any)
	if primary == nil {
		return nil, errors.New("missing primary block")
	}
	out := &Output{
		Primary: Primary{
			Title: asString(primary["title"]),
			Body:  asString(primary["body"]),
			CTA:   asString(primary["cta"]),
		},
	}
	if out.Primary.Title == "" || out.Primary.Body == "" || out.Primary.CTA == "" {
		return nil, errors.New("primary block missing fields")
	}
	rawVariants, _ := in["tone_variants"].([]any)
	if len(rawVariants) != 3 {
		return nil, errors.New("tone_variants must have exactly 3 entries")
	}
	tones := map[string]bool{}
	for _, raw := range rawVariants {
		v, _ := raw.(map[string]any)
		if v == nil {
			return nil, errors.New("invalid tone variant")
		}
		tone := asString(v["tone"])
		if tone != "friendly" && tone != "professional" && tone != "direct" {
			return nil, errors.New("tone must be friendly|professional|direct")
		}
		if tones[tone] {
			return nil, errors.New("duplicate tone")
		}
		tones[tone] = true
		out.ToneVariants = append(out.ToneVariants, ToneVariant{
			Tone:  tone,
			Title: asString(v["title"]),
			Body:  asString(v["body"]),
			CTA:   asString(v["cta"]),
		})
	}
	if len(tones) != 3 {
		return nil, errors.New("tone_variants must cover all three tones")
	}
	return out, nil
}

func asString(v any) string {
	s, _ := v.(string)
	return s
}
