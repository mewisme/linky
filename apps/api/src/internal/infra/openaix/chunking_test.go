package openaix

import (
	"strings"
	"testing"

	"github.com/pkoukk/tiktoken-go"
)

func TestPrepareChunks_tokenLimits(t *testing.T) {
	enc, err := tiktoken.GetEncoding("cl100k_base")
	if err != nil {
		t.Fatal(err)
	}
	long := strings.Repeat("word ", 5000)
	cfg := ChunkingConfig{
		MaxChunkTokens:            100,
		ChunkOverlapTokens:        10,
		MaxChunksPerJob:           3,
		MaxTotalInputTokensPerJob: 250,
	}
	chunks := PrepareChunks(long, enc, cfg)
	if len(chunks) == 0 {
		t.Fatal("expected chunks")
	}
	if len(chunks) > cfg.MaxChunksPerJob {
		t.Fatalf("got %d chunks, want at most %d", len(chunks), cfg.MaxChunksPerJob)
	}
	for _, c := range chunks {
		if len(enc.EncodeOrdinary(c)) > cfg.MaxChunkTokens {
			t.Fatalf("chunk exceeds max tokens: %d", len(enc.EncodeOrdinary(c)))
		}
	}
}
