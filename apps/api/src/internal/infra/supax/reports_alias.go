package supax

import rep "linky-api/src/internal/infra/supax/reports"

type ReportAISummaryRow = rep.AISummaryRow

var (
	GetReportContext            = rep.GetContext
	UpsertReportAISummary       = rep.UpsertAISummary
	GetExistingReportAISummary  = rep.GetExistingAISummary
)
