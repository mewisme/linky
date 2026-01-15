import { Router, type Router as ExpressRouter } from "express";
import callHistoryRouter from "./resources/call-history.js";
import reportsRouter from "./resources/reports.js";
import usersRouter from "./users/users.js";
import userDetailsRouter from "./users/user-details.js";
import userSettingsRouter from "./users/user-settings.js";
import videoChatRouter from "./video-chat/end-call-unload.js";

const router: ExpressRouter = Router();

// Mount sub-routers
router.use("/users", usersRouter);
router.use("/user-details", userDetailsRouter);
router.use("/user-settings", userSettingsRouter);
router.use("/call-history", callHistoryRouter);
router.use("/reports", reportsRouter);
router.use("/video-chat", videoChatRouter);

export default router;

