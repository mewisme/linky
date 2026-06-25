package user

import (
	"context"

	"linky-api/src/internal/infra/supax"
)

// Deprecated: use MatchPublicInfo instead.
func PublicInfo(ctx context.Context, userID string) map[string]any {
	return supax.PublicUserInfoByUserID(ctx, userID)
}

func MatchPublicInfo(ctx context.Context, peerUserID, myUserID string) (peerInfo, myInfo map[string]any) {
	return supax.PublicUserInfoByUserID(ctx, peerUserID), supax.PublicUserInfoByUserID(ctx, myUserID)
}
