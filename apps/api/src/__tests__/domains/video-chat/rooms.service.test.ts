import { describe, it, expect, beforeEach, vi } from "vitest";
import { RoomService } from "../../../domains/video-chat/service/rooms.service.js";

describe("RoomService", () => {
  let svc: RoomService;

  beforeEach(() => {
    svc = new RoomService();
  });

  describe("createRoom", () => {
    it("creates room with id format room_user1_user2_timestamp and maps both users to room", () => {
      const id = svc.createRoom("s1", "s2");

      expect(id).toMatch(/^room_s1_s2_\d+$/);
      expect(svc.getRoom(id)).toBeDefined();
      expect(svc.getRoomByUser("s1")?.id).toBe(id);
      expect(svc.getRoomByUser("s2")?.id).toBe(id);
    });

    it("room has user1, user2, startedAt, createdAt", () => {
      const id = svc.createRoom("a", "b");
      const room = svc.getRoom(id)!;

      expect(room.user1).toBe("a");
      expect(room.user2).toBe("b");
      expect(room.startedAt).toBeInstanceOf(Date);
      expect(room.createdAt).toBeInstanceOf(Date);
    });
  });

  describe("getRoom", () => {
    it("returns undefined for unknown roomId", () => {
      expect(svc.getRoom("unknown")).toBeUndefined();
    });
  });

  describe("getRoomByUser", () => {
    it("returns undefined when user not in any room", () => {
      expect(svc.getRoomByUser("s1")).toBeUndefined();
    });

    it("returns room when user is in one", () => {
      const id = svc.createRoom("s1", "s2");
      expect(svc.getRoomByUser("s1")?.id).toBe(id);
    });
  });

  describe("getPeer", () => {
    it("returns null when user not in room", () => {
      expect(svc.getPeer("s1")).toBeNull();
    });

    it("returns the other user in the room", () => {
      svc.createRoom("s1", "s2");
      expect(svc.getPeer("s1")).toBe("s2");
      expect(svc.getPeer("s2")).toBe("s1");
    });
  });

  describe("deleteRoom", () => {
    it("removes room and user-to-room mappings", () => {
      const id = svc.createRoom("s1", "s2");
      svc.deleteRoom(id);

      expect(svc.getRoom(id)).toBeUndefined();
      expect(svc.getRoomByUser("s1")).toBeUndefined();
      expect(svc.getRoomByUser("s2")).toBeUndefined();
    });

    it("is no-op when roomId does not exist", () => {
      svc.deleteRoom("nonexistent");
    });
  });

  describe("deleteRoomByUser", () => {
    it("returns null when user not in room", () => {
      expect(svc.deleteRoomByUser("s1")).toBeNull();
    });

    it("returns room and deletes it when user is in room", () => {
      const id = svc.createRoom("s1", "s2");
      const room = svc.deleteRoomByUser("s1");

      expect(room).not.toBeNull();
      expect(room!.id).toBe(id);
      expect(svc.getRoom(id)).toBeUndefined();
    });
  });

  describe("isInRoom", () => {
    it("returns false when user not in any room", () => {
      expect(svc.isInRoom("s1")).toBe(false);
    });

    it("returns true when user is in room", () => {
      svc.createRoom("s1", "s2");
      expect(svc.isInRoom("s1")).toBe(true);
    });
  });

  describe("getRoomCount", () => {
    it("returns 0 when no rooms", () => {
      expect(svc.getRoomCount()).toBe(0);
    });

    it("returns number of rooms", () => {
      svc.createRoom("a", "b");
      expect(svc.getRoomCount()).toBe(1);
      svc.createRoom("c", "d");
      expect(svc.getRoomCount()).toBe(2);
    });
  });

  describe("updateSocketId", () => {
    it("returns false when oldSocketId not in any room", () => {
      expect(svc.updateSocketId("old", "new")).toBe(false);
    });

    it("updates user1 socket id and remaps userToRoom", () => {
      const id = svc.createRoom("old", "s2");
      const ok = svc.updateSocketId("old", "new");

      expect(ok).toBe(true);
      const room = svc.getRoom(id)!;
      expect(room.user1).toBe("new");
      expect(room.user2).toBe("s2");
      expect(svc.getRoomByUser("old")).toBeUndefined();
      expect(svc.getRoomByUser("new")?.id).toBe(id);
    });

    it("updates user2 socket id", () => {
      const id = svc.createRoom("s1", "old");
      svc.updateSocketId("old", "new");

      const room = svc.getRoom(id)!;
      expect(room.user2).toBe("new");
      expect(svc.getRoomByUser("new")?.id).toBe(id);
    });
  });

  describe("findRoomByUserId", () => {
    it("returns null when no room has a socket with data.userId matching", () => {
      svc.createRoom("s1", "s2");
      const io = { sockets: { get: vi.fn().mockReturnValue(null) } };

      expect(svc.findRoomByUserId("clerk_x", io as any)).toBeNull();
    });

    it("returns room when user1 socket has data.userId equal to userId", () => {
      const id = svc.createRoom("s1", "s2");
      const io = {
        sockets: {
          get: (sid: string) => (sid === "s1" ? { data: { userId: "clerk_x" } } : null),
        },
      };

      expect(svc.findRoomByUserId("clerk_x", io as any)?.id).toBe(id);
    });

    it("returns room when user2 socket has data.userId equal to userId", () => {
      const id = svc.createRoom("s1", "s2");
      const io = {
        sockets: {
          get: (sid: string) => (sid === "s2" ? { data: { userId: "clerk_y" } } : null),
        },
      };

      expect(svc.findRoomByUserId("clerk_y", io as any)?.id).toBe(id);
    });
  });

  describe("getAllRooms", () => {
    it("returns empty array when no rooms", () => {
      expect(svc.getAllRooms()).toEqual([]);
    });

    it("returns all room records", () => {
      svc.createRoom("a", "b");
      svc.createRoom("c", "d");
      const all = svc.getAllRooms();
      expect(all).toHaveLength(2);
    });
  });
});
