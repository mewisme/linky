import express, { type Express } from "express";
import { createServer, type Server as HTTPServer } from "http";
import { setupMiddleware, setupErrorHandlers } from "./middleware/index.js";
import { setupRoutes } from "./routes/index.js";
import { createSocketServer } from "./socket/index.js";
import { config } from "./config/index.js";
import { createLogger } from "@repo/logger";
import { connectRedis } from "./infra/redis/client.js";
import { preloadReferenceData } from "./infra/redis/cache-preload.js";
import { initializeMqttClient, attachSocketIO } from "./infra/mqtt/client.js";
import { setupGracefulShutdown } from "./middleware/graceful-shutdown.js";

const logger = createLogger("api:server");

export function createApp(): Express {
  const app = express();

  setupMiddleware(app);
  setupRoutes(app);
  setupErrorHandlers(app);

  return app;
}

export async function startServer(): Promise<{ app: Express; httpServer: HTTPServer; io: ReturnType<typeof createSocketServer> }> {
  const app = createApp();
  const httpServer = createServer(app);
  const io = createSocketServer(httpServer);

  attachSocketIO(io);

  try {
    await connectRedis();
    preloadReferenceData();
  } catch (error: unknown) {
    logger.error("Failed to connect to Redis, continuing without Redis: %o", error instanceof Error ? error : new Error(String(error)));
  }

  initializeMqttClient();

  httpServer.listen(config.port, () => {
    logger.info("Server started: port=%d env=%s", config.port, config.nodeEnv);
  });

  httpServer.on("error", (error: Error) => {
    logger.fatal("HTTP server error: %o", error);
  });

  setupGracefulShutdown(httpServer, io);

  return { app, httpServer, io };
}

