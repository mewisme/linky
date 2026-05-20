package expbonus

import (
	"context"
	"encoding/json"
	"math"
	"strconv"
	"sync"
	"time"

	"linky-api/src/internal/logger"
)

const (
	TypeStreak = "streak"
	TypeLevel  = "level"

	refreshInterval = 30 * time.Second
	refreshTimeout  = 10 * time.Second
)

var (
	log = logger.New("infra:expbonus")

	mu         sync.RWMutex
	streakTiers []Tier
	levelTiers  []Tier

	startOnce sync.Once
	reloadFn  func(context.Context) error
)

type Tier struct {
	Min        int
	Max        int
	HasMin     bool
	HasMax     bool
	Multiplier float64
}

type Breakdown struct {
	BaseSeconds      int
	EffectiveSeconds int
	StreakMultiplier float64
	LevelMultiplier  float64
	CombinedMultiplier float64
}

func SetReloadFunc(fn func(context.Context) error) {
	reloadFn = fn
}

func Load(ctx context.Context) error {
	return Reload(ctx)
}

func Reload(ctx context.Context) error {
	if reloadFn == nil {
		ApplySnapshot(nil, nil)
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

func ApplySnapshot(streak, level []Tier) {
	mu.Lock()
	streakTiers = append([]Tier(nil), streak...)
	levelTiers = append([]Tier(nil), level...)
	mu.Unlock()
	log.Info().
		Int("streak_tiers", len(streakTiers)).
		Int("level_tiers", len(levelTiers)).
		Msg("EXP bonus config applied")
}

func EffectiveSeconds(baseSeconds, streakCount, level int) int {
	return BreakdownFor(baseSeconds, streakCount, level).EffectiveSeconds
}

func BreakdownFor(baseSeconds, streakCount, level int) Breakdown {
	if baseSeconds <= 0 {
		return Breakdown{}
	}
	mu.RLock()
	streak := append([]Tier(nil), streakTiers...)
	levelTiersCopy := append([]Tier(nil), levelTiers...)
	mu.RUnlock()

	streakMult := multiplierForValue(streak, streakCount)
	levelMult := multiplierForValue(levelTiersCopy, level)
	combined := streakMult * levelMult
	effective := int(math.Floor(float64(baseSeconds) * combined))
	if effective < 0 {
		effective = 0
	}
	return Breakdown{
		BaseSeconds:          baseSeconds,
		EffectiveSeconds:     effective,
		StreakMultiplier:     streakMult,
		LevelMultiplier:      levelMult,
		CombinedMultiplier:   combined,
	}
}

func multiplierForValue(tiers []Tier, value int) float64 {
	if value < 0 || len(tiers) == 0 {
		return 1
	}
	best := 1.0
	matched := false
	for _, t := range tiers {
		if t.HasMin && value < t.Min {
			continue
		}
		if t.HasMax && value > t.Max {
			continue
		}
		matched = true
		if t.Multiplier > best {
			best = t.Multiplier
		}
	}
	if !matched {
		return 1
	}
	return best
}

func ParseRows(rows []map[string]any) (streak, level []Tier) {
	for _, row := range rows {
		typ, _ := row["type"].(string)
		tier, ok := parseConfigTier(row["config"])
		if !ok {
			continue
		}
		mult, ok := parseMultiplier(row["bonus_multiplier"])
		if !ok || mult < 1 {
			continue
		}
		tier.Multiplier = mult
		switch typ {
		case TypeStreak:
			streak = append(streak, tier)
		case TypeLevel:
			level = append(level, tier)
		}
	}
	return streak, level
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
