package worker

import (
	"context"

	"linky-api/src/internal/app/embeddings"
	"linky-api/src/internal/app/report"
	"linky-api/src/internal/app/user"
	"linky-api/src/internal/config"
	"linky-api/src/internal/logger"
)

var (
	log = logger.New("worker:exec")
	cfg *config.Config
)

func Init(c *config.Config) {
	cfg = c
	embeddings.Init(c)
}

type ApplyCallExpPayload struct {
	UserID            string `json:"userId"`
	DurationSeconds   int    `json:"durationSeconds"`
	ExpSecondsToAdd   *int   `json:"expSecondsToAdd,omitempty"`
	Timezone          string `json:"timezone,omitempty"`
	CounterpartUserID string `json:"counterpartUserId,omitempty"`
	DateForExpToday   string `json:"dateForExpToday,omitempty"`
}

func ExecuteReportAISummary(ctx context.Context, reportID string, force bool) error {
	return report.GenerateAISummary(ctx, reportID, force)
}

func ExecuteApplyCallExp(ctx context.Context, p ApplyCallExpPayload) error {
	log.Info().Str("userId", p.UserID).Int("durationSeconds", p.DurationSeconds).Str("date", p.DateForExpToday).
		Msg("apply_call_exp job start")
	_, err := user.AddCallExp(ctx, p.UserID, p.DurationSeconds, p.ExpSecondsToAdd, p.DateForExpToday, p.CounterpartUserID)
	return err
}
