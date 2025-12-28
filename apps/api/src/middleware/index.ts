import cors from "cors";
import express, { type Express, type Request, type Response, type NextFunction } from "express";
import morgan from "morgan";
import { config } from "../config/index.js";
import { logger } from "../utils/logger.js";

/**
 * Custom morgan token to use our logger
 */
morgan.token("custom", () => {
  return "";
});

/**
 * Custom morgan format that integrates with our logger
 */
const morganFormat = config.nodeEnv === "production"
  ? ":method :url :status :res[content-length] - :response-time ms"
  : ":method :url :status :response-time ms";

export function setupMiddleware(app: Express): void {
  // CORS
  app.use(cors({
    origin: config.corsOrigin,
    credentials: true,
  }));

  // Webhook routes need raw body for svix signature verification
  // Apply raw body parser for webhook routes BEFORE JSON parser
  app.use("/webhook", express.raw({ type: "application/json" }));

  // Body parsing for other routes
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));

  // HTTP request logging with morgan
  app.use(morgan(morganFormat, {
    stream: {
      write: (message: string) => {
        // Remove trailing newline and log
        const trimmedMessage = message.trim();
        if (trimmedMessage) {
          logger.info(trimmedMessage);
        }
      },
    },
  }));
}

export function setupErrorHandlers(app: Express): void {
  // 404 handler
  app.use((_req: Request, res: Response) => {
    res.status(404).json({ error: "Not found" });
  });

  // Error handler
  app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
    logger.error("Internal server error:", err.message);
    if (err.stack) {
      logger.error("Stack trace:", err.stack);
    }
    res.status(500).json({
      error: "Internal server error",
      ...(config.nodeEnv === "development" && { message: err.message }),
    });
  });
}

