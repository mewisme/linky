import { Router, type Request, type Response, type Router as ExpressRouter } from "express";
import {
  getFavoritesByUserId,
  checkFavoriteExists,
  createFavorite,
  deleteFavorite,
  checkDailyLimitReached,
  incrementFavoriteLimit,
} from "../../lib/supabase/queries/favorites.js";
import { getUserIdByClerkId } from "../../lib/supabase/queries/call-history.js";
import { Logger } from "../../utils/logger.js";
import { getVideoChatContext } from "../../socket/video-chat/context.js";
import { supabase } from "../../lib/supabase/client.js";

const router: ExpressRouter = Router();
const logger = new Logger("ResourcesFavoritesRoute");

router.get("/", async (req: Request, res: Response) => {
  try {
    const clerkUserId = req.auth?.sub;

    if (!clerkUserId) {
      return res.status(401).json({
        error: "Unauthorized",
        message: "User ID not found in authentication token",
      });
    }

    const userId = await getUserIdByClerkId(clerkUserId);
    if (!userId) {
      return res.status(404).json({
        error: "Not Found",
        message: "User not found in database",
      });
    }

    const favorites = await getFavoritesByUserId(userId);

    logger.info("Favorites fetched for user:", userId, "Count:", favorites.length);

    return res.json({
      data: favorites,
      count: favorites.length,
    });
  } catch (error) {
    logger.error(
      "Unexpected error in GET /favorites:",
      error instanceof Error ? error.message : "Unknown error"
    );
    return res.status(500).json({
      error: "Internal Server Error",
      message: "Failed to fetch favorites",
    });
  }
});

router.post("/", async (req: Request, res: Response) => {
  try {
    const clerkUserId = req.auth?.sub;
    const { favorite_user_id } = req.body;

    if (!clerkUserId) {
      return res.status(401).json({
        error: "Unauthorized",
        message: "User ID not found in authentication token",
      });
    }

    const userId = await getUserIdByClerkId(clerkUserId);
    if (!userId) {
      return res.status(404).json({
        error: "Not Found",
        message: "User not found in database",
      });
    }

    if (!favorite_user_id) {
      return res.status(400).json({
        error: "Bad Request",
        message: "favorite_user_id is required",
      });
    }

    if (userId === favorite_user_id) {
      return res.status(400).json({
        error: "Bad Request",
        message: "Cannot favorite yourself",
      });
    }

    const limitCheck = await checkDailyLimitReached(userId);
    if (limitCheck.reached) {
      return res.status(429).json({
        error: "Too Many Requests",
        message: "Daily favorite limit reached",
        current: limitCheck.current,
        limit: limitCheck.limit,
      });
    }

    const exists = await checkFavoriteExists(userId, favorite_user_id);
    if (exists) {
      return res.status(409).json({
        error: "Conflict",
        message: "User is already in favorites",
      });
    }

    const favorite = await createFavorite(userId, favorite_user_id);
    await incrementFavoriteLimit(userId);

    const { data: currentUser } = await supabase
      .from("users")
      .select("id, first_name, last_name")
      .eq("id", userId)
      .single();

    const context = getVideoChatContext();
    if (context) {
      const { io, rooms } = context;
      const room = rooms.findRoomByUserId(favorite_user_id, io);
      
      if (room) {
        const favoriteUserSocketId = room.user1 === favorite_user_id ? room.user1 : room.user2;
        const socket = io.sockets.sockets.get(favoriteUserSocketId);
        
        if (socket && socket.connected) {
          const fromUserName = currentUser 
            ? `${currentUser.first_name || ""} ${currentUser.last_name || ""}`.trim() || "Someone"
            : "Someone";
          socket.emit("favorite:added", {
            from_user_id: userId,
            from_user_name: fromUserName,
          });
          logger.info("Favorite notification sent to:", favorite_user_id);
        }
      }
    }

    logger.info("Favorite created:", userId, "->", favorite_user_id);

    return res.status(201).json({
      data: favorite,
      message: "User added to favorites",
    });
  } catch (error) {
    logger.error(
      "Unexpected error in POST /favorites:",
      error instanceof Error ? error.message : "Unknown error"
    );
    return res.status(500).json({
      error: "Internal Server Error",
      message: "Failed to add favorite",
    });
  }
});

router.delete("/:favorite_user_id", async (req: Request, res: Response) => {
  try {
    const clerkUserId = req.auth?.sub;
    const { favorite_user_id } = req.params;

    if (!clerkUserId) {
      return res.status(401).json({
        error: "Unauthorized",
        message: "User ID not found in authentication token",
      });
    }

    const userId = await getUserIdByClerkId(clerkUserId);
    if (!userId) {
      return res.status(404).json({
        error: "Not Found",
        message: "User not found in database",
      });
    }

    if (!favorite_user_id) {
      return res.status(400).json({
        error: "Bad Request",
        message: "favorite_user_id is required",
      });
    }

    const exists = await checkFavoriteExists(userId, favorite_user_id);
    if (!exists) {
      return res.status(404).json({
        error: "Not Found",
        message: "Favorite not found",
      });
    }

    await deleteFavorite(userId, favorite_user_id);

    logger.info("Favorite deleted:", userId, "->", favorite_user_id);

    return res.json({
      message: "Favorite removed successfully",
    });
  } catch (error) {
    logger.error(
      "Unexpected error in DELETE /favorites/:favorite_user_id:",
      error instanceof Error ? error.message : "Unknown error"
    );
    return res.status(500).json({
      error: "Internal Server Error",
      message: "Failed to remove favorite",
    });
  }
});

export default router;
