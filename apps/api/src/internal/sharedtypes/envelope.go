package sharedtypes

const (
	JobQueueKey               = "linky:queue:jobs:v2"
	JobDLQKey                 = "linky:queue:jobs:dlq:v1"
	JobProcessingListPrefix   = "linky:queue:jobs:processing:"
	WorkerHeartbeatPrefix     = "linky:worker:heartbeat:"
	WorkerHeartbeatTTLSeconds = 30
)

type JobEnvelope struct {
	V       int                `json:"v"`
	Type    string             `json:"type"`
	Payload JobEnvelopePayload `json:"payload"`
}

type JobEnvelopePayload struct {
	ReportID          string `json:"reportId,omitempty"`
	Force             *bool  `json:"force,omitempty"`
	UserID            string `json:"userId,omitempty"`
	DurationSeconds   int    `json:"durationSeconds,omitempty"`
	ExpSecondsToAdd   *int   `json:"expSecondsToAdd,omitempty"`
	Timezone          string `json:"timezone,omitempty"`
	CounterpartUserID string `json:"counterpartUserId,omitempty"`
	DateForExpToday   string `json:"dateForExpToday,omitempty"`
}

const (
	JobTypeReportAISummary         = "report_ai_summary"
	JobTypeUserEmbeddingRegenerate = "user_embedding_regenerate"
	JobTypeApplyCallExp            = "apply_call_exp"
)

type JobDlqEntry struct {
	V        int    `json:"v"`
	Reason   string `json:"reason"`
	Type     string `json:"type"`
	Envelope []byte `json:"envelope"`
	Error    string `json:"error,omitempty"`
	WorkerID string `json:"workerId,omitempty"`
	At       int64  `json:"atMs"`
}
