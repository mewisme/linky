package report

import (
	"context"

	"linky-api/src/internal/jobs"
	"linky-api/src/internal/logger"
)

var log = logger.New("app:report")

func OnReportCreated(ctx context.Context, reportID string) {
	if reportID == "" {
		return
	}
	if err := jobs.EnqueueReportAISummary(ctx, reportID, false); err != nil {
		log.Error().Err(err).Str("reportId", reportID).Msg("Failed to enqueue report_ai_summary")
		return
	}
	log.Info().Str("reportId", reportID).Msg("Enqueued report_ai_summary job")
}
