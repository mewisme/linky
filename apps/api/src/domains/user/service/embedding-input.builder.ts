import type { Tables } from "../../../types/database/supabase.types.js";

type UserDetailsExpanded = {
  bio: string | null;
  date_of_birth: string | null;
  gender: string | null;
  interest_tags: unknown;
};

type EmbeddingInputState = {
  user: Pick<Tables<"users">, "country">;
  details: UserDetailsExpanded | null;
  favoriteUserIds: string[];
};

function normalizeText(value: string | null | undefined): string {
  if (value == null || typeof value !== "string") {
    return "";
  }
  return value.trim().toLowerCase();
}

function normalizeDate(value: string | null | undefined): string {
  if (value == null || typeof value !== "string") {
    return "";
  }
  const trimmed = value.trim();
  if (!trimmed) return "";
  try {
    const d = new Date(trimmed);
    return Number.isNaN(d.getTime()) ? "" : d.toISOString().split("T")[0] ?? "";
  } catch {
    return "";
  }
}

function extractInterestTagNames(interestTags: unknown): string[] {
  if (!Array.isArray(interestTags)) {
    return [];
  }
  const names: string[] = [];
  for (const item of interestTags) {
    if (item && typeof item === "object" && "name" in item && typeof (item as { name: unknown }).name === "string") {
      names.push((item as { name: string }).name);
    }
  }
  return names;
}

function normalizeStrings(values: string[]): string[] {
  return values
    .map((v) => normalizeText(v))
    .filter((v) => v.length > 0)
    .sort();
}

function normalizeFavoriteIds(ids: string[]): string[] {
  return [...ids]
    .filter((id) => typeof id === "string" && id.trim().length > 0)
    .map((id) => id.trim().toLowerCase())
    .sort();
}

export function buildEmbeddingInput(state: EmbeddingInputState): string {
  const parts: string[] = [];

  parts.push("country", normalizeText(state.user.country ?? ""));

  const details = state.details;
  if (details) {
    parts.push("bio", normalizeText(details.bio));
    parts.push("date_of_birth", normalizeDate(details.date_of_birth));
    parts.push("gender", normalizeText(details.gender));
    const tagNames = extractInterestTagNames(details.interest_tags);
    parts.push("interest_tags", normalizeStrings(tagNames).join(","));
  } else {
    parts.push("bio", "");
    parts.push("date_of_birth", "");
    parts.push("gender", "");
    parts.push("interest_tags", "");
  }

  const favIds = normalizeFavoriteIds(state.favoriteUserIds);
  parts.push("favorites", favIds.join(","));

  return parts.join("\n");
}
