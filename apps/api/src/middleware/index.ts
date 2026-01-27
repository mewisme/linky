import compression from "compression";
import cors from "cors";
import express, { type Express, type Request, type Response, type NextFunction } from "express";
import morgan from "morgan";
import { config } from "../config/index.js";
import { createLogger } from "@repo/logger";
import { clientIpMiddleware } from "./client-ip.js";
import { requestIdMiddleware } from "./request-id.js";
import { jsonBodySizeLimitMiddleware } from "./json-body-size-limit.js";

const logger = createLogger("API:Middleware");

morgan.token("custom", () => {
  return "";
});

const morganFormat = config.nodeEnv === "production"
  ? ":method :url :status :res[content-length] - :response-time ms"
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
    res.status(404).json({ error: "Route not found" });
  });

  app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
    logger.error("Internal server error: %o", err instanceof Error ? err : new Error(String(err)));
    if (err.stack) {
      logger.trace("Stack trace: %o", err instanceof Error ? err : new Error(String(err)));
    }
    res.status(500).json({ error: "An unexpected error occurred", message: err.message });
  });
}
