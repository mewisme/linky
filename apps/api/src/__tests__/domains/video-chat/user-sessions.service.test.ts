import type { Namespace, Socket } from "socket.io";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { UserSessionService } from "../../../domains/video-chat/service/user-sessions.service.js";

function mockSocket(id: string, connected = true): Socket {
  return {
    id,
    emit: vi.fn(),
    disconnect: vi.fn(),
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
      const io = mockNamespace((id) => (id === "s1" ? socket : undefined));
      const result = svc.tryActivateSession("u1", socket, io);

      expect(result.activated).toBe(true);
      expect(svc.getActiveSocketId("u1")).toBe("s1");
      expect(svc.isActiveSession("u1", "s1", io)).toBe(true);
    });

    it("returns activated true when same socket is already active", () => {
      const socket = mockSocket("s1");
      const io = mockNamespace((id) => (id === "s1" ? socket : undefined));
      svc.tryActivateSession("u1", socket, io);
      const result = svc.tryActivateSession("u1", socket, io);

      expect(result.activated).toBe(true);
      expect(svc.getActiveSocketId("u1")).toBe("s1");
    });

    it("replaces existing session when a new socket connects", () => {
      const s1 = mockSocket("s1");
      const s2 = mockSocket("s2");
      const io = mockNamespace((id) => (id === "s1" ? s1 : id === "s2" ? s2 : undefined));
      svc.tryActivateSession("u1", s1, io);
      svc.tryActivateSession("u1", s2, io);

      expect(svc.getActiveSocketId("u1")).toBe("s2");
      expect(s1.emit).toHaveBeenCalledWith("session-replaced", expect.objectContaining({ message: expect.any(String) }));
      expect(s1.disconnect).toHaveBeenCalledWith(true);
      expect(svc.isReplacedSocket("s1")).toBe(true);
    });

    it("marks replaced socket and allows acknowledgement", () => {
      const s1 = mockSocket("s1");
      const s2 = mockSocket("s2");
      const io = mockNamespace((id) => (id === "s1" ? s1 : id === "s2" ? s2 : undefined));
      svc.tryActivateSession("u1", s1, io);
      svc.tryActivateSession("u1", s2, io);

      expect(svc.isReplacedSocket("s1")).toBe(true);
      svc.acknowledgeReplacedSocket("s1");
      expect(svc.isReplacedSocket("s1")).toBe(false);
    });

    it("clears stale session when existing socket is disconnected", () => {
      const s1 = mockSocket("s1", false);
      const s2 = mockSocket("s2");
      const io = mockNamespace((id) => (id === "s1" ? s1 : id === "s2" ? s2 : undefined));
      svc.tryActivateSession("u1", s1, io);
      const result = svc.tryActivateSession("u1", s2, io);

      expect(result.activated).toBe(true);
      expect(svc.getActiveSocketId("u1")).toBe("s2");
    });

    it("when userId is unknown: returns activated true without storing", () => {
      const socket = mockSocket("s1");
      const io = mockNamespace((id) => (id === "s1" ? socket : undefined));
      const result = svc.tryActivateSession("unknown", socket, io);

      expect(result.activated).toBe(true);
      expect(svc.getActiveSocketId("unknown")).toBeUndefined();
    });
  });

  describe("deactivateSession", () => {
    it("removes active session when owning socket disconnects", () => {
      const s1 = mockSocket("s1");
      const io = mockNamespace((id) => (id === "s1" ? s1 : undefined));
      svc.tryActivateSession("u1", s1, io);

      svc.deactivateSession("u1", "s1");

      expect(svc.getActiveSocketId("u1")).toBeUndefined();
    });

    it("does nothing when non-owning socket attempts to deactivate", () => {
      const s1 = mockSocket("s1");
      const s2 = mockSocket("s2");
      const io = mockNamespace((id) => (id === "s1" ? s1 : id === "s2" ? s2 : undefined));
      svc.tryActivateSession("u1", s1, io);

      svc.deactivateSession("u1", "s2");

      expect(svc.getActiveSocketId("u1")).toBe("s1");
    });
  });

  describe("isActiveSession", () => {
    it("returns true when userId has active socketId", () => {
      const s1 = mockSocket("s1");
      const io = mockNamespace((id) => (id === "s1" ? s1 : undefined));
      svc.tryActivateSession("u1", s1, io);
      expect(svc.isActiveSession("u1", "s1", io)).toBe(true);
    });

    it("returns false when different socket is active or none", () => {
      const s1 = mockSocket("s1");
      const io = mockNamespace((id) => (id === "s1" ? s1 : undefined));
      svc.tryActivateSession("u1", s1, io);
      expect(svc.isActiveSession("u1", "s2", io)).toBe(false);
      expect(svc.isActiveSession("u2", "s1", io)).toBe(false);
    });

    it("returns false and clears session when socket is disconnected", () => {
      const s1 = mockSocket("s1", false);
      const io = mockNamespace((id) => (id === "s1" ? s1 : undefined));
      svc.tryActivateSession("u1", s1, io);

      expect(svc.isActiveSession("u1", "s1", io)).toBe(false);
      expect(svc.getActiveSocketId("u1")).toBeUndefined();
    });
  });
});
