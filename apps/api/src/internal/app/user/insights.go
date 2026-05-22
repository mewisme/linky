package user

import (
	"context"
	"sort"
	"time"

	"linky-api/src/internal/domain/user/exp"
	"linky-api/src/internal/domain/user/leveling"
	"linky-api/src/internal/domain/user/progress"
	"linky-api/src/internal/infra/expbonus"
	"linky-api/src/internal/infra/supax"
)

const (
	progressStreakRequiredSeconds = 300
	progressRecentStreakDays      = 7
	progressMaxStreakDaysToFetch  = 400
)

func ResolveTimezone(ctx context.Context, userID string, timezoneByUserID map[string]string) string {
	if userID == "" {
		return "UTC"
	}
	if timezoneByUserID != nil {
		if tz := timezoneByUserID[userID]; tz != "" {
			return tz
		}
	}
	if tz, err := supax.GetUserTimezone(ctx, userID); err == nil && tz != "" {
		return tz
	}
	return "UTC"
}

func GetProgressInsights(ctx context.Context, userID, timezone string) (*progress.Insights, error) {
	if userID == "" {
		return nil, nil
	}

	tz := timezone
	if tz == "" {
		tz = "UTC"
	}
	loc, err := time.LoadLocation(tz)
	if err != nil {
		loc = time.UTC
	}

	levelRow, err := supax.GetUserLevel(ctx, userID)
	if err != nil {
		return nil, err
	}
	levelTotalExp := 0
	if levelRow != nil {
		levelTotalExp = levelRow.TotalExpSeconds
	}
	calc := leveling.CalculateLevelFromExp(levelTotalExp, leveling.Default)

	streakRow, err := supax.GetUserStreak(ctx, userID)
	if err != nil {
		return nil, err
	}

	historyRows, _, err := supax.GetUserStreakDays(ctx, userID, progressMaxStreakDaysToFetch, 0)
	if err != nil {
		return nil, err
	}

	now := time.Now()
	todayStr := progressToLocalDate(now, loc)

	historyByDate := make(map[string]bool, len(historyRows))
	validDates := make([]string, 0, len(historyRows))
	for _, r := range historyRows {
		historyByDate[r.Date] = r.IsValid
		if r.IsValid {
			validDates = append(validDates, r.Date)
		}
	}

	todayCallSeconds := 0
	todayIsValid := false
	for _, r := range historyRows {
		if r.Date == todayStr {
			todayCallSeconds = r.TotalCallSeconds
			todayIsValid = r.IsValid
			break
		}
	}

	streakRemainingSeconds := progressStreakRequiredSeconds - todayCallSeconds
	if streakRemainingSeconds < 0 {
		streakRemainingSeconds = 0
	}
	isTodayStreakComplete := todayCallSeconds >= progressStreakRequiredSeconds

	currentStreak := 0
	if todayIsValid {
		yesterday := progressToLocalDate(now.AddDate(0, 0, -1), loc)
		if v, ok := historyByDate[yesterday]; !ok || !v {
			currentStreak = 1
		} else {
			count := 2
			for i := 2; i < progressMaxStreakDaysToFetch; i++ {
				prev := progressToLocalDate(now.AddDate(0, 0, -i), loc)
				if v, ok := historyByDate[prev]; !ok || !v {
					break
				}
				count++
			}
			currentStreak = count
		}
	}

	streakIfTodayCompleted := currentStreak
	if !todayIsValid {
		yesterday := progressToLocalDate(now.AddDate(0, 0, -1), loc)
		if v, ok := historyByDate[yesterday]; !ok || !v {
			streakIfTodayCompleted = 1
		} else {
			count := 2
			for i := 2; i < progressMaxStreakDaysToFetch; i++ {
				prev := progressToLocalDate(now.AddDate(0, 0, -i), loc)
				if v, ok := historyByDate[prev]; !ok || !v {
					break
				}
				count++
			}
			streakIfTodayCompleted = count
		}
	}

	recent := make([]progress.RecentStreakDay, 0, progressRecentStreakDays)
	for i := 0; i < progressRecentStreakDays; i++ {
		d := progressToLocalDate(now.AddDate(0, 0, -i), loc)
		recent = append(recent, progress.RecentStreakDay{
			Date:    d,
			IsValid: currentStreak > 0 && i < currentStreak,
		})
	}

	longestFromHistory := progressLongestConsecutiveValidDays(validDates)
	longestFromRow := 0
	if streakRow != nil {
		longestFromRow = streakRow.LongestStreak
	}
	longestStreak := longestFromHistory
	if longestFromRow > longestStreak {
		longestStreak = longestFromRow
	}
	if currentStreak > longestStreak {
		longestStreak = currentStreak
	}

	expInCurrent := levelTotalExp
	expNeededForNext := calc.ExpToNextLevel
	totalForLevel := expInCurrent + expNeededForNext
	progressPct := 100.0
	if totalForLevel > 0 {
		p := (float64(expInCurrent) / float64(totalForLevel)) * 100.0
		if p < 0 {
			p = 0
		} else if p > 100 {
			p = 100
		}
		progressPct = p
	}

	expEarnedToday, _ := supax.GetUserExpDaily(ctx, userID, todayStr)
	if expEarnedToday <= 0 {
		expEarnedToday, _ = supax.GetCallDurationsForUserOnLocalDate(ctx, userID, todayStr, tz)
	}
	if expEarnedToday < todayCallSeconds {
		expEarnedToday = todayCallSeconds
	}

	streakStatus := progress.StreakIncomplete
	usedFreeze := false
	if streakRow != nil && streakRow.LastContinuationUsedFreeze != nil && *streakRow.LastContinuationUsedFreeze {
		usedFreeze = true
	}
	if currentStreak > 0 && isTodayStreakComplete {
		streakStatus = progress.StreakActive
	} else if currentStreak > 0 && usedFreeze {
		streakStatus = progress.StreakFrozen
	}

	var lastValidDate *string
	if streakRow != nil && streakRow.LastValidDate != nil {
		lastValidDate = streakRow.LastValidDate
	}

	cfg := expbonus.Config()
	out := &progress.Insights{
		CurrentLevel: calc.Level,
		ExpProgress: progress.ExpProgress{
			TotalExpSeconds:    levelTotalExp,
			ExpToNextLevel:     calc.ExpToNextLevel,
			ProgressPercentage: progressPct,
		},
		ExpEarnedToday:              expEarnedToday,
		RemainingSecondsToNextLevel: calc.ExpToNextLevel,
		StreakStatus:                streakStatus,
		TodayCallDuration: progress.TodayCallDuration{
			TotalSeconds: todayCallSeconds,
			IsValid:      todayIsValid,
		},
		TodayCallDurationSeconds: todayCallSeconds,
		StreakRequiredSeconds:    progressStreakRequiredSeconds,
		StreakRemainingSeconds:   streakRemainingSeconds,
		IsTodayStreakComplete:    isTodayStreakComplete,
		StreakIfTodayCompleted:   streakIfTodayCompleted,
		Streak: progress.StreakSummary{
			CurrentStreak:                currentStreak,
			LongestStreak:                longestStreak,
			RemainingSecondsToKeepStreak: streakRemainingSeconds,
			LastValidDate:                lastValidDate,
		},
		TodayDate:        todayStr,
		RecentStreakDays: recent,
	}
	out.ExpBonuses = exp.ActiveBonuses(progressStreakCountForExpBonus(out, 0), calc.Level, "", cfg)
	return out, nil
}

