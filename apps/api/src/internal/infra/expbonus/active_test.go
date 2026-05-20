package expbonus

import "testing"

func TestActiveBonuses(t *testing.T) {
	ApplySnapshot(
		[]Tier{{Min: 1, Max: 5, HasMin: true, HasMax: true, Multiplier: 1.5}},
		[]Tier{{Min: 10, HasMin: true, Multiplier: 2.0}},
	)
	defer ApplySnapshot(nil, nil)

	bonuses := ActiveBonuses(3, 12)
	if len(bonuses) != 2 {
		t.Fatalf("got %d bonuses", len(bonuses))
	}
	if bonuses[0].Type != TypeStreak || bonuses[0].Multiplier != 1.5 {
		t.Fatalf("streak bonus: %+v", bonuses[0])
	}
	if bonuses[1].Type != TypeLevel || bonuses[1].Multiplier != 2.0 {
		t.Fatalf("level bonus: %+v", bonuses[1])
	}

	none := ActiveBonuses(0, 5)
	if len(none) != 0 {
		t.Fatalf("expected no bonuses, got %+v", none)
	}
}
