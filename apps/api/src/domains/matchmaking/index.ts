export { RedisMatchmakingService } from "./service/redis-matchmaking.service.js";
export { findBestMatch } from "./service/matcher.service.js";

export type { FavoriteType } from "./types/scoring.types.js";
export type { QueueUser, MatchOptions, MatchResult, ScoredCandidatePair } from "./types/candidate.types.js";
export type { QueuedUser, SkipRecord } from "./types/matchmaking.types.js";

