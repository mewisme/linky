import { Router, type Router as ExpressRouter } from "express";
import callHistoryRouter from "./resources/call-history.js";
import usersRouter from "./users/users.js";
import userDetailsRouter from "./users/user-details.js";

const router: ExpressRouter = Router();

// Mount sub-routers
router.use("/users", usersRouter);
router.use("/user-details", userDetailsRouter);
router.use("/call-history", callHistoryRouter);

export default router;

