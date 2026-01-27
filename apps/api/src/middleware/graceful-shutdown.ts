import { type Server as HTTPServer } from "http";
import { type Server as SocketIOServer } from "socket.io";
import { redisClient } from "../infra/redis/client.js";
import { mqttClient } from "../infra/mqtt/client.js";
import { config } from "../config/index.js";
import { createLogger } from "@repo/logger";

const logger = createLogger("API:Server:Shutdown");

let isShuttingDown = false;
let httpServer: HTTPServer | null = null;
let io: SocketIOServer | null = null;

export function setupGracefulShutdown(server: HTTPServer, socketIO: SocketIOServer): void {
  httpServer = server;
  io = socketIO;

  const shutdown = async (signal: string): Promise<void> => {
    if (isShuttingDown) {
      logger.warn("Shutdown already in progress, forcing exit");
      process.exit(1);
    }

    isShuttingDown = true;
    logger.info("Received %s, starting graceful shutdown...", signal);

    const shutdownTimer = setTimeout(() => {
      logger.error("Shutdown timeout exceeded, forcing exit");
      process.exit(1);
    }, config.shutdownTimeout);

    try {
      logger.info("Stopping HTTP server from accepting new connections...");
      await new Promise<void>((resolve) => {
        if (!httpServer) {
          resolve();
          return;
        }

        httpServer.close(() => {
          logger.info("HTTP server closed");
          resolve();
        });
      });

      logger.info("Closing Socket.IO server...");
      if (io) {
        io.close(() => {
          logger.info("Socket.IO server closed");
        });
      }

      logger.info("Closing Redis connection...");
      try {
        if (redisClient.isOpen) {
          await redisClient.quit();
          logger.info("Redis connection closed");
        }
      } catch (error) {
        logger.warn("Error closing Redis connection: %o", error instanceof Error ? error : new Error(String(error)));
      }

      logger.info("Closing MQTT connection...");
      try {
        if (mqttClient.connected) {
          mqttClient.end();
          logger.info("MQTT connection closed");
        }
      } catch (error) {
        logger.warn("Error closing MQTT connection: %o", error instanceof Error ? error : new Error(String(error)));
      }

      clearTimeout(shutdownTimer);
      logger.info("Graceful shutdown completed");
      process.exit(0);
    } catch (error) {
      logger.error("Error during shutdown: %o", error instanceof Error ? error : new Error(String(error)));
      clearTimeout(shutdownTimer);
      process.exit(1);
    }
  };

  process.on("SIGTERM", () => shutdown("SIGTERM"));
  process.on("SIGINT", () => shutdown("SIGINT"));

  process.on("uncaughtException", (error: Error) => {
    logger.fatal("Uncaught exception: %o", error);
    shutdown("uncaughtException").catch(() => {
      process.exit(1);
    });
  });

  process.on("unhandledRejection", (reason: unknown) => {
    logger.fatal("Unhandled rejection: %o", reason instanceof Error ? reason : new Error(String(reason)));
    shutdown("unhandledRejection").catch(() => {
      process.exit(1);
    });
  });
}
