package runtime

import (
	"context"
	"errors"
	"io"
	"log/slog"
	"sync/atomic"
	"testing"
	"time"

	"linky-worker/src-go/internal/api"
	"linky-worker/src-go/internal/job"
)

type fakeQueueOps struct {
	movePayloads []string
	moveErr      error

	ackCalls       []string
	ackErr         error
	dlqEntries     []job.DLQEntry
	dlqErr         error
}

func (f *fakeQueueOps) MoveToProcessing(_ context.Context, _ string, _ time.Duration) (string, error) {
	if f.moveErr != nil {
		return "", f.moveErr
	}
	if len(f.movePayloads) == 0 {
		return "", nil
	}
	next := f.movePayloads[0]
	f.movePayloads = f.movePayloads[1:]
	return next, nil
}

func (f *fakeQueueOps) AckJob(_ context.Context, _, raw string) error {
	f.ackCalls = append(f.ackCalls, raw)
	return f.ackErr
}

func (f *fakeQueueOps) PushToDLQ(_ context.Context, entry job.DLQEntry) error {
	f.dlqEntries = append(f.dlqEntries, entry)
	return f.dlqErr
}

func silentLogger() *slog.Logger {
	return slog.New(slog.NewTextHandler(io.Discard, nil))
}

const validRaw = `{"v":1,"type":"user_embedding_regenerate","payload":{"userId":"550e8400-e29b-41d4-a716-446655440000"}}`

func TestProcessOnce_AckOnSuccess(t *testing.T) {
	rdb := &fakeQueueOps{movePayloads: []string{validRaw}}
	post := func(_ context.Context, _ api.EnvConfig, _ interface{}, _ string, _ *slog.Logger) api.Result {
		return api.Result{OK: true, Attempts: 1, LastStatus: 204}
	}
	var stopping atomic.Bool
	var activity atomic.Int64

	processOnce(context.Background(), rdb, api.EnvConfig{}, "worker-A", post, silentLogger(), &stopping, &activity)

	if len(rdb.ackCalls) != 1 || rdb.ackCalls[0] != validRaw {
		t.Fatalf("expected exactly one ack with validRaw, got %v", rdb.ackCalls)
	}
	if len(rdb.dlqEntries) != 0 {
		t.Fatalf("expected no DLQ entries, got %v", rdb.dlqEntries)
	}
}

func TestProcessOnce_DLQOnDropped(t *testing.T) {
	rdb := &fakeQueueOps{movePayloads: []string{validRaw}}
	post := func(_ context.Context, _ api.EnvConfig, _ interface{}, _ string, _ *slog.Logger) api.Result {
		return api.Result{OK: false, Dropped: true, Attempts: 1, LastStatus: 400, ErrorMessage: "ValidationError"}
	}
	var stopping atomic.Bool
	var activity atomic.Int64

	processOnce(context.Background(), rdb, api.EnvConfig{}, "worker-B", post, silentLogger(), &stopping, &activity)

	if len(rdb.dlqEntries) != 1 {
		t.Fatalf("expected one DLQ entry, got %v", rdb.dlqEntries)
	}
	entry := rdb.dlqEntries[0]
	if entry.Reason != job.DLQReasonDropped {
		t.Fatalf("expected reason dropped, got %s", entry.Reason)
	}
	if entry.LastStatus == nil || *entry.LastStatus != 400 {
		t.Fatalf("expected lastStatus 400, got %v", entry.LastStatus)
	}
	if len(rdb.ackCalls) != 1 {
		t.Fatalf("expected ack after DLQ, got %v", rdb.ackCalls)
	}
}

func TestProcessOnce_DLQOnRetriesExhausted(t *testing.T) {
	rdb := &fakeQueueOps{movePayloads: []string{validRaw}}
	post := func(_ context.Context, _ api.EnvConfig, _ interface{}, _ string, _ *slog.Logger) api.Result {
		return api.Result{OK: false, Dropped: false, Attempts: 4, LastStatus: 503, ErrorMessage: "upstream"}
	}
	var stopping atomic.Bool
	var activity atomic.Int64

	processOnce(context.Background(), rdb, api.EnvConfig{}, "worker-C", post, silentLogger(), &stopping, &activity)

	if len(rdb.dlqEntries) != 1 {
		t.Fatalf("expected one DLQ entry, got %v", rdb.dlqEntries)
	}
	entry := rdb.dlqEntries[0]
	if entry.Reason != job.DLQReasonRetriesExhausted {
		t.Fatalf("expected reason retries_exhausted, got %s", entry.Reason)
	}
	if entry.Attempts != 4 {
		t.Fatalf("expected attempts 4, got %d", entry.Attempts)
	}
	if len(rdb.ackCalls) != 1 {
		t.Fatalf("expected ack after DLQ, got %v", rdb.ackCalls)
	}
}

