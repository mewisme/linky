import { apiUrl } from "./api-url";

interface FetchOptions extends RequestInit {
  token?: string;
}

export interface DataOptions extends Omit<FetchOptions, "body"> {
  body?: unknown;
}

async function request<T>(
  method: string,
  url: string,
  options: DataOptions = {},
  allowEmpty = false
): Promise<T> {
  const headers: Record<string, string> = {
    ...(options.headers as Record<string, string>),
    Authorization: options.token ? `Bearer ${options.token}` : "",
    "Content-Type": "application/json",
  };
  const body = options.body !== undefined ? JSON.stringify(options.body) : undefined;
  const response = await fetch(url, { ...options, method, headers, body });
  if (!response.ok) {
    throw new Error((await response.text()) || response.statusText);
  }
  const text = await response.text();
  if (!text) {
    if (allowEmpty) return undefined as T;
    throw new Error("Unexpected empty response");
  }
  return JSON.parse(text) as T;
}

export async function fetchData<T>(url: string, options: FetchOptions = {}): Promise<T> {
  return request<T>("GET", url, options as DataOptions);
}

export async function postData<T>(url: string, options: DataOptions = {}): Promise<T> {
  return request<T>("POST", url, options);
}

export async function putData<T>(url: string, options: DataOptions = {}): Promise<T> {
  return request<T>("PUT", url, options);
}

export async function patchData<T>(url: string, options: DataOptions = {}): Promise<T> {
  return request<T>("PATCH", url, options);
}

export async function deleteData<T>(url: string, options: DataOptions = {}): Promise<T> {
  return request<T>("DELETE", url, options, true);
}

export async function getMe(token: string | null): Promise<import("@/entities/user/model/user-store").User> {
  return fetchData<import("@/entities/user/model/user-store").User>(apiUrl.users.me(), {
    token: token ?? undefined,
  });
}
