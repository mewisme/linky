import { Router, type Router as ExpressRouter } from "express";
import usersRouter from "./http/users.route.js";
import interestTagsRouter from "./http/interest-tags.route.js";
import levelRewardsRouter from "./http/level-rewards.route.js";
import levelFeatureUnlocksRouter from "./http/level-feature-unlocks.route.js";
import streakExpBonusesRouter from "./http/streak-exp-bonuses.route.js";
import adminMediaRouter from "./http/admin-media.route.js";
import embeddingsRouter from "./http/embeddings.route.js";
import broadcastsRouter from "./http/broadcasts.route.js";
import { createAdminReportsRouter } from "./http/reports.route.js";
import configRouter from "./http/config.route.js";
import { rateLimitMiddleware } from "@/middleware/rate-limit.js";

export function createAdminRouter(deps: { reportsRouter: ExpressRouter }): ExpressRouter {
  const router: ExpressRouter = Router();

  router.use(rateLimitMiddleware);

  router.use("/config", configRouter);
  router.use("/users", usersRouter);
  router.use("/broadcasts", broadcastsRouter);
  router.use("/embeddings", embeddingsRouter);
  router.use("/interest-tags", interestTagsRouter);
  router.use("/level-rewards", levelRewardsRouter);
  router.use("/level-feature-unlocks", levelFeatureUnlocksRouter);
  router.use("/streak-exp-bonuses", streakExpBonusesRouter);
  router.use("/media", adminMediaRouter);
  router.use("/reports", createAdminReportsRouter({ reportsRouter: deps.reportsRouter }));

  return router;
}

