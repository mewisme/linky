import { deriveAgeBucket } from "@/logic/age-bucket-from-dob.js";

export type SemanticProfileInput = {
  bio: string | null;
  interest_tag_names: string[];
  gender: string | null;
  date_of_birth: string | null;
};

function normalizeText(value: string | null | undefined): string {
  if (value == null || typeof value !== "string") {
    return "";
  }
  return value.trim().toLowerCase();
}

function normalizeStrings(values: string[]): string[] {
  return values
    .map((v) => normalizeText(v))
    .filter((v) => v.length > 0)
    .sort();
}

export function buildEmbeddingInput(input: SemanticProfileInput): string {
  const parts: string[] = [];

  parts.push("bio", normalizeText(input.bio));
  parts.push("gender", normalizeText(input.gender));
  parts.push("age_bucket", deriveAgeBucket(input.date_of_birth));
  parts.push("interest_tags", normalizeStrings(input.interest_tag_names ?? []).join(","));

  const joined = parts.join("\n");
  const hasContent = parts.some((_, i) => i % 2 === 1 && (parts[i] ?? "").length > 0);
  return hasContent ? joined : "";
}
