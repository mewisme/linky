import compression from "compression";
import cors from "cors";
import express, { type Express, type Request, type Response, type NextFunction } from "express";
import morgan from "morgan";
import { setupExpressErrorHandler } from "@sentry/node";
import { config } from "@/config/index.js";
import { createLogger } from "@/utils/logger.js";
import { toLoggableError } from "@/utils/to-loggable-error.js";
import { clientIpMiddleware } from "./client-ip.js";
import { requestIdMiddleware } from "./request-id.js";
import { um, umDetail } from "@/lib/api-user-message.js";
import { sendJsonError } from "@/lib/http-json-response.js";
import { jsonBodySizeLimitMiddleware } from "./json-body-size-limit.js";

const logger = createLogger("middleware");

morgan.token("custom", () => {
  return "";
});

const morganFormat = config.nodeEnv === "production"
  ? ":remote-addr - :remote-user \":method :url HTTP/:http-version\" :status :res[content-length] - :response-time ms \":referrer\" \":user-agent\""
  : ":method :url :status :response-time ms";

export function setupMiddleware(app: Express): void {
  app.enable("trust proxy");

  app.use(requestIdMiddleware);
  app.use(clientIpMiddleware);

  app.use("/webhook", express.raw({ type: "application/json" }));

  app.use(cors({
    origin: config.corsOrigin,
    credentials: true,
  }));

  app.use(compression({
    filter: (req: Request, res: Response) => {
      const contentType = res.get('Content-Type');
      const isJsonResponse = contentType?.startsWith('application/json') || contentType?.startsWith('application/vnd.api+json');
      if (!isJsonResponse) {
        return false;
      }
      const contentLength = res.get('Content-Length');
      if (contentLength && parseInt(contentLength, 10) <= 1024) {
        return false;
      }
      return compression.filter(req, res);
    },
    level: 5,
    threshold: 1024,
  }));

  app.use(jsonBodySizeLimitMiddleware);
  app.use(express.json({ limit: config.jsonBodySizeLimit }));
  app.use(express.urlencoded({ extended: true }));

  app.use(morgan(morganFormat, {
    stream: {
      write: (message: string) => {
        const trimmedMessage = message.trim();
        if (trimmedMessage) {
          logger.info(trimmedMessage);
        }
      },
    },
  }));

}

export function setupErrorHandlers(app: Express): void {
  app.use((_req: Request, res: Response) => {
    sendJsonError(res, 404, "Route not found", um("ROUTE_NOT_FOUND", "routeNotFound", "Route not found"));
  });

  setupExpressErrorHandler(app);

  app.use((err: unknown, _req: Request, res: Response, _next: NextFunction) => {
    const logErr = toLoggableError(err);
    logger.error(logErr, "Internal server error");
    if (logErr.stack) {
      logger.trace(logErr, "Stack trace");
    }
    sendJsonError(res, 500, "An unexpected error occurred", umDetail("UNEXPECTED_SERVER", logErr.message));
  });
}
