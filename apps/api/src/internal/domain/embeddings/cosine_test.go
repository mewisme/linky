package embeddings

import (
	"math"
	"testing"
)

func TestCosineSimilarity(t *testing.T) {
	t.Parallel()
	cases := []struct {
		name string
		a    []float32
		b    []float32
		want float64
	}{
		{"empty vector", nil, []float32{1}, 0},
		{"zero magnitude", []float32{0, 0}, []float32{1, 1}, 0},
		{"identical", []float32{1, 2, 3}, []float32{1, 2, 3}, 1},
		{"opposite", []float32{1, 0}, []float32{-1, 0}, -1},
		{"orthogonal", []float32{1, 0}, []float32{0, 1}, 0},
		{"uses shortest vector length", []float32{1, 0, 99}, []float32{1, 0}, 1},
	}
	for _, tc := range cases {
		t.Run(tc.name, func(t *testing.T) {
			t.Parallel()
			got := CosineSimilarity(tc.a, tc.b)
			if math.Abs(got-tc.want) > 1e-9 {
				t.Fatalf("CosineSimilarity() = %v, want %v", got, tc.want)
			}
		})
	}
}
