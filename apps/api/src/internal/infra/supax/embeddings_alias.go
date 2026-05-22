package supax

import emb "linky-api/src/internal/infra/supax/embeddings"

var (
	UpsertUserEmbedding = emb.UpsertUser
	ListUserEmbeddings  = emb.ListByUserIDs
)
