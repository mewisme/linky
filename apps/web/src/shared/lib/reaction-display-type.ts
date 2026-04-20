export const PARTY_REACTION_EMOJI = "🎉";

export function normalizeReactionDisplayType(type: string): string {
  if (type === "party") return PARTY_REACTION_EMOJI;
  return type;
}
