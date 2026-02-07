export { MatchmakingService } from "./service/matchmaking.service.js";
export { findBestMatch } from "./service/matcher.service.js";
export { RedisMatchStateStore, MemoryMatchStateStore } from "./store/index.js";
export type { MatchStateStore } from "./store/index.js";

export type { FavoriteType } from "./types/scoring.types.js";
export type { QueueUser, MatchOptions, MatchResult, ScoredCandidatePair } from "./types/candidate.types.js";
export type { QueuedUser, SkipRecord } from "./types/matchmaking.types.js";

