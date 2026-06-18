package leveling

type Params struct {
	Base int
	Step int
}

var Default = Params{Base: 300, Step: 120}

type Result struct {
	Level          int
	ExpToNextLevel int
}

func CalculateLevelFromExp(totalExpSeconds int, p Params) Result {
	p = normalizeParams(p)
	if totalExpSeconds <= 0 {
		return Result{Level: 1, ExpToNextLevel: p.Base}
	}

	totalExp := int64(totalExpSeconds)
	level := levelForExp(totalExp, p)
	expRequired, _ := expRequiredForLevel(level, p, totalExp)
	expForNext := expForNextLevel(level, p)
	expInCurrent := totalExp - expRequired
	return Result{
		Level:          level,
		ExpToNextLevel: boundedInt(expForNext - expInCurrent),
	}
}

func normalizeParams(p Params) Params {
	if p.Base == 0 && p.Step == 0 {
		return Default
	}
	if p.Base <= 0 {
		p.Base = Default.Base
	}
	if p.Step < 0 {
		p.Step = 0
	}
	return p
}

func levelForExp(totalExp int64, p Params) int {
	low, high := 1, 2
	for {
		if _, exceeds := expRequiredForLevel(high, p, totalExp); exceeds {
			break
		}
		low = high
		if high > maxInt/2 {
			return maxInt
		}
		high *= 2
	}
	for low < high {
		mid := low + (high-low+1)/2
		if _, exceeds := expRequiredForLevel(mid, p, totalExp); exceeds {
			high = mid - 1
			continue
		}
		low = mid
	}
	return low
}

func expRequiredForLevel(level int, p Params, limit int64) (int64, bool) {
	if level <= 1 {
		return 0, false
	}

	completed := int64(level - 1)
	baseExp, exceeds := cappedMul(completed, int64(p.Base), limit)
	if exceeds {
		return 0, true
	}

	a, b := completed, completed-1
	if a%2 == 0 {
		a /= 2
	} else {
		b /= 2
	}
	if a == 0 || b == 0 {
		return baseExp, false
	}

	stepLimit := limit - baseExp
	stepExp, exceeds := cappedMul(int64(p.Step), a, stepLimit)
	if exceeds {
		return 0, true
	}
	stepExp, exceeds = cappedMul(stepExp, b, stepLimit)
	if exceeds {
		return 0, true
	}

	total, exceeds := cappedAdd(baseExp, stepExp, limit)
	if exceeds {
		return 0, true
	}
	return total, false
}

func expForNextLevel(level int, p Params) int64 {
	limit := int64(maxInt)
	growth, exceeds := cappedMul(int64(level-1), int64(p.Step), limit)
	if exceeds {
		return limit
	}
	next, exceeds := cappedAdd(int64(p.Base), growth, limit)
	if exceeds {
		return limit
	}
	return next
}

func cappedMul(a, b, limit int64) (int64, bool) {
	if limit < 0 {
		return 0, true
	}
	if a == 0 || b == 0 {
		return 0, false
	}
	if a > limit/b {
		return 0, true
	}
	return a * b, false
}

func cappedAdd(a, b, limit int64) (int64, bool) {
	if limit < 0 || a > limit || b > limit-a {
		return 0, true
	}
	return a + b, false
}

func boundedInt(v int64) int {
	if v <= 0 {
		return 0
	}
	if v > int64(maxInt) {
		return maxInt
	}
	return int(v)
}

const maxInt = int(^uint(0) >> 1)
