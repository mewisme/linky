import type { verifyToken } from "@clerk/backend";
import type { Socket } from "socket.io";

export interface AuthenticatedSocket extends Socket {
  data: {
    userId?: string;
    userName?: string;
    userImageUrl?: string;
    dbUserId?: string;
    auth?: Awaited<ReturnType<typeof verifyToken>>;
    visibility?: "foreground" | "background";
  };
}

