import { Router, type Request, type Response, type Router as ExpressRouter } from "express";
import { config } from "@/config/index.js";
import { createLogger } from "@/utils/logger.js";
import type { CloudflareTurnResponse } from "@/domains/video-chat/types/call.types.js";

const router: ExpressRouter = Router();
const logger = createLogger("routes:media:ice-servers");

router.get("/ice-servers", async (_req: Request, res: Response) => {
  try {
    const apiToken = config.cloudflareTurnApiToken;
    const keyId = config.cloudflareTurnKeyId;


    if (!apiToken || !keyId) {
      logger.error("Cloudflare TURN credentials not configured");
      return res.status(500).json({
        error: "ICE server configuration not available",
        message: "Server configuration error",
      });
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
        return res.status(response.status).json({
          error: "Failed to fetch ICE servers",
          message: "External API error",
        });
      }

      const data = (await response.json()) as CloudflareTurnResponse;

      res.json(data);
    } catch (fetchError: unknown) {
      clearTimeout(timeoutId);

      if (fetchError instanceof Error && fetchError.name === "AbortError") {
        logger.error(fetchError instanceof Error ? fetchError : new Error(String(fetchError)), "ICE servers request timeout");
        return res.status(504).json({
          error: "Request timeout",
          message: "ICE server request timed out",
        });
      }

      throw fetchError;
    }
  } catch (error: unknown) {
    logger.error(error as Error, "Error fetching ICE servers");
    res.status(500).json({
      error: "Internal server error",
      message: "Failed to fetch ICE servers",
    });
  }
});

export default router;
