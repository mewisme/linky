import express from "express";
import { createServer, type Server } from "node:http";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

vi.mock("@/middleware/rate-limit.js", () => ({
  createRateLimitMiddleware: () =>
    (_req: express.Request, _res: express.Response, next: express.NextFunction) => next(),
}));

vi.mock("@/infra/supabase/repositories/call-history.js", () => ({
  getUserIdByClerkId: vi.fn().mockResolvedValue(null),
}));

const recordCallHistoryFromRoom = vi.fn().mockResolvedValue(undefined);
const recordCallHistory = vi.fn().mockResolvedValue(undefined);

vi.mock("@/domains/video-chat/socket/call-history.socket.js", () => ({
  recordCallHistoryFromRoom: (...args: unknown[]) => recordCallHistoryFromRoom(...args),
  recordCallHistory: (...args: unknown[]) => recordCallHistory(...args),
}));

const getVideoChatContext = vi.fn();
vi.mock("@/domains/video-chat/socket/video-chat.socket.js", () => ({
  getVideoChatContext: () => getVideoChatContext(),
}));

const { default: endCallUnloadRouter } = await import(
  "../../../domains/video-chat/http/end-call-unload.route.js"
);

function makeContext(overrides: {
  socketId: string;
  user1ClerkId?: string;
  user2ClerkId?: string;
  socketOnline?: boolean;
  socketUserId?: string;
}) {
  const room = {
    id: "room_1",
    user1: overrides.socketId,
    user2: "peer_socket",
    user1ClerkId: overrides.user1ClerkId,
    user2ClerkId: overrides.user2ClerkId,
    user1DbId: undefined,
    user2DbId: undefined,
    startedAt: new Date(),
    createdAt: new Date(),
    recentChatMessages: [],
  };

  const deleteRoom = vi.fn();

  return {
    deleteRoom,
    context: {
      io: {
        sockets: {
          get: (sid: string) => {
            if (sid === overrides.socketId && overrides.socketOnline) {
              return {
                id: sid,
                connected: true,
                data: { userId: overrides.socketUserId },
                emit: vi.fn(),
              };
            }
            return undefined;
          },
        },
        to: () => ({ emit: vi.fn() }),
      },
      matchmaking: {
        isInQueue: vi.fn().mockResolvedValue(false),
        removeUser: vi.fn().mockResolvedValue(undefined),
        getQueueSize: vi.fn().mockResolvedValue(0),
      },
      rooms: {
        getRoomByUser: (sid: string) => (sid === overrides.socketId ? room : undefined),
        getPeer: () => "peer_socket",
        getRoomCount: () => 0,
        deleteRoom,
      },
    },
    room,
  };
}

function buildApp(callerClerkId: string): express.Application {
  const app = express();
  app.use(express.json());
  app.use((req, _res, next) => {
    (req as express.Request & { auth?: { sub: string } }).auth = { sub: callerClerkId };
    next();
  });
  app.use(endCallUnloadRouter);
  return app;
}

async function withServer(
  app: express.Application,
  fn: (baseUrl: string) => Promise<void>,
): Promise<void> {
  const server: Server = createServer(app);
  await new Promise<void>((resolve, reject) => {
    server.listen(0, "127.0.0.1", () => resolve());
    server.once("error", reject);
  });
  const addr = server.address();
  if (!addr || typeof addr === "string") {
    server.close();
    throw new Error("expected socket address");
  }
  const baseUrl = `http://127.0.0.1:${addr.port}`;
  try {
    await fn(baseUrl);
  } finally {
    await new Promise<void>((resolve, reject) => {
      server.close((err) => (err ? reject(err) : resolve()));
    });
  }
}

describe("POST /end-call-unload — ownership", () => {
  beforeEach(() => {
    recordCallHistoryFromRoom.mockClear();
    recordCallHistory.mockClear();
    getVideoChatContext.mockReset();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it("returns 403 when socket is offline and caller is not the room participant", async () => {
    const { context, deleteRoom } = makeContext({
      socketId: "victim_socket",
      user1ClerkId: "clerk_victim",
      user2ClerkId: "clerk_peer",
      socketOnline: false,
    });
    getVideoChatContext.mockReturnValue(context);

    const app = buildApp("clerk_attacker");
    await withServer(app, async (baseUrl) => {
      const res = await fetch(`${baseUrl}/end-call-unload`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ socketId: "victim_socket" }),
      });
      expect(res.status).toBe(403);
      expect(deleteRoom).not.toHaveBeenCalled();
      expect(recordCallHistoryFromRoom).not.toHaveBeenCalled();
    });
  });

  it("returns 200 and tears down room when socket is offline and caller owns it", async () => {
    const { context, deleteRoom } = makeContext({
      socketId: "owner_socket",
      user1ClerkId: "clerk_owner",
      user2ClerkId: "clerk_peer",
      socketOnline: false,
    });
    getVideoChatContext.mockReturnValue(context);

    const app = buildApp("clerk_owner");
    await withServer(app, async (baseUrl) => {
      const res = await fetch(`${baseUrl}/end-call-unload`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ socketId: "owner_socket" }),
      });
      expect(res.status).toBe(200);
      expect(deleteRoom).toHaveBeenCalledWith("room_1");
    });
  });

  it("returns 403 when socket is online but owned by another user", async () => {
    const { context, deleteRoom } = makeContext({
      socketId: "victim_socket",
      user1ClerkId: "clerk_victim",
      user2ClerkId: "clerk_peer",
      socketOnline: true,
      socketUserId: "clerk_victim",
    });
    getVideoChatContext.mockReturnValue(context);

    const app = buildApp("clerk_attacker");
    await withServer(app, async (baseUrl) => {
      const res = await fetch(`${baseUrl}/end-call-unload`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ socketId: "victim_socket" }),
      });
      expect(res.status).toBe(403);
      expect(deleteRoom).not.toHaveBeenCalled();
    });
  });
});
