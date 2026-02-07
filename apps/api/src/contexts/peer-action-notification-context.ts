import { createLogger } from "@repo/logger";
import { sendPushOnly } from "@/domains/notification/service/push.service.js";

const logger = createLogger("context:peer-action-notification");

export type PeerActionPushParams = {
  userId: string;
  title: string;
  body: string;
  url?: string;
};

export async function sendPeerActionPush(params: PeerActionPushParams): Promise<void> {
  try {
    await sendPushOnly(params.userId, {
      title: params.title,
      body: params.body,
      url: params.url ?? "/chat?open_chat_panel=true",
    });
  } catch (error) {
    logger.warn("Failed to send peer action push to user %s: %o", params.userId, error instanceof Error ? error : new Error(String(error)));
  }
}
