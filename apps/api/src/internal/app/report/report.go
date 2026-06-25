package report

import (
	"context"

	"linky-api/src/internal/infra/supax"
	"linky-api/src/internal/jobs"
	"linky-api/src/internal/logger"
)

var log = logger.New("app:report")

type CreateReportInput struct {
	ReporterUserID string
	ReportedUserID string
	Reason         string
	Description    string
	Metadata       map[string]any
}

func ListReports(ctx context.Context, userID string, limit, offset int) ([]supax.ReportRow, int64, error) {
	rows, count, err := supax.ListReports(ctx, userID, limit, offset)
	if err != nil {
		return nil, 0, statusErr(500, "FAILED_FETCH_REPORTS", "failedFetchReports", "Failed to fetch reports")
	}
	if rows == nil {
		rows = []supax.ReportRow{}
	}
	return rows, count, nil
}

func CreateReport(ctx context.Context, in CreateReportInput) (*supax.ReportRow, error) {
	if in.ReportedUserID == "" {
		return nil, statusErr(400, "REPORT_TARGET_REQUIRED", "reportTargetRequired", "reported_user_id is required")
	}
	if in.Reason == "" {
		return nil, statusErr(400, "REPORT_REASON_REQUIRED", "reportReasonRequired", "reason is required")
	}
	if in.ReportedUserID == in.ReporterUserID {
		return nil, detailErr("REPORT_SELF", "Cannot report yourself")
	}
	body := map[string]any{
		"reporter_user_id": in.ReporterUserID,
		"reported_user_id": in.ReportedUserID,
		"reason":           in.Reason,
		"status":           "pending",
	}
	row, err := supax.CreateReport(ctx, body)
	if err != nil {
		return nil, statusErr(500, "FAILED_CREATE_REPORT", "failedCreateReport", "Failed to create report")
	}
	if row != nil && in.Metadata != nil {
		_ = supax.CreateReportContext(ctx, row.ID, in.Metadata)
	}
	return row, nil
}

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
