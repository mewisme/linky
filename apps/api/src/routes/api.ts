import { Router, type Router as ExpressRouter } from "express";
import callHistoryRouter from "./resources/call-history.js";
import reportsRouter from "../domains/reports/http/reports.route.js";
import favoritesRouter from "./resources/favorites.js";
import usersRouter from "../domains/user/http/users.route.js";
import userDetailsRouter from "../domains/user/http/user-details.route.js";
import userSettingsRouter from "../domains/user/http/user-settings.route.js";
import userProfileRouter from "../domains/user/http/user-profile.route.js";
import userLevelRouter from "../domains/user/http/user-level.route.js";
import userStreakRouter from "../domains/user/http/user-streak.route.js";
import userProgressRouter from "../domains/user/http/user-progress.route.js";
import userSharedStreaksRouter from "../domains/user/http/user-shared-streaks.route.js";
import videoChatRouter from "../domains/video-chat/http/end-call-unload.route.js";

const router: ExpressRouter = Router();

router.use("/users", usersRouter);
router.use("/user-details", userDetailsRouter);
router.use("/user-settings", userSettingsRouter);
router.use("/user-profile", userProfileRouter);
router.use("/user-level", userLevelRouter);
router.use("/user-streak", userStreakRouter);
router.use("/user-progress", userProgressRouter);
router.use("/user-shared-streaks", userSharedStreaksRouter);
router.use("/call-history", callHistoryRouter);
router.use("/reports", reportsRouter);
router.use("/favorites", favoritesRouter);
router.use("/video-chat", videoChatRouter);

export default router;

