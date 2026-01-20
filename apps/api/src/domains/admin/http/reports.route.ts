import { Router, type Router as ExpressRouter } from "express";

export function createAdminReportsRouter(deps: { reportsRouter: ExpressRouter }): ExpressRouter {
  const router: ExpressRouter = Router();
  router.use("/", deps.reportsRouter);
  return router;
}

