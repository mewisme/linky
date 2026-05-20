package expbonus

import "testing"

func TestRelationForCallFavorite(t *testing.T) {
	if got := RelationForCallFavorite(CallFavoriteMutual); got != RelationMutual {
		t.Fatalf("mutual: %q", got)
	}
	if got := RelationForCallFavorite(CallFavoriteOneWay); got != RelationOneWay {
		t.Fatalf("one-way: %q", got)
	}
	if got := RelationForCallFavorite("none"); got != "" {
		t.Fatalf("none: %q", got)
	}
}
