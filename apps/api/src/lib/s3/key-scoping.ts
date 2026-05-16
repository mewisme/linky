const USER_KEY_PREFIX = "users/";
const MAX_KEY_LENGTH = 1024;

export function buildUserKeyPrefix(userId: string): string {
  return `${USER_KEY_PREFIX}${userId}/`;
}

export function isValidUserKey(key: unknown, userId: string): key is string {
  if (typeof key !== "string" || key.length === 0 || key.length > MAX_KEY_LENGTH) return false;
  if (key.includes("\0")) return false;
  if (containsTraversal(key)) return false;

  let decoded: string;
  try {
    decoded = decodeURIComponent(key);
  } catch {
    return false;
  }
  if (containsTraversal(decoded)) return false;

  return decoded.startsWith(buildUserKeyPrefix(userId));
}

function containsTraversal(value: string): boolean {
  if (value.includes("\\")) return true;
  if (value.startsWith("/")) return true;
  if (value === ".." || value.startsWith("../") || value.endsWith("/..")) return true;
  if (value.includes("/../")) return true;
  return false;
}
