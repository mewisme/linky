package job

import (
	"encoding/json"
	"time"
)

const (
	QueueKey                = "linky:queue:jobs:v2"
	DLQKey                  = "linky:queue:jobs:dlq:v1"
	ProcessingListPrefix    = "linky:queue:jobs:processing:"
	WorkerHeartbeatPrefix   = "linky:worker:heartbeat:"
	WorkerHeartbeatTTL      = 30 * time.Second
	WorkerHeartbeatRefresh  = 10 * time.Second
	JobReaperInterval       = 30 * time.Second
)

func ProcessingListKey(workerID string) string {
	return ProcessingListPrefix + workerID
}

func WorkerHeartbeatKey(workerID string) string {
	return WorkerHeartbeatPrefix + workerID
}

func ProcessingListWorkerID(key string) (string, bool) {
	if len(key) <= len(ProcessingListPrefix) {
		return "", false
	}
	if key[:len(ProcessingListPrefix)] != ProcessingListPrefix {
		return "", false
	}
	return key[len(ProcessingListPrefix):], true
}

type DLQReason string

const (
	DLQReasonDropped           DLQReason = "dropped"
	DLQReasonRetriesExhausted  DLQReason = "retries_exhausted"
	DLQReasonPanic             DLQReason = "panic"
	DLQReasonStranded          DLQReason = "stranded"
)

type DLQEntry struct {
	Raw          string    `json:"raw"`
	Label        string    `json:"label"`
	Reason       DLQReason `json:"reason"`
	LastStatus   *int      `json:"lastStatus,omitempty"`
	ErrorMessage string    `json:"errorMessage,omitempty"`
	Attempts     int       `json:"attempts"`
	FailedAt     string    `json:"failedAt"`
	WorkerID     string    `json:"workerId"`
}

func (e DLQEntry) MarshalString() (string, error) {
	b, err := json.Marshal(e)
	if err != nil {
		return "", err
	}
	return string(b), nil
}

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
