package clerkadmin

import (
	"context"
	"errors"
	"testing"
)

func TestRequireAdminActorEmpty(t *testing.T) {
	t.Parallel()
	if err := requireAdminActor(context.Background(), ""); !errors.Is(err, ErrActorRequired) {
		t.Fatalf("got %v, want ErrActorRequired", err)
	}
}
