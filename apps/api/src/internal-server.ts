import { createServer, type Server as HTTPServer } from "node:http";
import { chmodSync, rmSync } from "node:fs";

import express, { type Request, type Response, type NextFunction } from "express";
import { setupExpressErrorHandler } from "@sentry/node";

import { INTERNAL_WORKER_V1_PREFIX } from "@ws/worker-api";

import { config } from "@/config/index.js";
import { createInternalWorkerRouter } from "@/routes/internal-worker.route.js";
import { requestIdMiddleware } from "@/middleware/request-id.js";
import { um, unexpectedServerUserMessage } from "@/lib/api-user-message.js";
import { sendJsonError } from "@/lib/http-json-response.js";
import { isPayloadTooLargeError, sendPayloadTooLargeError } from "@/lib/http-payload-too-large-error.js";
import { createLogger } from "@/utils/logger.js";
import { toLoggableError } from "@/utils/to-loggable-error.js";

const logger = createLogger("api:internal-server");

export function createInternalApp(): express.Express {
  const app = express();

  app.use(requestIdMiddleware);
  app.use(express.json({ limit: config.jsonBodySizeLimit }));

  app.use(INTERNAL_WORKER_V1_PREFIX, createInternalWorkerRouter());

  app.use((_req: Request, res: Response) => {
    sendJsonError(res, 404, "Route not found", um("ROUTE_NOT_FOUND", "routeNotFound", "Route not found"));
  });

  setupExpressErrorHandler(app);

  app.use((err: unknown, _req: Request, res: Response, _next: NextFunction) => {
    if (isPayloadTooLargeError(err)) {
      sendPayloadTooLargeError(res);
      return;
    }
    const logErr = toLoggableError(err);
    logger.error(logErr, "Internal server error on internal listener");
    sendJsonError(
      res,
      500,
      "An unexpected error occurred",
      unexpectedServerUserMessage(logErr.message, config.nodeEnv),
    );
  });

  return app;
}

export async function startInternalServer(): Promise<HTTPServer> {
  const app = createInternalApp();
  const server = createServer(app);

  if (config.internalApiSocketPath) {
    rmSync(config.internalApiSocketPath, { force: true });
    await new Promise<void>((resolve, reject) => {
      server.once("error", reject);
      server.listen(config.internalApiSocketPath, () => {
        server.removeListener("error", reject);
        try {
          chmodSync(config.internalApiSocketPath, 0o666);
        } catch (error) {
          logger.warn(toLoggableError(error), "Failed to chmod internal API socket");
        }
        logger.info("Internal API listening on unix socket: %s", config.internalApiSocketPath);
        resolve();
      });
    });
  } else {
    await new Promise<void>((resolve, reject) => {
      server.once("error", reject);
      server.listen(config.internalApiPort, "127.0.0.1", () => {
        server.removeListener("error", reject);
        logger.info("Internal API listening on 127.0.0.1:%d", config.internalApiPort);
        resolve();
      });
    });
  }

  server.on("error", (error: Error) => {
    logger.fatal(toLoggableError(error), "Internal HTTP server error");
  });

  return server;
}
