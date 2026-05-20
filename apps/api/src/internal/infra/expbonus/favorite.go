package expbonus

const (
	TypeFavorite = "favorite"

	RelationMutual  = "mutual"
	RelationOneWay  = "one_way"
	CallFavoriteMutual  = "mutual"
	CallFavoriteOneWay  = "one-way"
)

type FavoriteRule struct {
	Relation   string
	Multiplier float64
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

func favoriteMultiplier(rules []FavoriteRule, relation string) float64 {
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

