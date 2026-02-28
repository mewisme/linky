import { Router, type Router as ExpressRouter } from "express";
import usersRouter from "./http/users.route.js";
import interestTagsRouter from "./http/interest-tags.route.js";
import changelogsRouter from "./http/changelogs.route.js";
import levelRewardsRouter from "./http/level-rewards.route.js";
import levelFeatureUnlocksRouter from "./http/level-feature-unlocks.route.js";
import streakExpBonusesRouter from "./http/streak-exp-bonuses.route.js";
import favoriteExpBoostRouter from "./http/favorite-exp-boost.route.js";
import adminMediaRouter from "./http/admin-media.route.js";
import embeddingsRouter from "./http/embeddings.route.js";
import broadcastsRouter from "./http/broadcasts.route.js";
import { createAdminReportsRouter } from "./http/reports.route.js";
import economyStatsRouter from "./http/economy-stats.route.js";
import economySimulateRouter from "./http/economy-simulate.route.js";
import seasonsRouter from "./http/seasons.route.js";
import { rateLimitMiddleware } from "@/middleware/rate-limit.js";

export function createAdminRouter(deps: { reportsRouter: ExpressRouter }): ExpressRouter {
  const router: ExpressRouter = Router();

  router.use(rateLimitMiddleware);

  router.use("/users", usersRouter);
  router.use("/broadcasts", broadcastsRouter);
  router.use("/embeddings", embeddingsRouter);
  router.use("/interest-tags", interestTagsRouter);
  router.use("/changelogs", changelogsRouter);
  router.use("/level-rewards", levelRewardsRouter);
  router.use("/level-feature-unlocks", levelFeatureUnlocksRouter);
  router.use("/streak-exp-bonuses", streakExpBonusesRouter);
  router.use("/favorite-exp-boost", favoriteExpBoostRouter);
  router.use("/media", adminMediaRouter);
router.use("/economy/stats", economyStatsRouter);
router.use("/economy/simulate", economySimulateRouter);
router.use("/seasons", seasonsRouter);
router.use("/reports", createAdminReportsRouter({ reportsRouter: deps.reportsRouter }));

  return router;
}

