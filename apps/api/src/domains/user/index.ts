export { default as usersRouter } from "./http/users.route.js";
export { default as userDetailsRouter } from "./http/user-details.route.js";
export { default as userSettingsRouter } from "./http/user-settings.route.js";
export { default as userLevelRouter } from "./http/user-level.route.js";
export { default as userStreakRouter } from "./http/user-streak.route.js";

export type { UpdateUserCountryBody, UserUpdate } from "./types/user.types.js";
export type { InterestTagsBody, UserDetailsUpdate } from "./types/user-details.types.js";
export type { UserSettingsUpdate } from "./types/user-settings.types.js";

export {
  addCallExp,
  getUserLevelData,
  calculateLevelFromExp,
} from "./service/user-level.service.js";
export {
  addCallDurationToStreak,
  getUserStreakData,
  getUserStreakHistory,
} from "./service/user-streak.service.js";

export type { UserLevel, LevelCalculationParams } from "./types/user-level.types.js";
export type { UserStreak, UserStreakDay } from "./types/user-streak.types.js";

