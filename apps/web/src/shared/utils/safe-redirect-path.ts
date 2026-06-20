function isSafeRelativePath(path: string): boolean {
  return (
    path.startsWith("/") && !path.startsWith("//") && !path.startsWith("/\\")
  );
}

export function safeRedirectPath(redirect: string | null | undefined): string {
  if (!redirect) return "/";

  try {
    const url = new URL(redirect);
    if (
      typeof window !== "undefined" &&
      url.origin === window.location.origin
    ) {
      return url.pathname + url.search;
    }
    return "/";
  } catch {
    return isSafeRelativePath(redirect) ? redirect : "/";
  }
}
