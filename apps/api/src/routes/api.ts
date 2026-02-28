import { Router, type Router as ExpressRouter } from "express";
import callHistoryRouter from "./resources/call-history.js";
import reportsRouter from "@/domains/reports/http/reports.route.js";
import favoritesRouter from "./resources/favorites.js";
import usersRouter from "@/domains/user/http/users.route.js";
import userDetailsRouter from "@/domains/user/http/user-details.route.js";
import userSettingsRouter from "@/domains/user/http/user-settings.route.js";
import userProfileRouter from "@/domains/user/http/user-profile.route.js";
import userLevelRouter from "@/domains/user/http/user-level.route.js";
import userStreakRouter from "@/domains/user/http/user-streak.route.js";
import userProgressRouter from "@/domains/user/http/user-progress.route.js";
import userBlocksRouter from "@/domains/user/http/user-blocks.route.js";
import videoChatRouter from "@/domains/video-chat/http/end-call-unload.route.js";
import notificationsRouter from "@/domains/notification/http/notifications.route.js";
import pushRouter from "@/domains/notification/http/push.route.js";
import economyRouter from "@/domains/economy/http/economy.route.js";
import shopRouter from "@/domains/economy-shop/http/shop.route.js";
import boostRouter from "@/domains/economy-boost/http/boost.route.js";
import dailyExpRouter from "@/domains/economy-daily/http/daily-exp.route.js";
import weeklyCheckinRouter from "@/domains/economy-weekly/http/weekly-checkin.route.js";
import monthlyCheckinRouter from "@/domains/economy-monthly/http/monthly-checkin.route.js";
import prestigeRouter from "@/domains/economy-prestige/http/prestige.route.js";

const router: ExpressRouter = Router();

router.use("/users", usersRouter);
router.use("/users/details", userDetailsRouter);
router.use("/users/settings", userSettingsRouter);
router.use("/users/profile", userProfileRouter);
router.use("/users/level", userLevelRouter);
router.use("/users/streak", userStreakRouter);
router.use("/users/progress", userProgressRouter);
router.use("/users/blocks", userBlocksRouter);
router.use("/users/prestige", prestigeRouter);
router.use("/call-history", callHistoryRouter);
router.use("/reports", reportsRouter);
router.use("/favorites", favoritesRouter);
router.use("/video-chat", videoChatRouter);
router.use("/notifications", notificationsRouter);
router.use("/push", pushRouter);
router.use("/economy", economyRouter);
router.use("/economy/shop", shopRouter);
router.use("/economy/boost", boostRouter);
router.use("/economy/daily", dailyExpRouter);
router.use("/economy/weekly", weeklyCheckinRouter);
router.use("/economy/monthly", monthlyCheckinRouter);

export default router;

