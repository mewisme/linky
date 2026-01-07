import express, { type Express } from "express";
import { createServer, type Server as HTTPServer } from "http";
import { setupMiddleware, setupErrorHandlers } from "./middleware/index.js";
import { setupRoutes } from "./routes/index.js";
import { createSocketServer } from "./socket/index.js";
import { config } from "./config/index.js";
import { logger } from "./utils/logger.js";
import { connectRedis } from "./lib/redis/client.js";
import { initializeMqttClient, attachSocketIO } from "./lib/mqtt/client.js";

export function createApp(): Express {
  const app = express();

  setupMiddleware(app);
  setupRoutes(app);
  setupErrorHandlers(app);

  return app;
}

export async function startServer(): Promise<{ app: Express; httpServer: HTTPServer; io: ReturnType<typeof createSocketServer> }> {
  logger.load("Initializing server...");

  const app = createApp();
  logger.done("Express app created");

  logger.load("Creating HTTP server...");
  const httpServer = createServer(app);
  logger.done("HTTP server created");

  logger.load("Initializing Socket.IO server...");
  const io = createSocketServer(httpServer);
  logger.done("Socket.IO server created");

  attachSocketIO(io);

  logger.load("Connecting to Redis...");
  try {
    await connectRedis();
  } catch (error) {
    logger.error("Failed to connect to Redis, continuing without Redis:", error);
  }

  initializeMqttClient();

  httpServer.listen(config.port, () => {
    logger.info("=".repeat(50));
    logger.done("Server started successfully");
    logger.info("HTTP server running on", `http://localhost:${config.port}`);
    logger.info("Socket.IO server ready for connections");
    logger.info("Environment:", config.nodeEnv);
    const corsOriginDisplay = Array.isArray(config.corsOrigin)
      ? config.corsOrigin.join(", ")
      : config.corsOrigin;
    logger.info("CORS origin:", corsOriginDisplay);
    logger.info("=".repeat(50));
  });

  httpServer.on("error", (error: Error) => {
    logger.error("HTTP server error:", error.message);
  });

  return { app, httpServer, io };
}

