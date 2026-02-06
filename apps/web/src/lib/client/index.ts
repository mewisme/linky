import type { User } from "@/stores/user-store";

const getBase = () => (typeof window !== "undefined" ? window.location.origin : "");

function buildUrl(
  url: string,
  params?: Record<string, string | number | boolean | undefined>
): string {
  let s = url.startsWith("http") ? url : getBase() + url;
  if (params && Object.keys(params).length > 0) {
    const q = new URLSearchParams();
    for (const [k, v] of Object.entries(params)) if (v != null) q.set(k, String(v));
    const qs = q.toString();
    s += (s.includes("?") ? "&" : "?") + qs;
  }
  return s;
}

async function req<T>(
  method: string,
  url: string,
  opts?: {
    params?: Record<string, string | number | boolean | undefined>;
    headers?: Record<string, string>;
    body?: unknown;
  }
): Promise<T> {
  const u = buildUrl(url, opts?.params);
  const headers = { ...opts?.headers };
  if (
    opts?.body !== undefined &&
    opts?.body !== null &&
    !(opts.body instanceof FormData) &&
    typeof opts.body === "object"
  ) {
    if (!headers["Content-Type"]) headers["Content-Type"] = "application/json";
  }
  const body =
    opts?.body === undefined
      ? undefined
      : opts.body instanceof FormData || typeof opts.body === "string"
        ? opts.body
        : JSON.stringify(opts.body);
  const res = await fetch(u, { method, headers, body });
  if (!res.ok) {
    const t = await res.text();
    throw new Error(t || res.statusText);
  }
  const text = await res.text();
  if (!text) return undefined as T;
  return JSON.parse(text) as T;
}

export const client = {
  get: <T>(
    url: string,
    cfg?: {
      params?: Record<string, string | number | boolean | undefined>;
      headers?: Record<string, string>;
    }
  ) => req<T>("GET", url, cfg),
  post: <T>(url: string, body?: unknown, cfg?: { headers?: Record<string, string> }) =>
    req<T>("POST", url, { ...cfg, body }),
  put: <T>(url: string, body?: unknown, cfg?: { headers?: Record<string, string> }) =>
    req<T>("PUT", url, { ...cfg, body }),
  patch: <T>(url: string, body?: unknown, cfg?: { headers?: Record<string, string> }) =>
    req<T>("PATCH", url, { ...cfg, body }),
  delete: <T>(url: string, cfg?: { headers?: Record<string, string>; body?: unknown }) =>
    req<T>("DELETE", url, cfg),
};

export const getMe = async (token: string | null): Promise<User> => {
  const data = await client.get<User>("/api/users/me", {
    headers: { Authorization: `Bearer ${token}` },
  });
  return data;
};
