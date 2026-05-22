package progress

import (
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
