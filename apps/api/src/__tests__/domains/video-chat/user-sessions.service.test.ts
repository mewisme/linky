import type { Namespace, Socket } from "socket.io";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { UserSessionService } from "../../../domains/video-chat/service/user-sessions.service.js";

function mockSocket(id: string, connected = true): Socket {
  return {
    id,
    emit: vi.fn(),
    connected,
  } as unknown as Socket;
}

function mockNamespace(getSocket: (id: string) => Socket | undefined): Namespace {
  return {
    sockets: {
      get: getSocket,
    },
  } as unknown as Namespace;
}

describe("UserSessionService", () => {
  let svc: UserSessionService;

  beforeEach(() => {
    svc = new UserSessionService();
  });

  describe("tryActivateSession", () => {
    it("activates when user has no active session", () => {
      const socket = mockSocket("s1");
      const result = svc.tryActivateSession("u1", socket);

      expect(result).toEqual({ activated: true });
      expect(svc.getActiveSocketId("u1")).toBe("s1");
      expect(svc.isActiveSession("u1", "s1")).toBe(true);
    });

    it("returns activated true when same socket is already active", () => {
      const socket = mockSocket("s1");
      svc.tryActivateSession("u1", socket);
      const result = svc.tryActivateSession("u1", socket);

      expect(result).toEqual({ activated: true });
    });

    it("queues when user has active session with different socket and returns position", () => {
      const s1 = mockSocket("s1");
      const s2 = mockSocket("s2");
      svc.tryActivateSession("u1", s1);
      const result = svc.tryActivateSession("u1", s2);

      expect(result).toEqual({ activated: false, positionInQueue: 1 });
      expect(svc.getActiveSocketId("u1")).toBe("s1");
      expect(svc.getQueuePosition("u1", "s2")).toBe(1);
      expect(svc.getQueueSize("u1")).toBe(1);
    });

    it("when already in queue: returns activated false and positionInQueue", () => {
      const s1 = mockSocket("s1");
      const s2 = mockSocket("s2");
      const s3 = mockSocket("s3");
      svc.tryActivateSession("u1", s1);
      svc.tryActivateSession("u1", s2);
      const result = svc.tryActivateSession("u1", s3);

      expect(result.activated).toBe(false);
      expect(result.positionInQueue).toBe(2);
      const again = svc.tryActivateSession("u1", s2);
      expect(again.activated).toBe(false);
      expect(again.positionInQueue).toBe(1);
    });

    it("when io provided and active socket is disconnected: clears stale and activates new socket", () => {
      const s1 = mockSocket("s1", false);
      const s2 = mockSocket("s2");
      svc.tryActivateSession("u1", s1);
      const io = mockNamespace((id) => (id === "s1" ? s1 : id === "s2" ? s2 : undefined));
      const result = svc.tryActivateSession("u1", s2, io);

      expect(result).toEqual({ activated: true });
      expect(svc.getActiveSocketId("u1")).toBe("s2");
    });

    it("when userId is unknown: returns activated true without storing", () => {
      const socket = mockSocket("s1");
      const result = svc.tryActivateSession("unknown", socket);

      expect(result).toEqual({ activated: true });
      expect(svc.getActiveSocketId("unknown")).toBeUndefined();
    });
  });

  describe("deactivateSession", () => {
    it("when active socket deactivates: removes from active, promotes next from queue and emits session-activated", () => {
      const s1 = mockSocket("s1");
      const s2 = mockSocket("s2");
      svc.tryActivateSession("u1", s1);
      svc.tryActivateSession("u1", s2);

      svc.deactivateSession("u1", "s1");

      expect(svc.getActiveSocketId("u1")).toBe("s2");
      expect(svc.getQueueSize("u1")).toBe(0);
      expect(s2.emit).toHaveBeenCalledWith("session-activated", expect.objectContaining({ message: expect.any(String) }));
    });

    it("when deactivating socket that is in queue: removes from queue only", () => {
      const s1 = mockSocket("s1");
      const s2 = mockSocket("s2");
      svc.tryActivateSession("u1", s1);
      svc.tryActivateSession("u1", s2);

      svc.deactivateSession("u1", "s2");

      expect(svc.getActiveSocketId("u1")).toBe("s1");
      expect(svc.getQueueSize("u1")).toBe(0);
    });

    it("when deactivating active and queue empty: just removes active", () => {
      const s1 = mockSocket("s1");
      svc.tryActivateSession("u1", s1);

      svc.deactivateSession("u1", "s1");

      expect(svc.getActiveSocketId("u1")).toBeUndefined();
    });
  });

  describe("isActiveSession", () => {
    it("returns true when userId has active socketId", () => {
      const s1 = mockSocket("s1");
      svc.tryActivateSession("u1", s1);
      expect(svc.isActiveSession("u1", "s1")).toBe(true);
    });

    it("returns false when different socket is active or none", () => {
      const s1 = mockSocket("s1");
      svc.tryActivateSession("u1", s1);
      expect(svc.isActiveSession("u1", "s2")).toBe(false);
      expect(svc.isActiveSession("u2", "s1")).toBe(false);
    });
  });

  describe("getQueuePosition", () => {
    it("returns null when socketId not in queue", () => {
      expect(svc.getQueuePosition("u1", "s1")).toBeNull();
    });

    it("returns 1-based position when in queue", () => {
      const s1 = mockSocket("s1");
      const s2 = mockSocket("s2");
      svc.tryActivateSession("u1", s1);
      svc.tryActivateSession("u1", s2);
      expect(svc.getQueuePosition("u1", "s2")).toBe(1);
    });
  });

  describe("getQueueSize", () => {
    it("returns 0 when no queue", () => {
      expect(svc.getQueueSize("u1")).toBe(0);
    });
  });

  describe("cleanupUserSessions", () => {
    it("removes active and queue, emits session-cancelled to queued sockets", () => {
      const s1 = mockSocket("s1");
      const s2 = mockSocket("s2");
      svc.tryActivateSession("u1", s1);
      svc.tryActivateSession("u1", s2);

      svc.cleanupUserSessions("u1");

      expect(svc.getActiveSocketId("u1")).toBeUndefined();
      expect(svc.getQueueSize("u1")).toBe(0);
      expect(s2.emit).toHaveBeenCalledWith("session-cancelled", expect.objectContaining({ message: expect.any(String) }));
    });
  });
});
