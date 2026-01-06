import { type Express, type Request, type Response } from "express";
import apiRouter from "./api.js";
import iceServersRouter from "./ice-servers.js";
import s3Router from "./s3.js";
import webhookRouter from "./webhook.js";
import adminRouter from "./admin.js";
import { clerkMiddleware } from "../middleware/clerk.js";
import { adminMiddleware } from "../middleware/admin.js";

export function setupRoutes(app: Express): void {
  // Webhook route must be BEFORE clerkMiddleware (webhooks are verified by signature, not token)
  app.use("/webhook", webhookRouter);

  // Health check endpoint
  app.get("/health", (_req: Request, res: Response) => {
    res.json({
      status: "ok",
      timestamp: new Date().toISOString(),
    });
  });

  // API root endpoint
  app.get("/api", (_req: Request, res: Response) => {
    res.json({ message: "API is running" });
  });

  app.use(clerkMiddleware);

  // Mount API routes
  app.use("/api/v1", apiRouter);

  // Mount S3 routes (protected by clerkMiddleware)
  app.use("/api/v1/s3", s3Router);

  // Mount ICE servers route
  app.use("/api", iceServersRouter);

  // Mount admin routes (protected by clerkMiddleware + adminMiddleware)
  app.use("/api/v1/admin", adminMiddleware, adminRouter);
}

