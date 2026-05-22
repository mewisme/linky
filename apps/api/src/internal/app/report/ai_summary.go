package report

import (
	"context"
	"strings"

	"linky-api/src/internal/infra/openaix"
	"linky-api/src/internal/infra/supax"
)

func GenerateAISummary(ctx context.Context, reportID string, force bool) error {
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
