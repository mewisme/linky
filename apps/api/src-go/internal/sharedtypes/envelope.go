package sharedtypes

const JobQueueKey = "linky:queue:jobs:v2"

type JobEnvelope struct {
	V       int             `json:"v"`
	Type    string          `json:"type"`
	Payload JobEnvelopePayload `json:"payload"`
}

type JobEnvelopePayload struct {
	ReportID          string  `json:"reportId,omitempty"`
	Force             *bool   `json:"force,omitempty"`
	UserID            string  `json:"userId,omitempty"`
	DurationSeconds   int     `json:"durationSeconds,omitempty"`
	ExpSecondsToAdd   *int    `json:"expSecondsToAdd,omitempty"`
	Timezone          string  `json:"timezone,omitempty"`
	CounterpartUserID string  `json:"counterpartUserId,omitempty"`
	DateForExpToday   string  `json:"dateForExpToday,omitempty"`
}

const (
	JobTypeReportAISummary         = "report_ai_summary"
	JobTypeUserEmbeddingRegenerate = "user_embedding_regenerate"
	JobTypeApplyCallExp            = "apply_call_exp"
)
