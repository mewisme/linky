package progress

import (
	"linky-api/src/internal/domains/user/leveling"
	"linky-api/src/internal/infra/expbonus"
)

func ApplyRealtimeCallProjection(progress *Insights, unpersistedElapsedSeconds, projectedExpGain int) *Insights {
	if progress == nil {
		return nil
	}

	streakForBonus := streakCountForExpBonus(progress, unpersistedElapsedSeconds)
	projectedExpGain = expbonus.EffectiveSeconds(projectedExpGain, streakForBonus, progress.CurrentLevel)

	baselineTotal := progress.ExpProgress.TotalExpSeconds
	projectedTotal := baselineTotal + projectedExpGain
	if projectedTotal < baselineTotal {
		projectedTotal = baselineTotal
	}

	calc := leveling.CalculateLevelFromExp(projectedTotal, leveling.Default)
	denominator := projectedTotal + calc.ExpToNextLevel
	progressPct := 100.0
	if denominator > 0 {
		p := (float64(projectedTotal) / float64(denominator)) * 100.0
		if p < 0 {
			p = 0
		} else if p > 100 {
			p = 100
		}
		progressPct = p
	}

	projectedTodaySeconds := progress.TodayCallDurationSeconds + unpersistedElapsedSeconds
	projectedIsTodayComplete := projectedTodaySeconds >= progress.StreakRequiredSeconds

	streakStatus := progress.StreakStatus
	if projectedIsTodayComplete {
		streakStatus = StreakActive
	}

	projectedCurrentStreak := progress.Streak.CurrentStreak
	if projectedIsTodayComplete {
		if progress.IsTodayStreakComplete {
			projectedCurrentStreak = progress.Streak.CurrentStreak
		} else {
			projectedCurrentStreak = progress.StreakIfTodayCompleted
		}
	}

	projectedLongest := progress.Streak.LongestStreak
	if projectedCurrentStreak > projectedLongest {
		projectedLongest = projectedCurrentStreak
	}

	recent := make([]RecentStreakDay, len(progress.RecentStreakDays))
	for i, entry := range progress.RecentStreakDays {
		recent[i] = RecentStreakDay{
			Date:    entry.Date,
			IsValid: projectedCurrentStreak > 0 && i < projectedCurrentStreak,
		}
	}

	streakRemaining := progress.StreakRequiredSeconds - projectedTodaySeconds
	if streakRemaining < 0 {
		streakRemaining = 0
	}

	out := *progress
	out.StreakStatus = streakStatus
	out.RecentStreakDays = recent
	out.CurrentLevel = calc.Level
	out.ExpProgress = ExpProgress{
		TotalExpSeconds:    projectedTotal,
		ExpToNextLevel:     calc.ExpToNextLevel,
		ProgressPercentage: progressPct,
	}
	out.ExpEarnedToday = progress.ExpEarnedToday + projectedExpGain
	out.RemainingSecondsToNextLevel = calc.ExpToNextLevel
	out.TodayCallDurationSeconds = projectedTodaySeconds
	out.TodayCallDuration = TodayCallDuration{
		TotalSeconds: projectedTodaySeconds,
		IsValid:      projectedIsTodayComplete,
	}
	out.StreakRemainingSeconds = streakRemaining
	out.IsTodayStreakComplete = projectedIsTodayComplete
	out.Streak = StreakSummary{
		CurrentStreak:                projectedCurrentStreak,
		LongestStreak:                projectedLongest,
		RemainingSecondsToKeepStreak: streakRemaining,
		LastValidDate:                progress.Streak.LastValidDate,
	}
	return &out
}

func streakCountForExpBonus(progress *Insights, unpersistedElapsedSeconds int) int {
	if progress == nil {
		return 0
	}
	if progress.IsTodayStreakComplete {
		return progress.Streak.CurrentStreak
	}
	projectedToday := progress.TodayCallDurationSeconds + unpersistedElapsedSeconds
	if projectedToday >= progress.StreakRequiredSeconds {
		return progress.StreakIfTodayCompleted
	}
	return progress.Streak.CurrentStreak
}
