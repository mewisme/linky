package callfavorite

import (
	"context"

	"linky-api/src/internal/domains/matchmaking"
	"linky-api/src/internal/infra/expbonus"
	"linky-api/src/internal/infra/supax"
)

func Relation(ctx context.Context, userID, counterpartID string) (string, error) {
	if userID == "" || counterpartID == "" {
		return "", nil
	}
	favA, err := supax.GetFavoritesByUserID(ctx, userID)
	if err != nil {
		return "", err
	}
	favB, err := supax.GetFavoritesByUserID(ctx, counterpartID)
	if err != nil {
		return "", err
	}
	ft := matchmaking.ResolveFavoriteType(
		matchmaking.StringSetFromSlice(favA),
		matchmaking.StringSetFromSlice(favB),
		userID,
		counterpartID,
	)
	return expbonus.RelationForCallFavorite(string(ft)), nil
}
