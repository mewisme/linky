import { type Express, type Request, type Response } from "express";
import apiRouter from "./api.js";
import interestTagsRouter from "./resources/interest-tags.js";
import iceServersRouter from "./media/ice-servers.js";
import webhookRouter from "./webhook.js";
import healthRouter from "./health.js";
import { createAdminRouter } from "../domains/admin/index.js";
import reportsAdminRouter from "@/domains/reports/http/admin-reports.route.js";
import { clerkMiddleware } from "@/middleware/clerk.js";
import { adminMiddleware } from "@/middleware/admin.js";
import queueStatusRouter from "@/domains/video-chat/http/queue-status.route.js";
import { toUserMessage, userFacingPayload } from "@/types/user-message.js";

export function setupRoutes(app: Express): void {
  app.get("/", (_req: Request, res: Response) => {
    res.json({ status: "running" });
  });

  app.use("/", healthRouter);
  app.use("/webhook", webhookRouter);

  app.get("/api", (_req: Request, res: Response) => {
    res.json({
      ...userFacingPayload(toUserMessage("API_RUNNING", { key: "api.apiRunning" }, "API is running")),
    });
  });

  app.use("/api/v1/interest-tags", interestTagsRouter);
  app.use("/api/v1/matchmaking", queueStatusRouter);

  app.use(clerkMiddleware);

  app.use("/api/v1", apiRouter);

  app.use("/api", iceServersRouter);

  app.use("/api/v1/admin", adminMiddleware, createAdminRouter({ reportsRouter: reportsAdminRouter }));
}

