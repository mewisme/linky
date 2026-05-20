import * as Sentry from "@sentry/nextjs";
import { auth } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";

import { fetchWithApiFallback } from "@/lib/http/fetch-with-api-fallback";

type ProxyMethod = "GET" | "POST" | "PUT" | "PATCH" | "DELETE";

interface ProxyToBackendOptions {
  request: NextRequest;
  url: string;
  method: ProxyMethod;
  logLabel: string;
}

export async function proxyToBackend({
  request,
  url,
  method,
  logLabel,
}: ProxyToBackendOptions): Promise<NextResponse> {
  const startedAt = Date.now();
  try {
    let authToken: string | null = null;
    const authHeader = request.headers.get("authorization");
    if (authHeader) {
      authToken = authHeader.replace(/^Bearer\s+/i, "");
    } else {
      try {
        const { getToken } = await auth({ acceptsToken: "any" });
        authToken = await getToken();
      } catch {
        Sentry.logger.warn("proxyToBackend: failed to retrieve Clerk token", { logLabel });
      }
    }

    const headers: Record<string, string> = { "Content-Type": "application/json" };
    if (authToken) headers["Authorization"] = `Bearer ${authToken}`;

    const init: RequestInit = { method, headers, cache: "no-store" };
    if (method !== "GET") {
      const body = await request.text();
      if (body) init.body = body;
    }

    const response = await fetchWithApiFallback(url, init);
    const elapsed = Date.now() - startedAt;
    if (!response.ok) {
      Sentry.logger.warn("proxyToBackend: upstream non-OK", {
        logLabel,
        url,
        status: response.status,
        elapsedMs: elapsed,
        hasToken: Boolean(authToken),
      });
    }
    const text = await response.text();
    if (!text) {
      return new NextResponse(null, { status: response.status });
    }
    try {
      const data = JSON.parse(text);
      return NextResponse.json(data, { status: response.status });
    } catch {
      return new NextResponse(text, {
        status: response.status,
        headers: {
          "Content-Type": response.headers.get("content-type") ?? "text/plain",
        },
      });
    }
  } catch (error) {
    Sentry.logger.error(logLabel, {
      error,
      url,
      elapsedMs: Date.now() - startedAt,
    });
    return NextResponse.json(
      { error: "Internal Server Error", message: "Proxy request failed" },
      { status: 500 },
    );
  }
}
