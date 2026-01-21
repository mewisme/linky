import express, { type Express } from "express";
import { createServer, type Server as HTTPServer } from "http";
import { setupMiddleware, setupErrorHandlers } from "./middleware/index.js";
import { setupRoutes } from "./routes/index.js";
import { createSocketServer } from "./socket/index.js";
import { config } from "./config/index.js";
import { createLogger } from "@repo/logger/api";
import { connectRedis } from "./infra/redis/client.js";
import { preloadReferenceData } from "./infra/redis/cache-preload.js";
import { initializeMqttClient, attachSocketIO } from "./infra/mqtt/client.js";

const logger = createLogger("API:Server");

export function createApp(): Express {
  const app = express();

  setupMiddleware(app);
  setupRoutes(app);
  setupErrorHandlers(app);

  return app;
}

export async function startServer(): Promise<{ app: Express; httpServer: HTTPServer; io: ReturnType<typeof createSocketServer> }> {
  logger.info("Initializing server...");

  const app = createApp();
  logger.info("Express app created");

  logger.info("Creating HTTP server...");
  const httpServer = createServer(app);
  logger.info("HTTP server created");

  logger.info("Initializing Socket.IO server...");
  const io = createSocketServer(httpServer);
  logger.info("Socket.IO server created");

  attachSocketIO(io);

  logger.info("Connecting to Redis...");
  try {
    await connectRedis();
    preloadReferenceData();
  } catch (error: unknown) {
    logger.error("Failed to connect to Redis, continuing without Redis: %o", error instanceof Error ? error : new Error(String(error)));
  }

  initializeMqttClient();

  httpServer.listen(config.port, () => {
    logger.info("=".repeat(50));
    logger.info("Server started successfully");
    logger.info("HTTP server running on %s", `http://localhost:${config.port}`);
    logger.info("Socket.IO server ready for connections");
    logger.info("Environment: %s", config.nodeEnv);
    const corsOriginDisplay = Array.isArray(config.corsOrigin)
      ? config.corsOrigin.join(", ")
      : config.corsOrigin;
    logger.info("CORS origin: %s", corsOriginDisplay);
    logger.info("=".repeat(50));
  });

  httpServer.on("error", (error: Error) => {
    logger.fatal("HTTP server error: %o", error);
  });

  return { app, httpServer, io };
}