func ProjectedCallInsights(ctx context.Context, userID string, timezoneByUserID map[string]string, favoriteRelation string, durationSeconds int) (baseline, projected *progress.Insights) {
	if userID == "" || durationSeconds <= 0 {
		return nil, nil
	}
	tz := ResolveTimezone(ctx, userID, timezoneByUserID)
	cfg := expbonus.Config()
	insights, err := GetProgressInsights(ctx, userID, tz)
	if err != nil || insights == nil {
		return nil, nil
	}
	return insights, progress.ApplyRealtimeCallProjection(insights, durationSeconds, durationSeconds, favoriteRelation, cfg)
}

func progressToLocalDate(t time.Time, loc *time.Location) string {
	return t.In(loc).Format("2006-01-02")
}

func progressLongestConsecutiveValidDays(dates []string) int {
	if len(dates) == 0 {
		return 0
	}
	uniq := make(map[string]struct{}, len(dates))
	out := make([]string, 0, len(dates))
	for _, d := range dates {
		if _, ok := uniq[d]; ok {
			continue
		}
		uniq[d] = struct{}{}
		out = append(out, d)
	}
	sort.Strings(out)
	maxRun := 1
	run := 1
	for i := 1; i < len(out); i++ {
		prev, _ := time.Parse("2006-01-02", out[i-1])
		next := prev.AddDate(0, 0, 1).Format("2006-01-02")
		if out[i] == next {
			run++
			if run > maxRun {
				maxRun = run
			}
		} else {
			run = 1
		}
	}
	return maxRun
}

func progressStreakCountForExpBonus(ins *progress.Insights, unpersistedElapsedSeconds int) int {
	if ins == nil {
		return 0
	}
	if ins.IsTodayStreakComplete {
		return ins.StreakIfTodayCompleted
	}
	if unpersistedElapsedSeconds >= progressStreakRequiredSeconds {
		return ins.StreakIfTodayCompleted
	}
	return ins.Streak.CurrentStreak
}
