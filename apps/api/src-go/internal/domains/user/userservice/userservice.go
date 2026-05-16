package userservice

import (
	"context"
	"errors"
	"time"

	"linky-api/src-go/internal/domains/user/leveling"
	"linky-api/src-go/internal/infra/supax"
)

type UserLevelData struct {
	UserID         string `json:"userId"`
	TotalExpSeconds int    `json:"totalExpSeconds"`
	Level          int    `json:"level"`
	ExpToNextLevel int    `json:"expToNextLevel"`
	CreatedAt      string `json:"createdAt"`
	UpdatedAt      string `json:"updatedAt"`
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
		UserID:         row.UserID,
		TotalExpSeconds: row.TotalExpSeconds,
		Level:          r.Level,
		ExpToNextLevel: r.ExpToNextLevel,
		CreatedAt:      row.CreatedAt,
		UpdatedAt:      row.UpdatedAt,
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

func AddCallExp(ctx context.Context, userID string, durationSeconds int, expSecondsToAdd *int) (*AddCallExpResult, error) {
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

	expToAdd := durationSeconds
	if expSecondsToAdd != nil {
		if *expSecondsToAdd < 0 {
			expToAdd = 0
		} else {
			expToAdd = *expSecondsToAdd
		}
	}

	if err := supax.IncrementUserExp(ctx, userID, expToAdd); err != nil {
		return nil, err
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

	return &AddCallExpResult{
		DidLevelUp:    afterLevel > beforeLevel,
		PreviousLevel: beforeLevel,
		NewLevel:      afterLevel,
	}, nil
}
