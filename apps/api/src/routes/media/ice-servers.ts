import { Router, type Request, type Response, type Router as ExpressRouter } from "express";
import { config } from "@/config/index.js";
import { um } from "@/lib/api-user-message.js";
import { sendJsonError } from "@/lib/http-json-response.js";
import { createLogger } from "@/utils/logger.js";
import { toLoggableError } from "@/utils/to-loggable-error.js";
import type { CloudflareTurnResponse } from "@/domains/video-chat/types/call.types.js";

const router: ExpressRouter = Router();
const logger = createLogger("routes:media:ice-servers");

router.get("/ice-servers", async (_req: Request, res: Response) => {
  try {
    const apiToken = config.cloudflareTurnApiToken;
    const keyId = config.cloudflareTurnKeyId;

    if (!apiToken || !keyId) {
      logger.error("Cloudflare TURN credentials not configured");
      return sendJsonError(
        res,
        500,
        "ICE server configuration not available",
        um("ICE_SERVER_CONFIG", "serverConfigError", "Server configuration error"),
      );
    }

    const url = `https://rtc.live.cloudflare.com/v1/turn/keys/${keyId}/credentials/generate-ice-servers`;

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000);

    try {
      const response = await fetch(url, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ ttl: 300 }),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        const errorText = await response.text();
        logger.error("Cloudflare TURN API error: %d, %s", response.status, errorText);
        return sendJsonError(
          res,
          response.status,
          "Failed to fetch ICE servers",
          um("EXTERNAL_API_ERROR", "externalApiError", "External API error"),
        );
      }

      const data = (await response.json()) as CloudflareTurnResponse;

      res.json(data);
    } catch (fetchError: unknown) {
      clearTimeout(timeoutId);

      if (fetchError instanceof Error && fetchError.name === "AbortError") {
        logger.error(toLoggableError(fetchError), "ICE servers request timeout");
        return sendJsonError(
          res,
          504,
          "Request timeout",
          um("ICE_REQUEST_TIMEOUT", "iceRequestTimeout", "ICE server request timed out"),
        );
      }

      throw fetchError;
    }
  } catch (error: unknown) {
    logger.error(toLoggableError(error), "Error fetching ICE servers");
    sendJsonError(
      res,
      500,
      "Internal server error",
      um("FAILED_FETCH_ICE", "failedFetchIceServers", "Failed to fetch ICE servers"),
    );
  }
});

export default router;
