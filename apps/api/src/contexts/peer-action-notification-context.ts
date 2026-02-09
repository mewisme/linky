import { createLogger } from "@ws/logger";
import { sendPushOnly } from "@/domains/notification/service/push.service.js";
import type { AuthenticatedSocket } from "@/socket/auth.js";

const logger = createLogger("context:peer-action-notification");

export type PeerActionPushParams = {
  userId: string;
  peerSocket: AuthenticatedSocket;
  title: string;
  body: string;
  url?: string;
};

export async function sendPeerActionPush(params: PeerActionPushParams): Promise<void> {
  try {
    const visibility = params.peerSocket.data.visibility;

    if (visibility === "foreground") {
      logger.debug(
        "Skipping push for user %s: tab is focused (visibility: %s)",
        params.userId,
        visibility
      );
      return;
    }

    logger.debug(
      "Sending push to user %s: visibility=%s",
      params.userId,
      visibility || "unknown"
    );

    await sendPushOnly(params.userId, {
      title: params.title,
      body: params.body,
      url: params.url ?? "/chat?open_chat_panel=true",
      onlyWhenBlurred: true,
    });
  } catch (error) {
    logger.warn("Failed to send peer action push to user %s: %o", params.userId, error instanceof Error ? error : new Error(String(error)));
  }
}
