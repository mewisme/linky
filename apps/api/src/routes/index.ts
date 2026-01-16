import { type Express, type Request, type Response } from "express";
import { readFileSync } from "fs";
import { dirname, join } from "path";
import { fileURLToPath } from "url";
import apiRouter from "./api.js";
import analyticsRouter from "./analytics.js";
import interestTagsRouter from "./resources/interest-tags.js";
import changelogsRouter from "./resources/changelogs.js";
import iceServersRouter from "./media/ice-servers.js";
import s3Router from "./media/s3.js";
import webhookRouter from "./webhook.js";
import adminRouter from "./admin.js";
import { clerkMiddleware } from "../middleware/clerk.js";
import { supabaseMiddleware } from "../middleware/supabase.js";
import { adminMiddleware } from "../middleware/admin.js";
import { config } from "../config/index.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const packageJsonPath = join(__dirname, "../../package.json");
const packageJson = JSON.parse(readFileSync(packageJsonPath, "utf8"));

export function setupRoutes(app: Express): void {
  app.get("/", (_req: Request, res: Response) => {
    res.json({
      name: packageJson.name,
      version: packageJson.version,
      environment: config.nodeEnv,
      timestamp: new Date().toISOString(),
      status: "running",
    });
  });

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
  app.use("/api/v1/changelogs", changelogsRouter);

  app.use(supabaseMiddleware);

  app.use("/api/v1", apiRouter);

  app.use("/api/v1/s3", s3Router);

  app.use("/api", iceServersRouter);

  app.use("/api/v1/admin", adminMiddleware, adminRouter);
}

