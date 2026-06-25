package callended

import (
	"context"
	"strings"
	"time"

	"linky-api/src/internal/infra/supax"
	"linky-api/src/internal/jobs"
)

type EndCallParticipant struct {
	UserID string
}

type EndCallInput struct {
	RoomID               string
	Participants         [2]EndCallParticipant
	StartedAt            time.Time
	TimezoneByUserID     map[string]string
	FavoriteRelation     string
	DurationSecs         int
	CallHistoryPersisted bool
}

type EndCallOutput struct {
	Result      *Result
	ApplyFailed bool
	CallerID    string
	CalleeID    string
	CallerTZ    string
	CalleeTZ    string
	ProgressOK  map[string]bool
}

func EndCall(ctx context.Context, in EndCallInput) EndCallOutput {
	out := EndCallOutput{
		ProgressOK: make(map[string]bool),
	}
	if in.DurationSecs <= 0 {
		return out
	}
	a := in.Participants[0]
	b := in.Participants[1]
	if a.UserID == "" || b.UserID == "" {
		return out
	}
	out.CallerID = a.UserID
	out.CalleeID = b.UserID

	now := time.Now()
	dur := in.DurationSecs
	cca, _ := supax.GetUserCountry(ctx, a.UserID)
	ccb, _ := supax.GetUserCountry(ctx, b.UserID)
	if !in.CallHistoryPersisted {
		_, err := supax.CreateCallHistory(ctx, supax.CreateCallHistoryParams{
			CallerID:        a.UserID,
			CalleeID:        b.UserID,
			CallerCountry:   cca,
			CalleeCountry:   ccb,
			StartedAt:       in.StartedAt,
			EndedAt:         &now,
			DurationSeconds: &dur,
		})
		if err != nil && !isUniqueViolation(err) {
			log.Warn().Err(err).Str("roomId", in.RoomID).Msg("CreateCallHistory failed")
		}
	}

	tzA := in.TimezoneByUserID[a.UserID]
	tzB := in.TimezoneByUserID[b.UserID]
	if tzA == "" {
		tzA, _ = supax.GetUserTimezone(ctx, a.UserID)
	}
	if tzB == "" {
		tzB, _ = supax.GetUserTimezone(ctx, b.UserID)
	}
	out.CallerTZ = tzA
	out.CalleeTZ = tzB

	res, err := Apply(ctx, ApplyParams{
		CallerID:         a.UserID,
		CalleeID:         b.UserID,
		CallerTimezone:   tzA,
		CalleeTimezone:   tzB,
		EndedAt:          now,
		DurationSecs:     in.DurationSecs,
		FavoriteRelation: in.FavoriteRelation,
	})
	if err != nil || res == nil {
		out.ApplyFailed = true
		dateA := LocalDateString(now, tzA)
		dateB := LocalDateString(now, tzB)
		_ = jobs.EnqueueApplyCallExp(ctx, a.UserID, in.DurationSecs, b.UserID, tzA, dateA)
		_ = jobs.EnqueueApplyCallExp(ctx, b.UserID, in.DurationSecs, a.UserID, tzB, dateB)
		out.ProgressOK[a.UserID] = false
		out.ProgressOK[b.UserID] = false
		return out
	}
	out.Result = res
	out.ProgressOK[a.UserID] = res.ExpSettled(a.UserID)
	out.ProgressOK[b.UserID] = res.ExpSettled(b.UserID)
	return out
}

func isUniqueViolation(err error) bool {
	if err == nil {
		return false
	}
	msg := err.Error()
	return strings.Contains(msg, "23505") || strings.Contains(msg, "duplicate key")
}
