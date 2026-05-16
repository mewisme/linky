package job

import "encoding/json"

const QueueKey = "linky:queue:jobs:v2"

type Envelope struct {
	V       int             `json:"v"`
	Type    string          `json:"type"`
	Payload json.RawMessage `json:"payload"`
}

type ReportAISummaryPayload struct {
	ReportID string `json:"reportId"`
	Force    bool   `json:"force,omitempty"`
}

type UserEmbeddingRegeneratePayload struct {
	UserID string `json:"userId"`
}

type ApplyCallExpPayload struct {
	UserID            string  `json:"userId"`
	DurationSeconds   int     `json:"durationSeconds"`
	ExpSecondsToAdd   *int    `json:"expSecondsToAdd,omitempty"`
	Timezone          *string `json:"timezone,omitempty"`
	CounterpartUserID *string `json:"counterpartUserId,omitempty"`
	DateForExpToday   *string `json:"dateForExpToday,omitempty"`
}
