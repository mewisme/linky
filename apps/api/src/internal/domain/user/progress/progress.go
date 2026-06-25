package progress

import (
	"sort"
	"time"

	"linky-api/src/internal/domain/user/exp"
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
	ExpBonuses                  []exp.ActiveBonus `json:"expBonuses"`
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

func LocalDate(t time.Time, loc *time.Location) string {
	return toLocalDate(t, loc)
}

func LocalDateInTimezone(t time.Time, timezone string) string {
	loc, err := time.LoadLocation(timezone)
	if err != nil {
		loc = time.UTC
	}
	return toLocalDate(t, loc)
}

func LongestConsecutiveValidDays(dates []string) int {
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
