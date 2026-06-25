package expbonus

import "testing"

func TestEffectiveSecondsNoTiers(t *testing.T) {
	ApplySnapshot(nil, nil, nil)
	if got := EffectiveSeconds(100, 5, 3, ""); got != 100 {
		t.Fatalf("got %d want 100", got)
	}
}

func TestEffectiveSecondsStreakAndLevelMultiply(t *testing.T) {
	ApplySnapshot(
		[]Tier{{Min: 1, Max: 10, HasMin: true, HasMax: true, Multiplier: 1.5}},
		[]Tier{{Min: 1, Max: 5, HasMin: true, HasMax: true, Multiplier: 2.0}},
		nil,
	)
	got := EffectiveSeconds(100, 3, 2, "")
	want := 300
	if got != want {
		t.Fatalf("got %d want %d", got, want)
	}
}

func TestMultiplierForValueMinOnly(t *testing.T) {
	ApplySnapshot(nil, []Tier{{Min: 10, HasMin: true, Multiplier: 2.0}}, nil)
	defer ApplySnapshot(nil, nil, nil)
	if got := EffectiveSeconds(50, 0, 15, ""); got != 100 {
		t.Fatalf("got %d want 100", got)
	}
	if got := EffectiveSeconds(50, 0, 5, ""); got != 50 {
		t.Fatalf("got %d want 50", got)
	}
}

func TestMultiplierForValueMaxOnly(t *testing.T) {
	ApplySnapshot([]Tier{{Max: 3, HasMax: true, Multiplier: 1.5}}, nil, nil)
	defer ApplySnapshot(nil, nil, nil)
	if got := EffectiveSeconds(100, 2, 1, ""); got != 150 {
		t.Fatalf("got %d want 150", got)
	}
	if got := EffectiveSeconds(100, 10, 1, ""); got != 100 {
		t.Fatalf("got %d want 100", got)
	}
}

func TestMultiplierForValuePicksHighestOnOverlap(t *testing.T) {
	tiers := []Tier{
		{Min: 0, Max: 5, HasMin: true, HasMax: true, Multiplier: 1.2},
		{Min: 3, Max: 10, HasMin: true, HasMax: true, Multiplier: 1.8},
	}
	if m := multiplierForValue(tiers, 4); m != 1.8 {
		t.Fatalf("multiplier = %v want 1.8", m)
	}
}

func TestMultiplierForValueOutOfRange(t *testing.T) {
	tiers := []Tier{{Min: 5, Max: 10, HasMin: true, HasMax: true, Multiplier: 2.0}}
	if m := multiplierForValue(tiers, 2); m != 1 {
		t.Fatalf("multiplier = %v want 1", m)
	}
}

func TestParseRows(t *testing.T) {
	streak, level, favorite := ParseRows([]map[string]any{
		{
			"type":             "streak",
			"bonus_multiplier": 1.25,
			"config":           map[string]any{"min": float64(1), "max": float64(7)},
		},
		{
			"type":             "level",
			"bonus_multiplier": "2.5",
			"config":           map[string]any{"min": 10, "max": 20},
		},
		{
			"type":             "unknown",
			"bonus_multiplier": 9,
			"config":           map[string]any{"min": 0, "max": 1},
		},
	})
	if len(streak) != 1 || streak[0].Multiplier != 1.25 {
		t.Fatalf("streak tiers: %+v", streak)
	}
	if len(level) != 1 || level[0].Multiplier != 2.5 || !level[0].HasMin || level[0].Min != 10 || !level[0].HasMax {
		t.Fatalf("level tiers: %+v", level)
	}
	if len(favorite) != 0 {
		t.Fatalf("favorite rules: %+v", favorite)
	}
}

func TestEffectiveSecondsFavoriteMultiplier(t *testing.T) {
	ApplySnapshot(nil, nil, []FavoriteRule{
		{Relation: RelationMutual, Multiplier: 2.0},
		{Relation: RelationOneWay, Multiplier: 1.25},
	})
	defer ApplySnapshot(nil, nil, nil)
	if got := EffectiveSeconds(100, 0, 1, RelationMutual); got != 200 {
		t.Fatalf("mutual got %d want 200", got)
	}
	if got := EffectiveSeconds(100, 0, 1, RelationOneWay); got != 125 {
		t.Fatalf("one_way got %d want 125", got)
	}
}

func TestParseRowsFavorite(t *testing.T) {
	_, _, favorite := ParseRows([]map[string]any{
		{
			"type":             "favorite",
			"bonus_multiplier": 2,
			"config":           map[string]any{"relation": "mutual"},
		},
	})
	if len(favorite) != 1 || favorite[0].Relation != RelationMutual || favorite[0].Multiplier != 2 {
		t.Fatalf("favorite: %+v", favorite)
	}
}

func TestParseRowsOpenEnded(t *testing.T) {
	streak, _, _ := ParseRows([]map[string]any{
		{
			"type":             "streak",
			"bonus_multiplier": 1.1,
			"config":           map[string]any{"min": float64(5)},
		},
		{
			"type":             "streak",
			"bonus_multiplier": 1.2,
			"config":           map[string]any{"max": float64(2)},
		},
	})
	if len(streak) != 2 {
		t.Fatalf("streak tiers: %+v", streak)
	}
	if !streak[0].HasMin || streak[0].HasMax || streak[0].Min != 5 {
		t.Fatalf("min-only tier: %+v", streak[0])
	}
	if streak[1].HasMin || !streak[1].HasMax || streak[1].Max != 2 {
		t.Fatalf("max-only tier: %+v", streak[1])
	}
}
