import { Router, type Request, type Response, type Router as ExpressRouter } from "express";
import { config } from "@/config/index.js";
import { createLogger } from "@/utils/logger.js";
import {
  STATIC_ICE_SERVERS,
  type CloudflareTurnResponse,
  type IceServersDualResponse,
} from "@/domains/video-chat/types/call.types.js";

const router: ExpressRouter = Router();
const logger = createLogger("routes:media:ice-servers");

router.get("/ice-servers", async (_req: Request, res: Response) => {
  let cloudflareIceServers: IceServersDualResponse["cloudflareIceServers"] = [];

  const apiToken = config.cloudflareTurnApiToken;
  const keyId = config.cloudflareTurnKeyId;

  if (apiToken && keyId) {
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

      if (response.ok) {
        const data = (await response.json()) as CloudflareTurnResponse;
        cloudflareIceServers = data.iceServers as IceServersDualResponse["cloudflareIceServers"];
      } else {
        const errorText = await response.text();
        logger.warn("Cloudflare TURN API error: %d, %s", response.status, errorText);
      }
    } catch (fetchError: unknown) {
      clearTimeout(timeoutId);
      if (fetchError instanceof Error && fetchError.name === "AbortError") {
        logger.warn(fetchError, "ICE servers Cloudflare request timeout");
      } else {
        logger.warn(fetchError as Error, "ICE servers Cloudflare fetch failed");
      }
    }
  } else {
    logger.warn("Cloudflare TURN credentials not configured");
  }

  try {
    const payload: IceServersDualResponse = {
      staticIceServers: [...STATIC_ICE_SERVERS],
      cloudflareIceServers,
    };
    res.json(payload);
  } catch (error: unknown) {
    logger.error(error as Error, "Error sending ICE servers response");
    res.status(500).json({
      error: "Internal server error",
      message: "Failed to fetch ICE servers",
    });
  }
});

export default router;
