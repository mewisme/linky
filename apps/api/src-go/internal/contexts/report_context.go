package contexts

import (
	"context"

	"linky-api/src-go/internal/jobs"
	"linky-api/src-go/internal/logger"
)

var reportLog = logger.New("context:report")

func OnReportCreated(ctx context.Context, reportID string) {
	if reportID == "" {
		return
	}
	if err := jobs.EnqueueReportAISummary(ctx, reportID, false); err != nil {
		reportLog.Error().Err(err).Str("reportId", reportID).Msg("Failed to enqueue report_ai_summary")
		return
	}
	reportLog.Info().Str("reportId", reportID).Msg("Enqueued report_ai_summary job")
}
