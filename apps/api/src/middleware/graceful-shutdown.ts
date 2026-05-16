import { type Server as HTTPServer } from "http";
import { type Server as SocketIOServer } from "socket.io";
import { rmSync } from "node:fs";
import * as Sentry from "@sentry/node";
import { redisClient } from "@/infra/redis/client.js";
import { config } from "@/config/index.js";
import { createLogger } from "@/utils/logger.js";
import { toLoggableError } from "@/utils/to-loggable-error.js";
import { clearMatchmakingIntervals, persistActiveRoomCallHistories } from "@/domains/video-chat/socket/matchmaking.socket.js";
import { getVideoChatContext } from "@/domains/video-chat/socket/video-chat.socket.js";

const logger = createLogger("middleware:graceful-shutdown");

let isShuttingDown = false;
let httpServer: HTTPServer | null = null;
let internalServer: HTTPServer | null = null;
let io: SocketIOServer | null = null;

export function setupGracefulShutdown(
  server: HTTPServer,
  internal: HTTPServer | null,
  socketIO: SocketIOServer,
): void {
  httpServer = server;
  internalServer = internal;
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
      clearMatchmakingIntervals();
      const videoChatContext = getVideoChatContext();
      if (videoChatContext) {
        await persistActiveRoomCallHistories(videoChatContext.io, videoChatContext.rooms);
      }

      const closeServer = (server: HTTPServer | null): Promise<void> =>
        new Promise<void>((resolve) => {
          if (!server) {
            resolve();
            return;
          }
          server.close(() => resolve());
        });

      await Promise.all([closeServer(httpServer), closeServer(internalServer)]);

      if (config.internalApiSocketPath) {
        try {
          rmSync(config.internalApiSocketPath, { force: true });
        } catch (error) {
          logger.warn(toLoggableError(error), "Failed to remove internal API socket file");
        }
      }

      if (io) {
        io.close(() => { });
      }

      try {
        if (redisClient.isOpen) {
          await redisClient.quit();
        }
      } catch (error) {
        logger.warn(toLoggableError(error), "Error closing Redis connection");
      }

      clearTimeout(shutdownTimer);
      logger.info("Graceful shutdown completed");
      await Sentry.close(2000);
      process.exit(0);
    } catch (error) {
      logger.error(toLoggableError(error), "Error during shutdown");
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
    logger.fatal(toLoggableError(reason), "Unhandled rejection");
    shutdown("unhandledRejection").catch(() => {
      process.exit(1);
    });
  });
}
