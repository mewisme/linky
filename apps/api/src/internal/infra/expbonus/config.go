package expbonus

import (
	"context"
	"encoding/json"
	"strconv"
	"sync"
	"time"

	"linky-api/src/internal/domain/user/exp"
	"linky-api/src/internal/logger"
)

const (
	TypeStreak   = exp.TypeStreak
	TypeLevel    = exp.TypeLevel
	TypeFavorite = exp.TypeFavorite

	RelationMutual = exp.RelationMutual
	RelationOneWay = exp.RelationOneWay

	CallFavoriteMutual = exp.CallFavoriteMutual
	CallFavoriteOneWay = exp.CallFavoriteOneWay

	refreshInterval = 30 * time.Second
	refreshTimeout  = 10 * time.Second
)

type (
	Tier         = exp.Tier
	FavoriteRule = exp.FavoriteRule
	Breakdown    = exp.Breakdown
	ActiveBonus  = exp.ActiveBonus
)

var (
	log = logger.New("infra:expbonus")

	mu       sync.RWMutex
	snapshot exp.Config

	startOnce sync.Once
	reloadFn  func(context.Context) error
)

func SetReloadFunc(fn func(context.Context) error) {
	reloadFn = fn
}

func Load(ctx context.Context) error {
	return Reload(ctx)
}

func Reload(ctx context.Context) error {
	if reloadFn == nil {
		ApplySnapshot(nil, nil, nil)
		return nil
	}
	return reloadFn(ctx)
}

func StartRefresher(ctx context.Context) {
	startOnce.Do(func() {
		go func() {
			t := time.NewTicker(refreshInterval)
			defer t.Stop()
			for {
				select {
				case <-ctx.Done():
					return
				case <-t.C:
					rctx, cancel := context.WithTimeout(context.Background(), refreshTimeout)
					if err := Reload(rctx); err != nil {
						log.Warn().Err(err).Msg("EXP bonus config refresh failed")
					}
					cancel()
				}
			}
		}()
	})
}

func ApplySnapshot(streak, level []Tier, favorite []FavoriteRule) {
	mu.Lock()
	snapshot = exp.Config{
		StreakTiers:   append([]exp.Tier(nil), streak...),
		LevelTiers:    append([]exp.Tier(nil), level...),
		FavoriteRules: append([]exp.FavoriteRule(nil), favorite...),
	}
	mu.Unlock()
	log.Info().
		Int("streak_tiers", len(snapshot.StreakTiers)).
		Int("level_tiers", len(snapshot.LevelTiers)).
		Int("favorite_rules", len(snapshot.FavoriteRules)).
		Msg("EXP bonus config applied")
}

func Config() exp.Config {
	mu.RLock()
	defer mu.RUnlock()
	return exp.Config{
		StreakTiers:   append([]exp.Tier(nil), snapshot.StreakTiers...),
		LevelTiers:    append([]exp.Tier(nil), snapshot.LevelTiers...),
		FavoriteRules: append([]exp.FavoriteRule(nil), snapshot.FavoriteRules...),
	}
}

func EffectiveSeconds(baseSeconds, streakCount, level int, favoriteRelation string) int {
	return exp.EffectiveSeconds(baseSeconds, streakCount, level, favoriteRelation, Config())
}

func BreakdownFor(baseSeconds, streakCount, level int, favoriteRelation string) Breakdown {
	return exp.BreakdownFor(baseSeconds, streakCount, level, favoriteRelation, Config())
}

func ActiveBonuses(streakCount, level int, favoriteRelation string) []ActiveBonus {
	return exp.ActiveBonuses(streakCount, level, favoriteRelation, Config())
}

func RelationForCallFavorite(callFavoriteType string) string {
	return exp.RelationForCallFavorite(callFavoriteType)
}

func ParseRows(rows []map[string]any) (streak, level []Tier, favorite []FavoriteRule) {
	for _, row := range rows {
		typ, _ := row["type"].(string)
		mult, ok := parseMultiplier(row["bonus_multiplier"])
		if !ok || mult < 1 {
			continue
		}
		switch typ {
		case TypeStreak, TypeLevel:
			tier, ok := parseConfigTier(row["config"])
			if !ok {
				continue
			}
			tier.Multiplier = mult
			if typ == TypeStreak {
				streak = append(streak, tier)
			} else {
				level = append(level, tier)
			}
		case TypeFavorite:
			rel, ok := parseFavoriteRelation(row["config"])
			if !ok {
				continue
			}
			favorite = append(favorite, FavoriteRule{Relation: rel, Multiplier: mult})
		}
	}
	return streak, level, favorite
}

func parseFavoriteRelation(raw any) (string, bool) {
	cfg, err := configToMap(raw)
	if err != nil || cfg == nil {
		return "", false
	}
	rel, _ := cfg["relation"].(string)
	if rel != RelationMutual && rel != RelationOneWay {
		return "", false
	}
	return rel, true
}

func parseConfigTier(raw any) (Tier, bool) {
	cfg, err := configToMap(raw)
	if err != nil || cfg == nil {
		return Tier{}, false
	}
	min, minOK := intFromAny(cfg["min"])
	max, maxOK := intFromAny(cfg["max"])
	if !minOK && !maxOK {
		return Tier{}, false
	}
	if minOK && min < 0 {
		return Tier{}, false
	}
	if minOK && maxOK && max < min {
		return Tier{}, false
	}
	t := Tier{}
	if minOK {
		t.Min = min
		t.HasMin = true
	}
	if maxOK {
		t.Max = max
		t.HasMax = true
	}
	return t, true
}

func configToMap(raw any) (map[string]any, error) {
	switch v := raw.(type) {
	case map[string]any:
		return v, nil
	case json.RawMessage:
		var m map[string]any
		if err := json.Unmarshal(v, &m); err != nil {
			return nil, err
		}
		return m, nil
	case []byte:
		var m map[string]any
		if err := json.Unmarshal(v, &m); err != nil {
			return nil, err
		}
		return m, nil
	case string:
		var m map[string]any
		if err := json.Unmarshal([]byte(v), &m); err != nil {
			return nil, err
		}
		return m, nil
	default:
		if raw == nil {
			return nil, nil
		}
		b, err := json.Marshal(raw)
		if err != nil {
			return nil, err
		}
		var m map[string]any
		if err := json.Unmarshal(b, &m); err != nil {
			return nil, err
		}
		return m, nil
	}
}

func parseMultiplier(raw any) (float64, bool) {
	switch v := raw.(type) {
	case float64:
		return v, true
	case float32:
		return float64(v), true
	case int:
		return float64(v), true
	case int64:
		return float64(v), true
	case json.Number:
		f, err := v.Float64()
		return f, err == nil
	case string:
		f, err := strconv.ParseFloat(v, 64)
		return f, err == nil
	default:
		return 0, false
	}
}

func intFromAny(v any) (int, bool) {
	switch n := v.(type) {
	case float64:
		return int(n), true
	case float32:
		return int(n), true
	case int:
		return n, true
	case int64:
		return int(n), true
	case json.Number:
		i, err := n.Int64()
		return int(i), err == nil
	default:
		return 0, false
	}
}

func multiplierForValue(tiers []Tier, value int) float64 {
	return exp.MultiplierForValue(tiers, value)
}
