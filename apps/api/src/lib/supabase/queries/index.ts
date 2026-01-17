// Export all user-related queries
export * from "./users.js";

// Export all visitor and page view related queries
export * from "./visitors.js";

// Export all user-details related queries
export * from "./user-details.js";

// Export all user-settings related queries
export * from "./user-settings.js";

// Export all interest-tags related queries (excluding getInterestTags to avoid conflict)
export {
  getInterestTagsByIds,
  getInterestTagById,
  createInterestTag,
  updateInterestTag,
  deleteInterestTag,
  deleteInterestTagHard,
  type GetInterestTagsOptions,
} from "./interest-tags.js";
// Re-export getInterestTags from interest-tags with a different name to avoid conflict
export { getInterestTags as getAllInterestTags } from "./interest-tags.js";

// Export all changelogs related queries
export * from "./changelogs.js";

// Export all reports related queries
export * from "./reports.js";