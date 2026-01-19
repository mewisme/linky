import type { VideoChatContext } from "./types.js";

let videoChatContext: VideoChatContext | null = null;

export function setVideoChatContext(context: VideoChatContext): void {
  videoChatContext = context;
}

export function getVideoChatContext(): VideoChatContext | null {
  return videoChatContext;
}
