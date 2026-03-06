# 06 -- Embedding System

## Purpose

This document describes the semantic profile embedding system used for intelligent matchmaking, including the embedding generation pipeline, Ollama integration, vector storage, similarity computation, and regeneration triggers.

## Scope

Covers the embedding infrastructure (Ollama), embedding input construction, vector storage in Supabase (pgvector), similarity computation, and the admin embedding management tools.

## Dependencies

- [02-architecture.md](02-architecture.md) for infrastructure layer
- [05-matchmaking.md](05-matchmaking.md) for how embeddings are used in scoring

## Cross References

- [09-admin-system.md](09-admin-system.md) for admin embedding management endpoints
- [12-database-schema.md](12-database-schema.md) for `user_embeddings` table

---

## 1. Architecture Overview

```
User Profile Change
  │
  ▼
scheduleEmbeddingRegeneration(userId)
  │ (setImmediate, non-blocking)
  ▼
runEmbeddingJob(userId)
  │
  ├── Fetch user profile aggregate (bio, gender, DOB, interest tags)
  ├── Build semantic input string (buildEmbeddingInput)
  ├── Compute SHA-256 hash of input
  ├── Compare with stored source_hash
  │    └── If unchanged → skip regeneration
  │
  ├── Call Ollama API (embedText)
  │    └── Model: nomic-embed-text:v1.5
  │    └── Timeout: OLLAMA_EMBEDDING_TIMEOUT (default 60s)
  │
  └── Upsert embedding vector + model name + source_hash
       └── Table: user_embeddings
```

---

## 2. Embedding Input Construction

Location: `apps/api/src/domains/user/service/embedding-input.builder.ts`

### 2.1 Input Format

The semantic profile is constructed from four fields:

```
bio\n{normalized bio text}
gender\n{normalized gender}
age_bucket\n{derived age bucket}
interest_tags\n{sorted, normalized, comma-separated tags}
```

### 2.2 Normalization Rules

- All text values are trimmed and lowercased
- Interest tag names are sorted alphabetically after normalization
- Empty/null values produce empty strings
- If all fields are empty, the resulting input string is empty

### 2.3 Age Bucket Derivation

The `deriveAgeBucket()` function (in `apps/api/src/logic/age-bucket-from-dob.ts`) converts a date of birth to a categorical age range, providing privacy while retaining semantic signal for matching.

### 2.4 Source Hash

A SHA-256 hash of the complete input string is computed and stored alongside the embedding. This enables efficient change detection without recomputing the embedding.

---

## 3. Ollama Integration

Location: `apps/api/src/infra/ollama/embedding.service.ts`

### 3.1 Model

- Model: `nomic-embed-text:v1.5`
- Hosted on self-managed Ollama instance
- Docker image: `mewthedev/ollama-nomic-1.5:latest`

### 3.2 API Call

```typescript
ollama.embed({ model: "nomic-embed-text:v1.5", input: text })
```

### 3.3 Timeout Handling

A custom timeout wrapper races the Ollama API call against a timer:
- Default timeout: 60,000ms (configurable via `OLLAMA_EMBEDDING_TIMEOUT`)
- On timeout: logs error, returns `null`
- On empty/invalid response: logs warning, returns `null`

### 3.4 Result

Returns `{ embedding: number[], modelName: string }` or `null` on failure.

### 3.5 Failure Handling

Embedding generation failures are non-fatal:
- The embedding job catches all errors and logs them
- Users without embeddings can still be matched (embedding score contributes 0)
- The system degrades gracefully to interest-tag-only scoring

---

## 4. Vector Storage

### 4.1 Table: user_embeddings

| Column | Type | Description |
|--------|------|-------------|
| `id` | uuid | Primary key |
| `user_id` | text | Foreign key to users table |
| `embedding` | vector | pgvector column storing the embedding |
| `model_name` | text | Model identifier (e.g., "nomic-embed-text:v1.5") |
| `source_hash` | text | SHA-256 of the input text used to generate the embedding |
| `created_at` | timestamp | Creation timestamp |
| `updated_at` | timestamp | Last update timestamp |

### 4.2 Operations

| Operation | Description |
|-----------|-------------|
| `getUserEmbeddingByUserId(userId)` | Fetch single user's embedding |
| `getUserEmbeddingsMap(userIds)` | Batch fetch embeddings for multiple users (used in matchmaking) |
| `upsertUserEmbedding(userId, embedding, modelName, sourceHash)` | Insert or update embedding |
| `find_similar_users_by_embedding` (RPC) | pgvector similarity search for admin tools |

---

## 5. Similarity Computation

### 5.1 Cosine Similarity

Location: `apps/api/src/domains/embeddings/service/cosine-similarity.service.ts`

```
cosineSimilarity(a, b):
  dotProduct = sum(a[i] * b[i])
  normA = sqrt(sum(a[i]^2))
  normB = sqrt(sum(b[i]^2))
  if magnitude == 0: return 0
  return clamp(dotProduct / (normA * normB), -1, 1)
```

Input validation:
- Both must be non-empty arrays of numbers
- Both must have the same length
- No NaN values allowed

### 5.2 Batch Computation in Matchmaking

Location: `apps/api/src/domains/matchmaking/service/embedding-score.service.ts`

During the match cycle:
1. All queue user embeddings are loaded from Supabase
2. Pairwise embedding pairs are constructed
3. `calculateEmbeddingSimilarities()` computes cosine similarity for each pair
4. Results are stored in a `Map<pairKey, similarity>` where `pairKey` sorts user IDs

---

## 6. Regeneration Triggers

### 6.1 Automatic Triggers

Embedding regeneration is scheduled (via `setImmediate`) when:
- User updates their bio
- User updates their gender or date of birth
- User modifies their interest tags
- Admin triggers manual sync

### 6.2 Change Detection

Before generating a new embedding:
1. Current profile is fetched
2. Input string is built
3. SHA-256 hash is computed
4. Hash is compared with stored `source_hash`
5. If identical, regeneration is skipped (no Ollama call)

### 6.3 Admin Sync Operations

- `POST /api/v1/admin/embeddings/sync` -- Sync single user's embedding
- `POST /api/v1/admin/embeddings/sync-all` -- Regenerate all user embeddings
- `POST /api/v1/admin/embeddings/compare` -- Compare two users' embeddings
- `POST /api/v1/admin/embeddings/similar` -- Find similar users by embedding (pgvector)

---

## Related Components

- Matchmaking scoring: [05-matchmaking.md](05-matchmaking.md)
- User profile data: [12-database-schema.md](12-database-schema.md)
- Admin management: [09-admin-system.md](09-admin-system.md)

## Risk Considerations

- Ollama runs as a separate Docker container; outage means no embedding regeneration (existing embeddings continue to work)
- nomic-embed-text:v1.5 model requires memory/GPU resources; scaling depends on Ollama instance capacity
- Embedding dimension is determined by the model and stored as variable-length vector in pgvector
- Source hash comparison uses SHA-256 which is computationally inexpensive but adds a database read per regeneration check
- Batch embedding fetch during matchmaking loads all candidate embeddings from Supabase on each cycle (no Redis caching for embeddings)
- The `sync-all` admin operation can be expensive for large user bases
