import { type Server as HTTPServer } from "http";
import { type Server as SocketIOServer } from "socket.io";
import * as Sentry from "@sentry/node";
import { redisClient } from "@/infra/redis/client.js";
import { mqttClient } from "@/infra/mqtt/client.js";
import { config } from "@/config/index.js";
import { createLogger } from "@/utils/logger.js";

const logger = createLogger("middleware:graceful-shutdown");

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
      await new Promise<void>((resolve) => {
        if (!httpServer) {
          resolve();
          return;
        }

        httpServer.close(() => resolve());
      });

      if (io) {
        io.close(() => { });
      }

      try {
        if (redisClient.isOpen) {
          await redisClient.quit();
        }
      } catch (error) {
        logger.warn(error as Error, "Error closing Redis connection");
      }

      try {
        if (mqttClient.connected) {
          mqttClient.end();
        }
      } catch (error) {
        logger.warn(error as Error, "Error closing MQTT connection");
      }

      clearTimeout(shutdownTimer);
      logger.info("Graceful shutdown completed");
      await Sentry.close(2000);
      process.exit(0);
    } catch (error) {
      logger.error(error as Error, "Error during shutdown");
      clearTimeout(shutdownTimer);
      process.exit(1);
    }
  };

  process.on("SIGTERM", () => shutdown("SIGTERM"));
  process.on("SIGINT", () => shutdown("SIGINT"));

  process.on("uncaughtException", (error: Error) => {
    logger.fatal(error, "Uncaught exception");
    shutdown("uncaughtException").catch(() => {
      process.exit(1);
    });
  });

  process.on("unhandledRejection", (reason: unknown) => {
    logger.fatal(reason as Error, "Unhandled rejection");
    shutdown("unhandledRejection").catch(() => {
      process.exit(1);
    });
  });
}
