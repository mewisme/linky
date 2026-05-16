import { randomUUID } from "node:crypto";
import { request as httpRequest } from "node:http";

import {
  buildInternalWorkerHeaders,
  INTERNAL_WORKER_JOBS_PATH,
  internalWorkerJobUrl,
  parseInternalWorkerErrorBody,
  sha256Hex,
  type InternalWorkerRuntimeEnv,
} from "@ws/worker-api";

import type { Logger } from "@ws/logger";

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

type JsonResponse = { status: number; body: string };

async function postJson(
  env: InternalWorkerRuntimeEnv,
  body: string,
  headers: Record<string, string>,
  signal: AbortSignal,
): Promise<JsonResponse> {
  if (env.internalApiSocketPath) {
    return new Promise<JsonResponse>((resolve, reject) => {
      const req = httpRequest(
        {
          socketPath: env.internalApiSocketPath,
          method: "POST",
          path: INTERNAL_WORKER_JOBS_PATH,
          headers: { ...headers, "content-length": Buffer.byteLength(body).toString() },
        },
        (res) => {
          const chunks: Buffer[] = [];
          res.on("data", (chunk: Buffer) => chunks.push(chunk));
          res.on("end", () => {
            resolve({
              status: res.statusCode ?? 0,
              body: Buffer.concat(chunks).toString("utf8"),
            });
          });
          res.on("error", reject);
        },
      );
      req.on("error", reject);
      const onAbort = (): void => {
        req.destroy(new Error("aborted"));
      };
      signal.addEventListener("abort", onAbort, { once: true });
      req.once("close", () => signal.removeEventListener("abort", onAbort));
      req.write(body);
      req.end();
    });
  }

  if (!env.internalApiBaseUrl) {
    throw new Error("INTERNAL_API_BASE_URL or INTERNAL_API_SOCKET_PATH must be set");
  }

  const response = await fetch(internalWorkerJobUrl(env.internalApiBaseUrl), {
    method: "POST",
    headers,
    body,
    signal,
  });
  return { status: response.status, body: await response.text() };
}

export async function postEnvelopeToInternalApi(
  env: InternalWorkerRuntimeEnv,
  envelope: unknown,
  rawRedisPayload: string,
  logger: Logger,
): Promise<{ ok: true } | { ok: false; dropped: boolean }> {
  const body = JSON.stringify(envelope);
  const idempotencyKey = sha256Hex(rawRedisPayload);
  const requestId = randomUUID();
  const headers = buildInternalWorkerHeaders({ idempotencyKey, requestId });

  for (let attempt = 0; attempt <= env.internalApiMaxRetries; attempt++) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), env.internalApiTimeoutMs);
    try {
      const response = await postJson(env, body, headers, controller.signal);
      clearTimeout(timer);

      if (response.status === 204 || response.status === 200) {
        return { ok: true };
      }

      const text = response.body;
      const parsedErr = parseInternalWorkerErrorBody(text);

      if (response.status === 400 || response.status === 401 || response.status === 409) {
        logger.error(
          "internal API rejected job status=%d requestId=%s body=%s",
          response.status,
          requestId,
          parsedErr ? `${parsedErr.error}: ${parsedErr.message}` : text,
        );
        return { ok: false, dropped: true };
      }

      logger.warn(
        "internal API transient failure status=%d attempt=%d requestId=%s",
        response.status,
        attempt,
        requestId,
      );

      if (attempt >= env.internalApiMaxRetries) {
        logger.error(
          "internal API gave up status=%d requestId=%s",
          response.status,
          requestId,
        );
        return { ok: false, dropped: false };
      }
    } catch (error: unknown) {
      clearTimeout(timer);
      const err = error instanceof Error ? error : new Error(String(error));
      logger.warn(
        err,
        "internal API transport error attempt=%d requestId=%s",
        attempt,
        requestId,
      );
      if (attempt >= env.internalApiMaxRetries) {
        logger.error(err, "internal API transport gave up requestId=%s", requestId);
        return { ok: false, dropped: false };
      }
    }

    const delay = env.internalApiRetryBaseDelayMs * Math.pow(2, attempt);
    await sleep(delay);
  }

  return { ok: false, dropped: false };
}
