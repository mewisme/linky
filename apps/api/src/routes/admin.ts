import { Router, type Router as ExpressRouter } from "express";
import usersRouter from "./admin/users.js";
import analyticsRouter from "./admin/analytics.js";
import visitsRouter from "./admin/visits.js";
import interestTagsRouter from "./admin/interest-tags.js";
import changelogsRouter from "./admin/changelogs.js";
import reportsRouter from "./admin/reports.js";

const router: ExpressRouter = Router();

// Mount sub-routes
router.use("/users", usersRouter);
router.use("/analytics", analyticsRouter);
router.use("/visits", visitsRouter);
router.use("/interest-tags", interestTagsRouter);
router.use("/changelogs", changelogsRouter);
router.use("/reports", reportsRouter);

export default router;