func TestProcessOnce_DLQOnUnparseablePayload(t *testing.T) {
	rdb := &fakeQueueOps{movePayloads: []string{"not-json"}}
	post := func(_ context.Context, _ api.EnvConfig, _ interface{}, _ string, _ *slog.Logger) api.Result {
		t.Fatal("post should not be called for unparseable payloads")
		return api.Result{}
	}
	var stopping atomic.Bool
	var activity atomic.Int64

	processOnce(context.Background(), rdb, api.EnvConfig{}, "worker-D", post, silentLogger(), &stopping, &activity)

	if len(rdb.dlqEntries) != 1 {
		t.Fatalf("expected one DLQ entry, got %v", rdb.dlqEntries)
	}
	if rdb.dlqEntries[0].Reason != job.DLQReasonDropped {
		t.Fatalf("expected dropped reason, got %s", rdb.dlqEntries[0].Reason)
	}
	if len(rdb.ackCalls) != 1 {
		t.Fatalf("expected ack after DLQ, got %v", rdb.ackCalls)
	}
}

func TestProcessOnce_LeavesJobOnContextCancellation(t *testing.T) {
	rdb := &fakeQueueOps{movePayloads: []string{validRaw}}
	post := func(_ context.Context, _ api.EnvConfig, _ interface{}, _ string, _ *slog.Logger) api.Result {
		return api.Result{OK: false, Dropped: false, Attempts: 1, ErrorMessage: "timeout"}
	}

	ctx, cancel := context.WithCancel(context.Background())
	cancel()

	var stopping atomic.Bool
	stopping.Store(true)
	var activity atomic.Int64

	processOnce(ctx, rdb, api.EnvConfig{}, "worker-E", post, silentLogger(), &stopping, &activity)

	if len(rdb.dlqEntries) != 0 {
		t.Fatalf("expected no DLQ entry when shutting down with cancelled ctx, got %v", rdb.dlqEntries)
	}
	if len(rdb.ackCalls) != 0 {
		t.Fatalf("expected no ack when shutting down with cancelled ctx, got %v", rdb.ackCalls)
	}
}

func TestProcessOnce_RecoversFromDequeueErrorWithoutPanic(t *testing.T) {
	rdb := &fakeQueueOps{moveErr: errors.New("boom")}
	post := func(_ context.Context, _ api.EnvConfig, _ interface{}, _ string, _ *slog.Logger) api.Result {
		t.Fatal("post should not be called when dequeue fails")
		return api.Result{}
	}
	var stopping atomic.Bool
	var activity atomic.Int64

	// We can't realistically wait one second in unit tests, but we just
	// confirm the function returns without panicking.
	done := make(chan struct{})
	go func() {
		processOnce(context.Background(), rdb, api.EnvConfig{}, "worker-F", post, silentLogger(), &stopping, &activity)
		close(done)
	}()
	select {
	case <-done:
	case <-time.After(3 * time.Second):
		t.Fatal("processOnce hung on dequeue error")
	}

	if len(rdb.dlqEntries) != 0 || len(rdb.ackCalls) != 0 {
		t.Fatalf("expected no ack/DLQ on dequeue error, got dlq=%v ack=%v", rdb.dlqEntries, rdb.ackCalls)
	}
}

func TestProcessOnce_DLQAndAckOnPostPanic(t *testing.T) {
	rdb := &fakeQueueOps{movePayloads: []string{validRaw}}
	post := func(_ context.Context, _ api.EnvConfig, _ interface{}, _ string, _ *slog.Logger) api.Result {
		panic("boom")
	}
	var stopping atomic.Bool
	var activity atomic.Int64

	panicked := processOnce(context.Background(), rdb, api.EnvConfig{}, "worker-panic", post, silentLogger(), &stopping, &activity)

	if !panicked {
		t.Fatal("expected panicked=true")
	}
	if len(rdb.dlqEntries) != 1 {
		t.Fatalf("expected one DLQ entry, got %v", rdb.dlqEntries)
	}
	entry := rdb.dlqEntries[0]
	if entry.Reason != job.DLQReasonPanic {
		t.Fatalf("expected reason panic, got %s", entry.Reason)
	}
	if entry.ErrorMessage != "boom" {
		t.Fatalf("expected errorMessage boom, got %q", entry.ErrorMessage)
	}
	if len(rdb.ackCalls) != 1 || rdb.ackCalls[0] != validRaw {
		t.Fatalf("expected ack after panic DLQ, got %v", rdb.ackCalls)
	}
}

func TestRunJobLoop_ExitsAfterConsecutivePanics(t *testing.T) {
	const payloads = 6
	raws := make([]string, payloads)
	for i := range raws {
		raws[i] = validRaw
	}
	rdb := &fakeQueueOps{movePayloads: raws}
	post := func(_ context.Context, _ api.EnvConfig, _ interface{}, _ string, _ *slog.Logger) api.Result {
		panic("boom")
	}

	ctx, cancel := context.WithCancel(context.Background())
	defer cancel()

	var stopping atomic.Bool
	done := make(chan struct{})
	go func() {
		runJobLoopWithPost(ctx, rdb, api.EnvConfig{}, "worker-panic-storm", post, silentLogger(), &stopping)
		close(done)
	}()

	select {
	case <-done:
	case <-time.After(5 * time.Second):
		t.Fatal("RunJobLoop did not exit after consecutive panics")
	}

	if len(rdb.dlqEntries) != maxConsecutiveJobPanics {
		t.Fatalf("expected %d DLQ entries before exit, got %d", maxConsecutiveJobPanics, len(rdb.dlqEntries))
	}
	if len(rdb.ackCalls) != maxConsecutiveJobPanics {
		t.Fatalf("expected %d acks before exit, got %d", maxConsecutiveJobPanics, len(rdb.ackCalls))
	}
}
