package exp

const (
	TypeStreak = "streak"
	TypeLevel  = "level"
	TypeFavorite = "favorite"

	RelationMutual = "mutual"
	RelationOneWay = "one_way"

	CallFavoriteMutual = "mutual"
	CallFavoriteOneWay = "one-way"
)

type Tier struct {
	Min        int
	Max        int
	HasMin     bool
	HasMax     bool
	Multiplier float64
}

type FavoriteRule struct {
	Relation   string
	Multiplier float64
}

type Config struct {
	StreakTiers   []Tier
	LevelTiers    []Tier
	FavoriteRules []FavoriteRule
}

type Breakdown struct {
	BaseSeconds        int
	EffectiveSeconds   int
	StreakMultiplier   float64
	LevelMultiplier    float64
	FavoriteMultiplier float64
	CombinedMultiplier float64
}

type ActiveBonus struct {
	Type       string  `json:"type"`
	Multiplier float64 `json:"multiplier"`
	Min        *int    `json:"min,omitempty"`
	Max        *int    `json:"max,omitempty"`
	Relation   *string `json:"relation,omitempty"`
}
