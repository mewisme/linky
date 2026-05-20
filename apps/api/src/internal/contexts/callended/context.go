package callended

import (
	"context"
	"errors"
	"time"

	"linky-api/src/internal/domains/user/userservice"
	"linky-api/src/internal/infra/supax"
	"linky-api/src/internal/jobs"
	"linky-api/src/internal/logger"
)

var log = logger.New("context:call-ended")

type StreakOutcome struct {
	UserID         string
	FirstTimeValid bool
	StreakCount    int
	Date           string
}

type LevelOutcome struct {
	UserID        string
	DidLevelUp    bool
	PreviousLevel int
	NewLevel      int
}

type Result struct {
	StreakOutcomes []StreakOutcome
	LevelOutcomes  []LevelOutcome
}

type ApplyParams struct {
	CallerID       string
	CalleeID       string
	CallerTimezone string
	CalleeTimezone string
	EndedAt        time.Time
	DurationSecs   int
}

func Apply(ctx context.Context, p ApplyParams) (*Result, error) {
	if p.DurationSecs <= 0 {
		log.Info().Str("caller", p.CallerID).Str("callee", p.CalleeID).Msg("Apply skipped: duration <= 0")
		return &Result{}, nil
	}
	if p.CallerID == "" || p.CalleeID == "" {
		return nil, errors.New("call-ended: caller and callee required")
	}
	if p.CallerTimezone == "" {
		p.CallerTimezone = "UTC"
	}
	if p.CalleeTimezone == "" {
		p.CalleeTimezone = "UTC"
	}

	res := &Result{}

	for _, side := range []struct {
		userID        string
		counterpartID string
		timezone      string
	}{
		{p.CallerID, p.CalleeID, p.CallerTimezone},
		{p.CalleeID, p.CallerID, p.CalleeTimezone},
	} {
		dateStr := localDateString(p.EndedAt, side.timezone)

		streakRes, err := supax.UpsertUserStreakDay(ctx, side.userID, dateStr, p.DurationSecs)
		if err != nil {
			log.Warn().Err(err).Str("userId", side.userID).Msg("upsert_user_streak_day failed")
		} else if streakRes != nil {
			res.StreakOutcomes = append(res.StreakOutcomes, StreakOutcome{
				UserID:         side.userID,
				FirstTimeValid: streakRes.FirstTimeValid,
				StreakCount:    streakRes.CurrentStreak,
				Date:           dateStr,
			})
		}

		expSeconds := computeExpSecondsForCallDuration(p.DurationSecs)
		expSecondsPtr := &expSeconds
		level, err := userservice.AddCallExp(ctx, side.userID, p.DurationSecs, expSecondsPtr)
		if err != nil {
			log.Warn().Err(err).Str("userId", side.userID).Msg("AddCallExp failed; enqueueing job")
			if jerr := jobs.EnqueueApplyCallExpFull(ctx, side.userID, p.DurationSecs, expSecondsPtr, side.counterpartID, side.timezone, dateStr); jerr != nil {
				log.Error().Err(jerr).Str("userId", side.userID).Msg("Failed to enqueue apply_call_exp recovery job")
			}
			continue
		}
		if level != nil {
			res.LevelOutcomes = append(res.LevelOutcomes, LevelOutcome{
				UserID:        side.userID,
				DidLevelUp:    level.DidLevelUp,
				PreviousLevel: level.PreviousLevel,
				NewLevel:      level.NewLevel,
			})
		}
	}

	return res, nil
}

func computeExpSecondsForCallDuration(durationSeconds int) int {
	if durationSeconds <= 0 {
		return 0
	}
	return durationSeconds
}

func localDateString(t time.Time, timezone string) string {
	loc, err := time.LoadLocation(timezone)
	if err != nil {
		loc = time.UTC
	}
	return t.In(loc).Format("2006-01-02")
}
