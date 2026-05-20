package userservice

import (
	"context"
	"errors"
	"time"

	"linky-api/src/internal/domains/user/leveling"
	"linky-api/src/internal/infra/expbonus"
	"linky-api/src/internal/lib/callfavorite"
	"linky-api/src/internal/infra/supax"
	"linky-api/src/internal/logger"
)

var log = logger.New("userservice")

type UserLevelData struct {
	UserID          string `json:"userId"`
	TotalExpSeconds int    `json:"totalExpSeconds"`
	Level           int    `json:"level"`
	ExpToNextLevel  int    `json:"expToNextLevel"`
	CreatedAt       string `json:"createdAt"`
	UpdatedAt       string `json:"updatedAt"`
}

func GetUserLevelData(ctx context.Context, userID string) (*UserLevelData, error) {
	if userID == "" {
		return nil, errors.New("user id required")
	}
	row, err := supax.GetUserLevel(ctx, userID)
	if err != nil {
		return nil, err
	}
	now := time.Now().UTC().Format(time.RFC3339Nano)
	if row == nil {
		r := leveling.CalculateLevelFromExp(0, leveling.Default)
		return &UserLevelData{UserID: userID, TotalExpSeconds: 0, Level: r.Level, ExpToNextLevel: r.ExpToNextLevel, CreatedAt: now, UpdatedAt: now}, nil
	}
	r := leveling.CalculateLevelFromExp(row.TotalExpSeconds, leveling.Default)
	return &UserLevelData{
		UserID:          row.UserID,
		TotalExpSeconds: row.TotalExpSeconds,
		Level:           r.Level,
		ExpToNextLevel:  r.ExpToNextLevel,
		CreatedAt:       row.CreatedAt,
		UpdatedAt:       row.UpdatedAt,
	}, nil
}

type UserStreakData struct {
	UserID                     string  `json:"userId"`
	CurrentStreak              int     `json:"currentStreak"`
	LongestStreak              int     `json:"longestStreak"`
	LastValidDate              *string `json:"lastValidDate"`
	LastContinuationUsedFreeze bool    `json:"lastContinuationUsedFreeze"`
	UpdatedAt                  string  `json:"updatedAt"`
}

func GetUserStreakData(ctx context.Context, userID string) (*UserStreakData, error) {
	row, err := supax.GetUserStreak(ctx, userID)
	if err != nil || row == nil {
		return nil, err
	}
	used := false
	if row.LastContinuationUsedFreeze != nil {
		used = *row.LastContinuationUsedFreeze
	}
	return &UserStreakData{
		UserID:                     row.UserID,
		CurrentStreak:              row.CurrentStreak,
		LongestStreak:              row.LongestStreak,
		LastValidDate:              row.LastValidDate,
		LastContinuationUsedFreeze: used,
		UpdatedAt:                  row.UpdatedAt,
	}, nil
}

func GetUserInternalIDByClerk(ctx context.Context, clerkUserID string) (string, error) {
	return supax.GetUserInternalID(ctx, clerkUserID)
}

type AddCallExpResult struct {
	DidLevelUp    bool
	PreviousLevel int
	NewLevel      int
}

func AddCallExp(ctx context.Context, userID string, durationSeconds int, expSecondsToAdd *int, localDate, counterpartUserID string) (*AddCallExpResult, error) {
	if durationSeconds <= 0 || userID == "" {
		return &AddCallExpResult{}, nil
	}
	before, err := supax.GetUserLevel(ctx, userID)
	if err != nil {
		return nil, err
	}
	beforeTotal := 0
	if before != nil {
		beforeTotal = before.TotalExpSeconds
	}
	beforeLevel := leveling.CalculateLevelFromExp(beforeTotal, leveling.Default).Level

	expToAdd := resolveCallExpSeconds(ctx, userID, durationSeconds, expSecondsToAdd, beforeTotal, counterpartUserID)

	if err := supax.IncrementUserExp(ctx, userID, expToAdd); err != nil {
		log.Error().Err(err).Str("userId", userID).Int("expToAdd", expToAdd).Msg("increment_user_exp failed")
		return nil, err
	}
	if localDate != "" {
		if err := supax.IncrementUserExpDaily(ctx, userID, localDate, expToAdd); err != nil {
			log.Warn().Err(err).Str("userId", userID).Str("date", localDate).Int("expToAdd", expToAdd).
				Msg("increment_user_exp_daily failed after total exp was granted")
		}
	}

	after, err := supax.GetUserLevel(ctx, userID)
	if err != nil {
		return nil, err
	}
	afterTotal := beforeTotal + expToAdd
	if after != nil {
		afterTotal = after.TotalExpSeconds
	}
	afterLevel := leveling.CalculateLevelFromExp(afterTotal, leveling.Default).Level

	log.Info().Str("userId", userID).Int("expAdded", expToAdd).Str("localDate", localDate).
		Int("totalExp", afterTotal).Int("level", afterLevel).Bool("didLevelUp", afterLevel > beforeLevel).
		Msg("AddCallExp completed")

	return &AddCallExpResult{
		DidLevelUp:    afterLevel > beforeLevel,
		PreviousLevel: beforeLevel,
		NewLevel:      afterLevel,
	}, nil
}

func resolveCallExpSeconds(ctx context.Context, userID string, durationSeconds int, expSecondsToAdd *int, totalExpBefore int, counterpartUserID string) int {
	if expSecondsToAdd != nil {
		if *expSecondsToAdd < 0 {
			return 0
		}
		return *expSecondsToAdd
	}
	if durationSeconds <= 0 {
		return 0
	}
	streakCount := 0
	if row, err := supax.GetUserStreak(ctx, userID); err == nil && row != nil {
		streakCount = row.CurrentStreak
	}
	userLevel := leveling.CalculateLevelFromExp(totalExpBefore, leveling.Default).Level
	favoriteRelation := ""
	if counterpartUserID != "" {
		if rel, err := callfavorite.Relation(ctx, userID, counterpartUserID); err == nil {
			favoriteRelation = rel
		}
	}
	return expbonus.EffectiveSeconds(durationSeconds, streakCount, userLevel, favoriteRelation)
}
