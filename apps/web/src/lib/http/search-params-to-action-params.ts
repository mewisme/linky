import type { ServerActionQueryParams } from "@/lib/http/query-params";

export function searchParamsToActionParams(searchParams: URLSearchParams): ServerActionQueryParams {
  const params: ServerActionQueryParams = {};
  for (const [key, value] of searchParams.entries()) {
    params[key] = value;
  }
  return params;
}
