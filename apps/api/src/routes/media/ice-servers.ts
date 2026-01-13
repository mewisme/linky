import { Router, type Request, type Response, type Router as ExpressRouter } from "express";
import { config } from "../../config/index.js";
import { logger } from "../../utils/logger.js";

const router: ExpressRouter = Router();

interface CloudflareTurnResponse {
  iceServers: Array<{
    urls: string[];
    username: string;
    credential: string;
  }>;
}

interface CachedIceServers {
  data: CloudflareTurnResponse;
  expiresAt: number;
}

let iceServersCache: CachedIceServers | null = null;

router.get("/ice-servers", async (_req: Request, res: Response) => {
  logger.info("ICE servers request received");

  try {
    if (iceServersCache && iceServersCache.expiresAt > Date.now()) {
      const cacheAge = Math.round((Date.now() - (iceServersCache.expiresAt - 3600000)) / 1000);
      logger.info("Returning cached ICE servers", `(Cache age: ${cacheAge}s)`);
      return res.json(iceServersCache.data);
    }

    const apiToken = process.env.CLOUDFLARE_TURN_API_TOKEN;
    const keyId = process.env.CLOUDFLARE_TURN_KEY_ID;

    if (!apiToken || !keyId) {
      logger.error("Cloudflare TURN credentials not configured");
      return res.status(500).json({
        error: "ICE server configuration not available",
        message: "Server configuration error",
      });
    }

    logger.load("Fetching ICE servers from Cloudflare API...");

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
        body: JSON.stringify({ ttl: 86400 }),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        const errorText = await response.text();
        logger.error("Cloudflare TURN API error:", response.status, errorText);
        return res.status(response.status).json({
          error: "Failed to fetch ICE servers",
          message: "External API error",
        });
      }

      const data = (await response.json()) as CloudflareTurnResponse;

      const ttl = 3600000;
      iceServersCache = {
        data,
        expiresAt: Date.now() + ttl,
      };

      logger.done("ICE servers fetched and cached successfully", `(Expires in: ${Math.round(ttl / 1000)}s)`);
      res.json(data);
    } catch (fetchError) {
      clearTimeout(timeoutId);

      if (fetchError instanceof Error && fetchError.name === "AbortError") {
        logger.error("ICE servers request timeout");
        return res.status(504).json({
          error: "Request timeout",
          message: "ICE server request timed out",
        });
      }

      throw fetchError;
    }
  } catch (error) {
    logger.error("Error fetching ICE servers:", error);
    res.status(500).json({
      error: "Internal server error",
      message: "Failed to fetch ICE servers",
    });
  }
});

export default router;

