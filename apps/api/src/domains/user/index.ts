export { default as usersRouter } from "./http/users.route.js";
export { default as userDetailsRouter } from "./http/user-details.route.js";
export { default as userSettingsRouter } from "./http/user-settings.route.js";

export type { UpdateUserCountryBody, UserUpdate } from "./types/user.types.js";
export type { InterestTagsBody, UserDetailsUpdate } from "./types/user-details.types.js";
export type { UserSettingsUpdate } from "./types/user-settings.types.js";

