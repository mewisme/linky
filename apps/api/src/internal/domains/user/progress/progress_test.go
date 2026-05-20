package progress

import (
	"encoding/json"
	"testing"

	"linky-api/src/internal/infra/expbonus"
)

func TestInsightsJSONMatchesProgressInsightsShape(t *testing.T) {
	lastDate := "2026-05-15"
	insights := Insights{
		CurrentLevel: 3,
		ExpProgress: ExpProgress{
			TotalExpSeconds:    450,
			ExpToNextLevel:     150,
			ProgressPercentage: 75.5,
		},
		ExpEarnedToday:              120,
		RemainingSecondsToNextLevel: 150,
		StreakStatus:                StreakActive,
		TodayCallDuration: TodayCallDuration{
			TotalSeconds: 320,
			IsValid:      true,
		},
		TodayCallDurationSeconds: 320,
		StreakRequiredSeconds:    300,
		StreakRemainingSeconds:   0,
		IsTodayStreakComplete:    true,
		StreakIfTodayCompleted:   5,
		Streak: StreakSummary{
			CurrentStreak:                5,
			LongestStreak:                10,
			RemainingSecondsToKeepStreak: 0,
			LastValidDate:                &lastDate,
		},
		TodayDate: "2026-05-16",
		RecentStreakDays: []RecentStreakDay{
			{Date: "2026-05-16", IsValid: true},
		},
	}

	raw, err := json.Marshal(insights)
	if err != nil {
		t.Fatalf("marshal: %v", err)
	}

	var decoded map[string]any
	if err := json.Unmarshal(raw, &decoded); err != nil {
		t.Fatalf("unmarshal: %v", err)
	}

	expProgress, ok := decoded["expProgress"].(map[string]any)
	if !ok {
		t.Fatalf("expProgress missing or wrong type: %v", decoded["expProgress"])
	}
	if expProgress["totalExpSeconds"] != float64(450) {
		t.Errorf("totalExpSeconds = %v", expProgress["totalExpSeconds"])
	}
	if expProgress["expToNextLevel"] != float64(150) {
		t.Errorf("expToNextLevel = %v", expProgress["expToNextLevel"])
	}
	if expProgress["progressPercentage"] != 75.5 {
		t.Errorf("progressPercentage = %v", expProgress["progressPercentage"])
	}

	streak, ok := decoded["streak"].(map[string]any)
	if !ok {
		t.Fatalf("streak missing: %v", decoded["streak"])
	}
	if streak["currentStreak"] != float64(5) {
		t.Errorf("currentStreak = %v", streak["currentStreak"])
	}
	if streak["remainingSecondsToKeepStreak"] != float64(0) {
		t.Errorf("remainingSecondsToKeepStreak = %v", streak["remainingSecondsToKeepStreak"])
	}
}

func TestApplyRealtimeCallProjectionPreservesExpProgress(t *testing.T) {
	base := &Insights{
		CurrentLevel: 2,
		ExpProgress: ExpProgress{
			TotalExpSeconds:    100,
			ExpToNextLevel:     200,
			ProgressPercentage: 33.3,
		},
		ExpEarnedToday:           50,
		StreakStatus:             StreakIncomplete,
		StreakRequiredSeconds:    300,
		StreakRemainingSeconds:   200,
		IsTodayStreakComplete:    false,
		StreakIfTodayCompleted:   3,
		TodayCallDurationSeconds: 100,
		TodayCallDuration:        TodayCallDuration{TotalSeconds: 100, IsValid: false},
		Streak: StreakSummary{
			CurrentStreak: 2,
			LongestStreak: 5,
		},
		RecentStreakDays: []RecentStreakDay{{Date: "2026-05-16", IsValid: true}},
	}

	projected := ApplyRealtimeCallProjection(base, 60, 60)
	if projected == nil {
		t.Fatal("expected projection")
	}
	if projected.ExpProgress.TotalExpSeconds != 160 {
		t.Errorf("totalExpSeconds = %d", projected.ExpProgress.TotalExpSeconds)
	}
	if projected.ExpProgress.ProgressPercentage <= 0 {
		t.Errorf("progressPercentage = %f", projected.ExpProgress.ProgressPercentage)
	}
}

func TestApplyRealtimeCallProjectionAppliesExpBonus(t *testing.T) {
	expbonus.ApplySnapshot(
		[]expbonus.Tier{{Min: 1, Max: 99, HasMin: true, HasMax: true, Multiplier: 2.0}},
		nil,
	)
	defer expbonus.ApplySnapshot(nil, nil)

	base := &Insights{
		CurrentLevel:             2,
		StreakRequiredSeconds:    300,
		IsTodayStreakComplete:    true,
		TodayCallDurationSeconds: 300,
		ExpProgress:              ExpProgress{TotalExpSeconds: 100, ExpToNextLevel: 200, ProgressPercentage: 33.3},
		ExpEarnedToday:           50,
		Streak:                   StreakSummary{CurrentStreak: 3, LongestStreak: 5},
	}

	projected := ApplyRealtimeCallProjection(base, 60, 60)
	if projected == nil {
		t.Fatal("expected projection")
	}
	if projected.ExpProgress.TotalExpSeconds != 220 {
		t.Errorf("totalExpSeconds = %d want 220", projected.ExpProgress.TotalExpSeconds)
	}
	if projected.ExpEarnedToday != 170 {
		t.Errorf("expEarnedToday = %d want 170", projected.ExpEarnedToday)
	}
}
