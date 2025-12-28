import express, { type Express } from "express";
import { createServer, type Server as HTTPServer } from "http";
import { setupMiddleware, setupErrorHandlers } from "./middleware/index.js";
import { setupRoutes } from "./routes/index.js";
import { createSocketServer } from "./socket/index.js";
import { config } from "./config/index.js";
import { logger } from "./utils/logger.js";

export function createApp(): Express {
  const app = express();
  
  setupMiddleware(app);
  setupRoutes(app);
  setupErrorHandlers(app);

  return app;
}

export function startServer(): { app: Express; httpServer: HTTPServer; io: ReturnType<typeof createSocketServer> } {
  logger.load("Initializing server...");
  
  const app = createApp();
  logger.done("Express app created");

  logger.load("Creating HTTP server...");
  const httpServer = createServer(app);
  logger.done("HTTP server created");

  logger.load("Initializing Socket.IO server...");
  const io = createSocketServer(httpServer);
  logger.done("Socket.IO server created");

  httpServer.listen(config.port, () => {
    logger.info("=".repeat(50));
    logger.done("Server started successfully");
    logger.info("HTTP server running on", `http://localhost:${config.port}`);
    logger.info("Socket.IO server ready for connections");
    logger.info("Environment:", config.nodeEnv);
    logger.info("CORS origin:", config.corsOrigin);
    logger.info("=".repeat(50));
  });

  // Handle server errors
  httpServer.on("error", (error: Error) => {
    logger.error("HTTP server error:", error.message);
  });

  return { app, httpServer, io };
}

