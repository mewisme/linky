package expbonus

type ActiveBonus struct {
	Type       string   `json:"type"`
	Multiplier float64  `json:"multiplier"`
	Min        *int     `json:"min,omitempty"`
	Max        *int     `json:"max,omitempty"`
}

func ActiveBonuses(streakCount, level int) []ActiveBonus {
	out := make([]ActiveBonus, 0, 2)
	if b, ok := activeBonusFor(TypeStreak, streakCount); ok {
		out = append(out, b)
	}
	if b, ok := activeBonusFor(TypeLevel, level); ok {
		out = append(out, b)
	}
	return out
}

func activeBonusFor(typ string, value int) (ActiveBonus, bool) {
	mu.RLock()
	var tiers []Tier
	switch typ {
	case TypeStreak:
		tiers = streakTiers
	case TypeLevel:
		tiers = levelTiers
	default:
		mu.RUnlock()
		return ActiveBonus{}, false
	}
	tiersCopy := append([]Tier(nil), tiers...)
	mu.RUnlock()

	tier, ok := matchedTier(tiersCopy, value)
	if !ok || tier.Multiplier <= 1 {
		return ActiveBonus{}, false
	}
	b := ActiveBonus{Type: typ, Multiplier: tier.Multiplier}
	if tier.HasMin {
		min := tier.Min
		b.Min = &min
	}
	if tier.HasMax {
		max := tier.Max
		b.Max = &max
	}
	return b, true
}

func matchedTier(tiers []Tier, value int) (Tier, bool) {
	if value < 0 || len(tiers) == 0 {
		return Tier{}, false
	}
	best := Tier{}
	matched := false
	for _, t := range tiers {
		if t.HasMin && value < t.Min {
			continue
		}
		if t.HasMax && value > t.Max {
			continue
		}
		if !matched || t.Multiplier > best.Multiplier {
			best = t
			matched = true
		}
	}
	return best, matched
}
