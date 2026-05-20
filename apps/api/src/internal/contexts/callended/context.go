package callended

import (
	"context"
	"errors"
	"time"

	"linky-api/src/internal/domains/user/leveling"
	"linky-api/src/internal/domains/user/userservice"
	"linky-api/src/internal/infra/expbonus"
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

type ExpOutcome struct {
	UserID   string
	Applied  bool
	Enqueued bool
}

type Result struct {
	StreakOutcomes []StreakOutcome
	LevelOutcomes  []LevelOutcome
	ExpOutcomes    []ExpOutcome
}

func (r *Result) ExpSettled(userID string) bool {
	if r == nil || userID == "" {
		return false
	}
	for _, o := range r.ExpOutcomes {
		if o.UserID == userID {
			return o.Applied || o.Enqueued
		}
	}
	return false
}

type ApplyParams struct {
	CallerID         string
	CalleeID         string
	CallerTimezone   string
	CalleeTimezone   string
	EndedAt          time.Time
	DurationSecs     int
	FavoriteRelation string
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
		dateStr := LocalDateString(p.EndedAt, side.timezone)

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

		streakCount := 0
		if streakRes != nil {
			streakCount = streakRes.CurrentStreak
		}
		userLevel := 1
		if levelRow, lerr := supax.GetUserLevel(ctx, side.userID); lerr == nil && levelRow != nil {
			userLevel = leveling.CalculateLevelFromExp(levelRow.TotalExpSeconds, leveling.Default).Level
		}
		expSeconds := expbonus.EffectiveSeconds(p.DurationSecs, streakCount, userLevel, p.FavoriteRelation)
		expSecondsPtr := &expSeconds
		expOutcome := ExpOutcome{UserID: side.userID}
		level, err := userservice.AddCallExp(ctx, side.userID, p.DurationSecs, expSecondsPtr, dateStr, side.counterpartID)
		if err != nil {
			log.Warn().Err(err).Str("userId", side.userID).Int("durationSeconds", p.DurationSecs).Str("date", dateStr).
				Msg("AddCallExp failed; enqueueing apply_call_exp recovery job")
			if jerr := jobs.EnqueueApplyCallExpFull(ctx, side.userID, p.DurationSecs, expSecondsPtr, side.counterpartID, side.timezone, dateStr); jerr != nil {
				log.Error().Err(jerr).Str("userId", side.userID).Msg("Failed to enqueue apply_call_exp recovery job")
			} else {
				expOutcome.Enqueued = true
				log.Info().Str("userId", side.userID).Int("durationSeconds", p.DurationSecs).Str("date", dateStr).
					Msg("apply_call_exp recovery job enqueued")
			}
		} else {
			expOutcome.Applied = true
			log.Info().Str("userId", side.userID).Int("durationSeconds", p.DurationSecs).Int("expSeconds", expSeconds).
				Str("date", dateStr).Msg("call exp applied synchronously")
			if level != nil {
				res.LevelOutcomes = append(res.LevelOutcomes, LevelOutcome{
					UserID:        side.userID,
					DidLevelUp:    level.DidLevelUp,
					PreviousLevel: level.PreviousLevel,
					NewLevel:      level.NewLevel,
				})
			}
		}
		res.ExpOutcomes = append(res.ExpOutcomes, expOutcome)
	}

	return res, nil
}

func LocalDateString(t time.Time, timezone string) string {
	loc, err := time.LoadLocation(timezone)
	if err != nil {
		loc = time.UTC
	}
	return t.In(loc).Format("2006-01-02")
}
