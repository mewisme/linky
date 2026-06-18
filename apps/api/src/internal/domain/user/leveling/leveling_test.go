package leveling

import "testing"

func TestCalculateLevelFromExp(t *testing.T) {
	t.Parallel()
	cases := []struct {
		name string
		exp  int
		p    Params
		want Result
	}{
		{"negative exp starts at level one", -1, Params{Base: 100, Step: 50}, Result{Level: 1, ExpToNextLevel: 100}},
		{"zero params use defaults", 0, Params{}, Result{Level: 1, ExpToNextLevel: 300}},
		{"just before level two", 99, Params{Base: 100, Step: 50}, Result{Level: 1, ExpToNextLevel: 1}},
		{"exactly level two", 100, Params{Base: 100, Step: 50}, Result{Level: 2, ExpToNextLevel: 150}},
		{"just before level three", 249, Params{Base: 100, Step: 50}, Result{Level: 2, ExpToNextLevel: 1}},
		{"exactly level three", 250, Params{Base: 100, Step: 50}, Result{Level: 3, ExpToNextLevel: 200}},
		{"inside level three", 300, Params{Base: 100, Step: 50}, Result{Level: 3, ExpToNextLevel: 150}},
		{"exactly level four", 450, Params{Base: 100, Step: 50}, Result{Level: 4, ExpToNextLevel: 250}},
		{"zero step stays flat", 250, Params{Base: 100, Step: 0}, Result{Level: 3, ExpToNextLevel: 50}},
		{"negative step is flat", 250, Params{Base: 100, Step: -50}, Result{Level: 3, ExpToNextLevel: 50}},
		{"missing base uses default base", 300, Params{Base: 0, Step: 50}, Result{Level: 2, ExpToNextLevel: 350}},
		{"negative base uses default base", 299, Params{Base: -100, Step: 50}, Result{Level: 1, ExpToNextLevel: 1}},
	}
	for _, tc := range cases {
		t.Run(tc.name, func(t *testing.T) {
			t.Parallel()
			if got := CalculateLevelFromExp(tc.exp, tc.p); got != tc.want {
				t.Fatalf("CalculateLevelFromExp() = %+v, want %+v", got, tc.want)
			}
		})
	}
}
