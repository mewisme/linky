package resolver

import (
	"context"
	"errors"

	"linky-api/src/internal/app/admin"
	"linky-api/src/internal/app/graphql/generated"
	"linky-api/src/internal/app/graphql/gqlx"
	"linky-api/src/internal/app/user"
)

func (r *viewerMutationResolver) mutateInterestTags(ctx context.Context, mode string, tagIDs []string) (any, error) {
	uid, err := gqlx.RequireInternalUser(ctx)
	if err != nil {
		return nil, gqlx.AsGraphQLError(err)
	}
	out, err := user.MutateInterestTags(ctx, uid, mode, tagIDs)
	if err != nil {
		if errors.Is(err, user.ErrTagIDsNonEmpty) {
			return nil, gqlx.ErrBadRequest("TAG_IDS_NON_EMPTY", "tagIdsNonEmpty", "tagIds must be a non-empty array")
		}
		if errors.Is(err, user.ErrTagIDsArray) {
			return nil, gqlx.ErrBadRequest("TAG_IDS_ARRAY", "tagIdsArray", "tagIds must be an array")
		}
		return nil, gqlx.MapDetailsValidation(err)
	}
	return out, nil
}

func toAsyncJobResult(r *admin.AsyncJobResult) *generated.AsyncJobResult {
	if r == nil {
		return nil
	}
	out := &generated.AsyncJobResult{Queued: r.Queued}
	if r.Enqueued != nil {
		out.Enqueued = r.Enqueued
	}
	if r.Scheduled != nil {
		out.Scheduled = r.Scheduled
	}
	return out
}
