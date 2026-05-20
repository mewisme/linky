package worker

import (
	"context"
	"strings"

	"linky-api/src/internal/config"
	"linky-api/src/internal/domains/user/userservice"
	"linky-api/src/internal/infra/openaix"
	"linky-api/src/internal/infra/supax"
	"linky-api/src/internal/logger"
)

var (
	log = logger.New("worker:exec")
	cfg *config.Config
)

func Init(c *config.Config) { cfg = c }

type ApplyCallExpPayload struct {
	UserID            string `json:"userId"`
	DurationSeconds   int    `json:"durationSeconds"`
	ExpSecondsToAdd   *int   `json:"expSecondsToAdd,omitempty"`
	Timezone          string `json:"timezone,omitempty"`
	CounterpartUserID string `json:"counterpartUserId,omitempty"`
	DateForExpToday   string `json:"dateForExpToday,omitempty"`
}

func ExecuteReportAISummary(ctx context.Context, reportID string, force bool) error {
	if !force {
		existing, _ := supax.GetExistingReportAISummary(ctx, reportID)
		if existing != nil {
			log.Info().Str("reportId", reportID).Msg("report_ai_summary already exists, skipping")
			return nil
		}
	}
	report, err := supax.GetReport(ctx, reportID)
	if err != nil || report == nil {
		log.Warn().Str("reportId", reportID).Msg("report not found")
		return nil
	}
	contextRow, _ := supax.GetReportContext(ctx, reportID)

	system := "You are a moderation analyst. Read the user-submitted report and any attached context, and output a concise (3-5 sentence) summary suitable for a human moderator."
	var userParts []string
	userParts = append(userParts, "Reason: "+report.Reason)
	if report.Description != nil && *report.Description != "" {
		userParts = append(userParts, "Description: "+*report.Description)
	}
	if contextRow != nil {
		if msgs, ok := contextRow["messages"].([]any); ok && len(msgs) > 0 {
			userParts = append(userParts, "Recent messages: <attached>")
		}
		if calls, ok := contextRow["call_history"].([]any); ok && len(calls) > 0 {
			userParts = append(userParts, "Recent call history: <attached>")
		}
	}
	userMsg := strings.Join(userParts, "\n")

	summary, err := openaix.ChatCompletion(ctx, openaix.ChatUseCaseReportSummary, []openaix.ChatMessage{
		{Role: "system", Content: system},
		{Role: "user", Content: userMsg},
	})
	if err != nil {
		log.Error().Err(err).Str("reportId", reportID).Msg("OpenAI chat completion failed")
		return err
	}
	modelName := openaix.ReportSummaryModel()
	if err := supax.UpsertReportAISummary(ctx, reportID, summary, modelName); err != nil {
		log.Error().Err(err).Str("reportId", reportID).Msg("Failed to persist report AI summary")
		return err
	}
	log.Info().Str("reportId", reportID).Msg("report_ai_summary done")
	return nil
}

func ExecuteApplyCallExp(ctx context.Context, p ApplyCallExpPayload) error {
	log.Info().Str("userId", p.UserID).Int("durationSeconds", p.DurationSeconds).Msg("apply_call_exp start")
	res, err := userservice.AddCallExp(ctx, p.UserID, p.DurationSeconds, p.ExpSecondsToAdd)
	if err != nil {
		return err
	}
	log.Info().Str("userId", p.UserID).Bool("didLevelUp", res.DidLevelUp).Int("previousLevel", res.PreviousLevel).Int("newLevel", res.NewLevel).Msg("apply_call_exp done")
	return nil
}
