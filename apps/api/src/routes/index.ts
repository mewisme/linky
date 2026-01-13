import { type Express, type Request, type Response } from "express";
import apiRouter from "./api.js";
import analyticsRouter from "./analytics.js";
import interestTagsRouter from "./resources/interest-tags.js";
import iceServersRouter from "./media/ice-servers.js";
import s3Router from "./media/s3.js";
import webhookRouter from "./webhook.js";
import adminRouter from "./admin.js";
import { clerkMiddleware } from "../middleware/clerk.js";
import { adminMiddleware } from "../middleware/admin.js";

export function setupRoutes(app: Express): void {
  app.use("/webhook", webhookRouter);

  app.get("/health", (_req: Request, res: Response) => {
    res.json({
      status: "ok",
      timestamp: new Date().toISOString(),
    });
  });

  app.get("/api", (_req: Request, res: Response) => {
    res.json({ message: "API is running" });
  });

  app.use("/api/v1/analytics", analyticsRouter);
  app.use("/api/v1/interest-tags", interestTagsRouter);

  app.use(clerkMiddleware);

  app.use("/api/v1", apiRouter);

  app.use("/api/v1/s3", s3Router);

  app.use("/api", iceServersRouter);

  app.use("/api/v1/admin", adminMiddleware, adminRouter);
}

