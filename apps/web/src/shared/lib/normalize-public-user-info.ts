import type { UsersAPI } from '@/entities/user/types/users.types';

function asString(v: unknown): string | null {
  return typeof v === 'string' && v.length > 0 ? v : null;
}

export function normalizePublicUserInfo(raw: unknown): UsersAPI.PublicUserInfo | null {
  if (!raw || typeof raw !== 'object') return null;
  const r = raw as Record<string, unknown>;
  const id = asString(r.id) ?? asString(r.userId);
  if (!id) return null;

  const interestTags = Array.isArray(r.interest_tags) ? (r.interest_tags as UsersAPI.UserDetails.InterestTag[]) : null;

  return {
    id,
    avatar_url: asString(r.avatar_url) ?? asString(r.userImageUrl),
    first_name: asString(r.first_name) ?? splitDisplayName(r.displayName).first,
    last_name: asString(r.last_name) ?? splitDisplayName(r.displayName).last,
    date_of_birth: asString(r.date_of_birth),
    gender: asString(r.gender),
    bio: asString(r.bio),
    interest_tags: interestTags,
  };
}

function splitDisplayName(displayName: unknown): { first: string | null; last: string | null } {
  if (typeof displayName !== 'string') return { first: null, last: null };
  const trimmed = displayName.trim();
  if (!trimmed) return { first: null, last: null };
  const parts = trimmed.split(/\s+/);
  if (parts.length === 1) return { first: parts[0] ?? null, last: null };
  return { first: parts[0] ?? null, last: parts.slice(1).join(' ') || null };
}
