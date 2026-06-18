package exp

import "testing"

func TestBreakdownForAppliesBestMultipliers(t *testing.T) {
	t.Parallel()
	cfg := Config{
		StreakTiers: []Tier{
			{HasMin: true, Min: 3, Multiplier: 1.2},
			{HasMin: true, Min: 7, Multiplier: 1.5},
		},
		LevelTiers: []Tier{
			{HasMin: true, Min: 2, HasMax: true, Max: 5, Multiplier: 1.1},
			{HasMin: true, Min: 4, Multiplier: 1.3},
		},
		FavoriteRules: []FavoriteRule{
			{Relation: RelationOneWay, Multiplier: 1.1},
			{Relation: RelationMutual, Multiplier: 1.25},
		},
	}

	got := BreakdownFor(100, 8, 4, RelationMutual, cfg)
	if got.EffectiveSeconds != 243 {
		t.Fatalf("EffectiveSeconds = %d, want 243", got.EffectiveSeconds)
	}
	if got.StreakMultiplier != 1.5 || got.LevelMultiplier != 1.3 || got.FavoriteMultiplier != 1.25 {
		t.Fatalf("unexpected multipliers: %+v", got)
	}
}

func TestBreakdownForNonPositiveBase(t *testing.T) {
	t.Parallel()
	if got := BreakdownFor(0, 10, 10, RelationMutual, Config{}); got != (Breakdown{}) {
		t.Fatalf("BreakdownFor non-positive base = %+v, want zero value", got)
	}
}

func TestActiveBonusesAndFavoriteRelation(t *testing.T) {
	t.Parallel()
	cfg := Config{
		StreakTiers:   []Tier{{HasMin: true, Min: 2, Multiplier: 1.2}},
		LevelTiers:    []Tier{{HasMin: true, Min: 5, Multiplier: 1}},
		FavoriteRules: []FavoriteRule{{Relation: RelationMutual, Multiplier: 1.4}},
	}

	bonuses := ActiveBonuses(2, 5, RelationMutual, cfg)
	if len(bonuses) != 2 {
		t.Fatalf("ActiveBonuses length = %d, want 2: %+v", len(bonuses), bonuses)
	}
	if bonuses[0].Type != TypeStreak || bonuses[1].Type != TypeFavorite {
		t.Fatalf("unexpected bonuses: %+v", bonuses)
	}
	if got := RelationForCallFavorite(CallFavoriteMutual); got != RelationMutual {
		t.Fatalf("mutual relation = %q", got)
	}
	if got := RelationForCallFavorite("unknown"); got != "" {
		t.Fatalf("unknown relation = %q, want empty", got)
	}
}
