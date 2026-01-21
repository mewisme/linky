import cors from "cors";
import express, { type Express, type Request, type Response, type NextFunction } from "express";
import morgan from "morgan";
import { config } from "../config/index.js";
import { createLogger } from "@repo/logger/api";
import { clientIpMiddleware } from "./client-ip.js";

const logger = createLogger("API:Middleware");

morgan.token("custom", () => {
  return "";
});

const morganFormat = config.nodeEnv === "production"
  ? ":method :url :status :res[content-length] - :response-time ms"
  : ":method :url :status :response-time ms";

export function setupMiddleware(app: Express): void {
  app.enable("trust proxy");

  app.use(clientIpMiddleware);

  app.use("/webhook", express.raw({ type: "application/json" }));

  app.use(cors({
    origin: config.corsOrigin,
    credentials: true,
  }));

  app.use(express.json());
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
