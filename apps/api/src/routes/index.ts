import { type Express, type Request, type Response } from "express";
import apiRouter from "./api.js";
import interestTagsRouter from "./resources/interest-tags.js";
import changelogsRouter from "./resources/changelogs.js";
import iceServersRouter from "./media/ice-servers.js";
import s3Router from "./media/s3.js";
import webhookRouter from "./webhook.js";
import healthRouter from "./health.js";
import { createAdminRouter } from "../domains/admin/index.js";
import reportsAdminRouter from "@/domains/reports/http/admin-reports.route.js";
import { clerkMiddleware } from "@/middleware/clerk.js";
import { adminMiddleware } from "@/middleware/admin.js";
import { config } from "@/config/index.js";
import queueStatusRouter from "@/domains/video-chat/http/queue-status.route.js";

export function setupRoutes(app: Express): void {
  app.get("/", (_req: Request, res: Response) => {
    res.json({
      environment: config.nodeEnv,
      timestamp: new Date().toISOString(),
      status: "running",
    });
  });

  app.use("/", healthRouter);
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

  app.use("/api/v1/interest-tags", interestTagsRouter);
  app.use("/api/v1/changelogs", changelogsRouter);
  app.use("/api/v1/matchmaking", queueStatusRouter);

  app.use(clerkMiddleware);

  app.use("/api/v1", apiRouter);

  app.use("/api/v1/s3", s3Router);

  app.use("/api", iceServersRouter);

  app.use("/api/v1/admin", adminMiddleware, createAdminRouter({ reportsRouter: reportsAdminRouter }));
}

