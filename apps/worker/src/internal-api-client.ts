import { randomUUID } from "node:crypto";

import {
  buildInternalWorkerAuthHeaders,
  internalWorkerJobUrl,
  parseInternalWorkerErrorBody,
  sha256Hex,
  type InternalWorkerJobRoute,
  type InternalWorkerRuntimeEnv,
} from "@ws/internal-worker-api";

import type { Logger } from "@ws/logger";

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function postEnvelopeToInternalApi(
  env: InternalWorkerRuntimeEnv,
  route: InternalWorkerJobRoute,
  envelope: unknown,
  rawRedisPayload: string,
  logger: Logger,
  queueLabel: string,
): Promise<{ ok: true } | { ok: false; dropped: boolean }> {
  const url = internalWorkerJobUrl(env.internalApiBaseUrl, route);
  const body = JSON.stringify(envelope);
  const idempotencyKey = sha256Hex(rawRedisPayload);
  const timeoutMs =
    route === "ai-jobs" ? env.internalApiTimeoutMsAi : env.internalApiTimeoutMsGeneral;
  const requestId = randomUUID();

  for (let attempt = 0; attempt <= env.internalApiMaxRetries; attempt++) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    try {
      const response = await fetch(url, {
        method: "POST",
        headers: buildInternalWorkerAuthHeaders(env.internalWorkerSecret, {
          idempotencyKey,
          requestId,
        }),
        body,
        signal: controller.signal,
      });
      clearTimeout(timer);

      if (response.status === 204 || response.status === 200) {
        return { ok: true };
      }

      const text = await response.text();
      const parsedErr = parseInternalWorkerErrorBody(text);

      if (response.status === 400 || response.status === 401 || response.status === 409) {
        logger.error(
          "internal API rejected job queue=%s status=%d requestId=%s body=%s",
          queueLabel,
          response.status,
          requestId,
          parsedErr ? `${parsedErr.error}: ${parsedErr.message}` : text,
        );
        return { ok: false, dropped: true };
      }

      logger.warn(
        "internal API transient failure queue=%s status=%d attempt=%d requestId=%s",
        queueLabel,
        response.status,
        attempt,
        requestId,
      );

      if (attempt >= env.internalApiMaxRetries) {
        logger.error(
          "internal API gave up queue=%s status=%d requestId=%s",
          queueLabel,
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
        "internal API transport error queue=%s attempt=%d requestId=%s",
        queueLabel,
        attempt,
        requestId,
      );
      if (attempt >= env.internalApiMaxRetries) {
        logger.error(err, "internal API transport gave up queue=%s requestId=%s", queueLabel, requestId);
        return { ok: false, dropped: false };
      }
    }

    const delay =
      env.internalApiRetryBaseDelayMs * Math.pow(2, attempt);
    await sleep(delay);
  }

  return { ok: false, dropped: false };
}
