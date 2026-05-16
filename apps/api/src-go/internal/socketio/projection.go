package socketio

import (
	"context"

	"linky-api/src-go/internal/domains/user/leveling"
	"linky-api/src-go/internal/infra/supax"
)

func userserviceProjection(ctx context.Context, userID string, durationSeconds int) (map[string]any, error) {
	row, err := supax.GetUserLevel(ctx, userID)
	currentExp := 0
	if err == nil && row != nil {
		currentExp = row.TotalExpSeconds
	}
	streak, _ := supax.GetUserStreak(ctx, userID)

	projectedExp := currentExp + durationSeconds
	curRes := leveling.CalculateLevelFromExp(currentExp, leveling.Default)
	newRes := leveling.CalculateLevelFromExp(projectedExp, leveling.Default)

	out := map[string]any{
		"userId":          userID,
		"currentExp":      currentExp,
		"projectedExp":    projectedExp,
		"currentLevel":    curRes.Level,
		"projectedLevel":  newRes.Level,
		"expToNextLevel":  newRes.ExpToNextLevel,
		"durationSeconds": durationSeconds,
	}
	if streak != nil {
		out["currentStreak"] = streak.CurrentStreak
		out["longestStreak"] = streak.LongestStreak
	}
	if newRes.Level > curRes.Level {
		out["didLevelUp"] = true
	}
	return out, nil
}
