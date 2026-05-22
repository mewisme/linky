package supax

import str "linky-api/src/internal/infra/supax/streaks"

type UpsertStreakDayResult = str.UpsertDayResult

type UserStreakDayRow = str.DayRow

var (
	UpsertUserStreakDay      = str.UpsertUserDay
	GetUserStreakDays        = str.GetUserDays
	GetUserStreakDaysByMonth = str.GetUserDaysByMonth
)
