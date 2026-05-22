package exp

import "math"

func EffectiveSeconds(baseSeconds, streakCount, level int, favoriteRelation string, cfg Config) int {
	return BreakdownFor(baseSeconds, streakCount, level, favoriteRelation, cfg).EffectiveSeconds
}

func BreakdownFor(baseSeconds, streakCount, level int, favoriteRelation string, cfg Config) Breakdown {
	if baseSeconds <= 0 {
		return Breakdown{}
	}
	streakMult := MultiplierForValue(cfg.StreakTiers, streakCount)
	levelMult := MultiplierForValue(cfg.LevelTiers, level)
	favMult := FavoriteMultiplier(cfg.FavoriteRules, favoriteRelation)
	combined := streakMult * levelMult * favMult
	effective := int(math.Floor(float64(baseSeconds) * combined))
	if effective < 0 {
		effective = 0
	}
	return Breakdown{
		BaseSeconds:        baseSeconds,
		EffectiveSeconds:   effective,
		StreakMultiplier:   streakMult,
		LevelMultiplier:    levelMult,
		FavoriteMultiplier: favMult,
		CombinedMultiplier: combined,
	}
}

func ActiveBonuses(streakCount, level int, favoriteRelation string, cfg Config) []ActiveBonus {
	out := make([]ActiveBonus, 0, 3)
	if b, ok := activeBonusFor(TypeStreak, streakCount, cfg.StreakTiers); ok {
		out = append(out, b)
	}
	if b, ok := activeBonusFor(TypeLevel, level, cfg.LevelTiers); ok {
		out = append(out, b)
	}
	if b, ok := activeFavoriteBonus(favoriteRelation, cfg.FavoriteRules); ok {
		out = append(out, b)
	}
	return out
}

func MultiplierForValue(tiers []Tier, value int) float64 {
	tier, ok := MatchedTier(tiers, value)
	if !ok {
		return 1
	}
	return tier.Multiplier
}

func MatchedTier(tiers []Tier, value int) (Tier, bool) {
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

func FavoriteMultiplier(rules []FavoriteRule, relation string) float64 {
	if relation == "" || len(rules) == 0 {
		return 1
	}
	best := 1.0
	matched := false
	for _, r := range rules {
		if r.Relation != relation || r.Multiplier < 1 {
			continue
		}
		if !matched || r.Multiplier > best {
			best = r.Multiplier
			matched = true
		}
	}
	if !matched {
		return 1
	}
	return best
}

func RelationForCallFavorite(callFavoriteType string) string {
	switch callFavoriteType {
	case CallFavoriteMutual:
		return RelationMutual
	case CallFavoriteOneWay:
		return RelationOneWay
	default:
		return ""
	}
}

func activeFavoriteBonus(relation string, rules []FavoriteRule) (ActiveBonus, bool) {
	mult := FavoriteMultiplier(rules, relation)
	if mult <= 1 || relation == "" {
		return ActiveBonus{}, false
	}
	rel := relation
	return ActiveBonus{Type: TypeFavorite, Multiplier: mult, Relation: &rel}, true
}

func activeBonusFor(typ string, value int, tiers []Tier) (ActiveBonus, bool) {
	tier, ok := MatchedTier(tiers, value)
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
