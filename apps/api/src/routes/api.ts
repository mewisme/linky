import { Router, type Router as ExpressRouter } from "express";
import callHistoryRouter from "./resources/call-history.js";
import reportsRouter from "../domains/reports/http/reports.route.js";
import favoritesRouter from "./resources/favorites.js";
import usersRouter from "../domains/user/http/users.route.js";
import userDetailsRouter from "../domains/user/http/user-details.route.js";
import userSettingsRouter from "../domains/user/http/user-settings.route.js";
import videoChatRouter from "../domains/video-chat/http/end-call-unload.route.js";

const router: ExpressRouter = Router();

router.use("/users", usersRouter);
router.use("/user-details", userDetailsRouter);
router.use("/user-settings", userSettingsRouter);
router.use("/call-history", callHistoryRouter);
router.use("/reports", reportsRouter);
router.use("/favorites", favoritesRouter);
router.use("/video-chat", videoChatRouter);

export default router;

