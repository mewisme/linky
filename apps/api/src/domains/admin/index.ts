import { Router, type Router as ExpressRouter } from "express";
import usersRouter from "./http/users.route.js";
import analyticsRouter from "./http/analytics.route.js";
import visitsRouter from "./http/visits.route.js";
import interestTagsRouter from "./http/interest-tags.route.js";
import changelogsRouter from "./http/changelogs.route.js";
import levelRewardsRouter from "./http/level-rewards.route.js";
import levelFeatureUnlocksRouter from "./http/level-feature-unlocks.route.js";
import streakExpBonusesRouter from "./http/streak-exp-bonuses.route.js";
import { createAdminReportsRouter } from "./http/reports.route.js";
import { rateLimitMiddleware } from "../../middleware/rate-limit.js";

export function createAdminRouter(deps: { reportsRouter: ExpressRouter }): ExpressRouter {
  const router: ExpressRouter = Router();

  router.use(rateLimitMiddleware);

  router.use("/users", usersRouter);
  router.use("/analytics", analyticsRouter);
  router.use("/visits", visitsRouter);
  router.use("/interest-tags", interestTagsRouter);
  router.use("/changelogs", changelogsRouter);
  router.use("/level-rewards", levelRewardsRouter);
  router.use("/level-feature-unlocks", levelFeatureUnlocksRouter);
  router.use("/streak-exp-bonuses", streakExpBonusesRouter);
  router.use("/reports", createAdminReportsRouter({ reportsRouter: deps.reportsRouter }));

  return router;
}

