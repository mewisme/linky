package ollamax

import (
	"strings"
	"unicode"
)

const EmptyProfileFallback = "__linky_empty_profile__"

type ChunkingConfig struct {
	MaxChunkChars            int
	ChunkOverlapChars        int
	MaxChunksPerJob          int
	MaxTotalInputCharsPerJob int
}

func NormalizeWhitespace(text string) string {
	if text == "" {
		return ""
	}
	text = strings.ReplaceAll(text, "\r\n", "\n")
	text = strings.ReplaceAll(text, "\u00a0", " ")
	var b strings.Builder
	b.Grow(len(text))
	prevSpace := false
	for _, r := range text {
		isSpace := r == '\t' || r == '\n' || r == '\f' || r == '\v' || r == '\u0085' || r == '\u2028' || r == '\u2029' || (unicode.IsSpace(r) && r != ' ')
		if isSpace {
			r = ' '
		}
		if r == ' ' {
			if prevSpace {
				continue
			}
			prevSpace = true
			b.WriteByte(' ')
			continue
		}
		prevSpace = false
		b.WriteRune(r)
	}
	return strings.TrimSpace(b.String())
}

func dedupePreserveOrder(chunks []string) []string {
	seen := make(map[string]bool, len(chunks))
	out := make([]string, 0, len(chunks))
	for _, c := range chunks {
		if seen[c] {
			continue
		}
		seen[c] = true
		out = append(out, c)
	}
	return out
}

func ChunkText(text string, cfg ChunkingConfig) []string {
	normalized := NormalizeWhitespace(text)
	if normalized == "" {
		return nil
	}
	maxLen := cfg.MaxChunkChars
	if maxLen < 32 {
		maxLen = 32
	}
	overlap := cfg.ChunkOverlapChars
	if overlap < 0 {
		overlap = 0
	}
	if overlap >= maxLen {
		overlap = maxLen - 1
	}
	runes := []rune(normalized)
	var rawChunks []string
	start := 0
	for start < len(runes) {
		end := start + maxLen
		if end > len(runes) {
			end = len(runes)
		}
		slice := strings.TrimSpace(string(runes[start:end]))
		if slice != "" {
			rawChunks = append(rawChunks, slice)
		}
		if end >= len(runes) {
			break
		}
		nextStart := end - overlap
		if nextStart <= start {
			nextStart = start + 1
		}
		start = nextStart
	}
	deduped := dedupePreserveOrder(rawChunks)
	totalChars := 0
	out := make([]string, 0, len(deduped))
	for _, c := range deduped {
		if cfg.MaxChunksPerJob > 0 && len(out) >= cfg.MaxChunksPerJob {
			break
		}
		if cfg.MaxTotalInputCharsPerJob > 0 && totalChars+len(c) > cfg.MaxTotalInputCharsPerJob {
			break
		}
		totalChars += len(c)
		out = append(out, c)
	}
	return out
}

func PrepareChunks(text string, cfg ChunkingConfig) []string {
	chunks := ChunkText(text, cfg)
	if len(chunks) == 0 {
		return []string{EmptyProfileFallback}
	}
	return chunks
}

func MeanPool(vectors [][]float32) []float32 {
	if len(vectors) == 0 {
		return nil
	}
	dim := len(vectors[0])
	if dim == 0 {
		return nil
	}
	out := make([]float32, dim)
	for _, v := range vectors {
		if len(v) != dim {
			return nil
		}
		for i, x := range v {
			out[i] += x
		}
	}
	inv := float32(1) / float32(len(vectors))
	for i := range out {
		out[i] *= inv
	}
	return out
}

func ValidateDimension(v []float32, expected int) bool {
	if expected <= 0 {
		return len(v) > 0
	}
	return len(v) == expected
}

func PlanBatches(chunks []string, batchSize, maxBatchTotalChars int) [][]string {
	if batchSize <= 0 {
		batchSize = 1
	}
	if maxBatchTotalChars <= 0 {
		maxBatchTotalChars = 1 << 30
	}
	var batches [][]string
	var current []string
	curChars := 0
	for _, ch := range chunks {
		wouldChars := curChars + len(ch)
		wouldCount := len(current) + 1
		if len(current) > 0 && (wouldCount > batchSize || wouldChars > maxBatchTotalChars) {
			batches = append(batches, current)
			current = nil
			curChars = 0
		}
		current = append(current, ch)
		curChars += len(ch)
	}
	if len(current) > 0 {
		batches = append(batches, current)
	}
	return batches
}
