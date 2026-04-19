import type { ConnectionStatus } from "@/features/call/model/video-chat-store";

export function isVideoChatBlockingLocaleChange(status: ConnectionStatus): boolean {
  return status !== "idle" && status !== "ended";
}
