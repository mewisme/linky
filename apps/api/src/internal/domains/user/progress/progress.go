package progress

import (
	"context"
	"sort"
	"time"

	"linky-api/src/internal/domains/user/leveling"
	"linky-api/src/internal/infra/expbonus"
	"linky-api/src/internal/infra/supax"
)

const (
	streakRequiredSeconds = 300
	recentStreakDays      = 7
	maxStreakDaysToFetch  = 400
)

type StreakStatus string

const (
	StreakActive     StreakStatus = "active"
	StreakIncomplete StreakStatus = "incomplete"
	StreakFrozen     StreakStatus = "frozen"
)

type ExpProgress struct {
	TotalExpSeconds    int     `json:"totalExpSeconds"`
	ExpToNextLevel     int     `json:"expToNextLevel"`
	ProgressPercentage float64 `json:"progressPercentage"`
}

type TodayCallDuration struct {
	TotalSeconds int  `json:"totalSeconds"`
	IsValid      bool `json:"isValid"`
}

type StreakSummary struct {
	CurrentStreak                int     `json:"currentStreak"`
	LongestStreak                int     `json:"longestStreak"`
	RemainingSecondsToKeepStreak int     `json:"remainingSecondsToKeepStreak"`
	LastValidDate                *string `json:"lastValidDate"`
}

type RecentStreakDay struct {
	Date    string `json:"date"`
	IsValid bool   `json:"isValid"`
}

type Insights struct {
	CurrentLevel                int               `json:"currentLevel"`
	ExpBonuses                  []expbonus.ActiveBonus `json:"expBonuses"`
	ExpProgress                 ExpProgress       `json:"expProgress"`
	ExpEarnedToday              int               `json:"expEarnedToday"`
	RemainingSecondsToNextLevel int               `json:"remainingSecondsToNextLevel"`
	StreakStatus                StreakStatus      `json:"streakStatus"`
	TodayCallDuration           TodayCallDuration `json:"todayCallDuration"`
	TodayCallDurationSeconds    int               `json:"todayCallDurationSeconds"`
	StreakRequiredSeconds       int               `json:"streakRequiredSeconds"`
	StreakRemainingSeconds      int               `json:"streakRemainingSeconds"`
	IsTodayStreakComplete       bool              `json:"isTodayStreakComplete"`
	StreakIfTodayCompleted      int               `json:"streakIfTodayCompleted"`
	Streak                      StreakSummary     `json:"streak"`
	TodayDate                   string            `json:"todayDate"`
	RecentStreakDays            []RecentStreakDay `json:"recentStreakDays"`
}

func toLocalDate(t time.Time, loc *time.Location) string {
	return t.In(loc).Format("2006-01-02")
}

func longestConsecutiveValidDays(dates []string) int {
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

func GetInsights(ctx context.Context, userID, timezone string) (*Insights, error) {
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

	historyRows, _, err := supax.GetUserStreakDays(ctx, userID, maxStreakDaysToFetch, 0)
	if err != nil {
		return nil, err
	}

	now := time.Now()
	todayStr := toLocalDate(now, loc)

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

	streakRemainingSeconds := streakRequiredSeconds - todayCallSeconds
	if streakRemainingSeconds < 0 {
		streakRemainingSeconds = 0
	}
	isTodayStreakComplete := todayCallSeconds >= streakRequiredSeconds

	currentStreak := 0
	if todayIsValid {
		yesterday := toLocalDate(now.AddDate(0, 0, -1), loc)
		if v, ok := historyByDate[yesterday]; !ok || !v {
			currentStreak = 1
		} else {
			count := 2
			for i := 2; i < maxStreakDaysToFetch; i++ {
				prev := toLocalDate(now.AddDate(0, 0, -i), loc)
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
		yesterday := toLocalDate(now.AddDate(0, 0, -1), loc)
		if v, ok := historyByDate[yesterday]; !ok || !v {
			streakIfTodayCompleted = 1
		} else {
			count := 2
			for i := 2; i < maxStreakDaysToFetch; i++ {
				prev := toLocalDate(now.AddDate(0, 0, -i), loc)
				if v, ok := historyByDate[prev]; !ok || !v {
					break
				}
				count++
			}
			streakIfTodayCompleted = count
		}
	}

	recent := make([]RecentStreakDay, 0, recentStreakDays)
	for i := 0; i < recentStreakDays; i++ {
		d := toLocalDate(now.AddDate(0, 0, -i), loc)
		recent = append(recent, RecentStreakDay{
			Date:    d,
			IsValid: currentStreak > 0 && i < currentStreak,
		})
	}

	longestFromHistory := longestConsecutiveValidDays(validDates)
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

	streakStatus := StreakIncomplete
	usedFreeze := false
	if streakRow != nil && streakRow.LastContinuationUsedFreeze != nil && *streakRow.LastContinuationUsedFreeze {
		usedFreeze = true
	}
	if currentStreak > 0 && isTodayStreakComplete {
		streakStatus = StreakActive
	} else if currentStreak > 0 && usedFreeze {
		streakStatus = StreakFrozen
	}

	var lastValidDate *string
	if streakRow != nil && streakRow.LastValidDate != nil {
		lastValidDate = streakRow.LastValidDate
	}

	out := &Insights{
		CurrentLevel: calc.Level,
		ExpProgress: ExpProgress{
			TotalExpSeconds:    levelTotalExp,
			ExpToNextLevel:     calc.ExpToNextLevel,
			ProgressPercentage: progressPct,
		},
		ExpEarnedToday:              expEarnedToday,
		RemainingSecondsToNextLevel: calc.ExpToNextLevel,
		StreakStatus:                streakStatus,
		TodayCallDuration: TodayCallDuration{
			TotalSeconds: todayCallSeconds,
			IsValid:      todayIsValid,
		},
		TodayCallDurationSeconds: todayCallSeconds,
		StreakRequiredSeconds:    streakRequiredSeconds,
		StreakRemainingSeconds:   streakRemainingSeconds,
		IsTodayStreakComplete:    isTodayStreakComplete,
		StreakIfTodayCompleted:   streakIfTodayCompleted,
		Streak: StreakSummary{
			CurrentStreak:                currentStreak,
			LongestStreak:                longestStreak,
			RemainingSecondsToKeepStreak: streakRemainingSeconds,
			LastValidDate:                lastValidDate,
		},
		TodayDate:        todayStr,
		RecentStreakDays: recent,
	}
	out.ExpBonuses = expbonus.ActiveBonuses(streakCountForExpBonus(out, 0), calc.Level)
	return out, nil
}
