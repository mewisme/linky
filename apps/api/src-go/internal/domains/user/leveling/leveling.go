package leveling

import "math"

type Params struct {
	Base int
	Step int
}

var Default = Params{Base: 300, Step: 120}

type Result struct {
	Level         int
	ExpToNextLevel int
}

func CalculateLevelFromExp(totalExpSeconds int, p Params) Result {
	if p.Base == 0 && p.Step == 0 {
		p = Default
	}
	if totalExpSeconds <= 0 {
		return Result{Level: 1, ExpToNextLevel: p.Base}
	}
	a := float64(p.Step) / 2
	b := float64(p.Base) - 3*float64(p.Step)/2
	c := float64(p.Step) - float64(p.Base) - float64(totalExpSeconds)
	disc := b*b - 4*a*c
	if disc < 0 {
		return Result{Level: 1, ExpToNextLevel: p.Base}
	}
	sqrtD := math.Sqrt(disc)
	levelCandidate := int(math.Floor((-b+sqrtD)/(2*a))) + 1
	level := levelCandidate
	if level < 1 {
		level = 1
	}
	expRequired := 0
	if level > 1 {
		n := level - 1
		expRequired = n*p.Base + (p.Step*(n-1)*n)/2
	}
	for expRequired+p.Base+(level-1)*p.Step <= totalExpSeconds {
		expRequired += p.Base + (level-1)*p.Step
		level++
	}
	if level > levelCandidate+2 {
		level = levelCandidate + 1
		n := level - 1
		expRequired = n*p.Base + (p.Step*(n-1)*n)/2
	}
	expForNext := p.Base + (level-1)*p.Step
	expInCurrent := totalExpSeconds - expRequired
	return Result{Level: level, ExpToNextLevel: expForNext - expInCurrent}
}
