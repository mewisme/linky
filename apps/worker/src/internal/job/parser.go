package job

import (
	"encoding/json"
	"fmt"
	"regexp"
)

var dateRegex = regexp.MustCompile(`^\d{4}-\d{2}-\d{2}$`)

type ParsedJob struct {
	Envelope *Envelope
	Label    string
}

func Parse(raw string) (*ParsedJob, error) {
	var env Envelope
	if err := json.Unmarshal([]byte(raw), &env); err != nil {
		return nil, fmt.Errorf("invalid JSON: %w", err)
	}

	if env.V != 1 {
		return nil, fmt.Errorf("unsupported envelope version: %d", env.V)
	}

	switch env.Type {
	case "report_ai_summary":
		return parseReportAISummary(&env)
	case "user_embedding_regenerate":
		return parseUserEmbeddingRegenerate(&env)
	case "apply_call_exp":
		return parseApplyCallExp(&env)
	default:
		return nil, fmt.Errorf("unknown job type: %s", env.Type)
	}
}

func parseReportAISummary(env *Envelope) (*ParsedJob, error) {
	var p ReportAISummaryPayload
	if err := json.Unmarshal(env.Payload, &p); err != nil {
		return nil, fmt.Errorf("invalid report_ai_summary payload: %w", err)
	}
	if p.ReportID == "" {
		return nil, fmt.Errorf("report_ai_summary: reportId is required")
	}
	label := fmt.Sprintf("type=report_ai_summary reportId=%s force=%v", p.ReportID, p.Force)
	return &ParsedJob{Envelope: env, Label: label}, nil
}

func parseUserEmbeddingRegenerate(env *Envelope) (*ParsedJob, error) {
	var p UserEmbeddingRegeneratePayload
	if err := json.Unmarshal(env.Payload, &p); err != nil {
		return nil, fmt.Errorf("invalid user_embedding_regenerate payload: %w", err)
	}
	if p.UserID == "" {
		return nil, fmt.Errorf("user_embedding_regenerate: userId is required")
	}
	label := fmt.Sprintf("type=user_embedding_regenerate userId=%s", p.UserID)
	return &ParsedJob{Envelope: env, Label: label}, nil
}

func parseApplyCallExp(env *Envelope) (*ParsedJob, error) {
	var p ApplyCallExpPayload
	if err := json.Unmarshal(env.Payload, &p); err != nil {
		return nil, fmt.Errorf("invalid apply_call_exp payload: %w", err)
	}
	if p.UserID == "" {
		return nil, fmt.Errorf("apply_call_exp: userId is required")
	}
	if p.DurationSeconds <= 0 {
		return nil, fmt.Errorf("apply_call_exp: durationSeconds must be positive")
	}
	if p.ExpSecondsToAdd != nil && *p.ExpSecondsToAdd < 0 {
		return nil, fmt.Errorf("apply_call_exp: expSecondsToAdd must be non-negative")
	}
	if p.Timezone != nil && *p.Timezone == "" {
		return nil, fmt.Errorf("apply_call_exp: timezone must not be empty")
	}
	if p.CounterpartUserID != nil && *p.CounterpartUserID == "" {
		return nil, fmt.Errorf("apply_call_exp: counterpartUserId must not be empty")
	}
	if p.DateForExpToday != nil && !dateRegex.MatchString(*p.DateForExpToday) {
		return nil, fmt.Errorf("apply_call_exp: dateForExpToday must be YYYY-MM-DD format")
	}
	label := fmt.Sprintf("type=apply_call_exp userId=%s durationSeconds=%d", p.UserID, p.DurationSeconds)
	return &ParsedJob{Envelope: env, Label: label}, nil
}
