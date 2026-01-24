import { describe, it, expect } from "vitest";
import { computeNewSharedStreakCount } from "../../infra/supabase/repositories/shared-streak-logic.js";

describe("computeNewSharedStreakCount", () => {
  describe("!last", () => {
    it("returns newCurrent 1 and newLongest max(1, existing.longest_streak)", () => {
      expect(
        computeNewSharedStreakCount(
          { last_valid_date: null, current_streak: 0, longest_streak: 5 },
          "2024-01-15",
        ),
      ).toEqual({ newCurrent: 1, newLongest: 5 });
    });

    it("when longest_streak is 0, newLongest is 1", () => {
      expect(
        computeNewSharedStreakCount(
          { last_valid_date: null, current_streak: 0, longest_streak: 0 },
          "2024-01-15",
        ),
      ).toEqual({ newCurrent: 1, newLongest: 1 });
    });
  });

  describe("diffDays === 1 (consecutive)", () => {
    it("increments current_streak and updates newLongest", () => {
      expect(
        computeNewSharedStreakCount(
          { last_valid_date: "2024-01-14", current_streak: 3, longest_streak: 5 },
          "2024-01-15",
        ),
      ).toEqual({ newCurrent: 4, newLongest: 5 });
    });

    it("newLongest increases when newCurrent exceeds it", () => {
      expect(
        computeNewSharedStreakCount(
          { last_valid_date: "2024-01-14", current_streak: 4, longest_streak: 4 },
          "2024-01-15",
        ),
      ).toEqual({ newCurrent: 5, newLongest: 5 });
    });
  });

  describe("diffDays !== 1 (gap: 0, 2, 3)", () => {
    it("diffDays 0: resets to newCurrent 1, newLongest unchanged", () => {
      expect(
        computeNewSharedStreakCount(
          { last_valid_date: "2024-01-15", current_streak: 3, longest_streak: 5 },
          "2024-01-15",
        ),
      ).toEqual({ newCurrent: 1, newLongest: 5 });
    });

    it("diffDays 2: resets to newCurrent 1", () => {
      expect(
        computeNewSharedStreakCount(
          { last_valid_date: "2024-01-13", current_streak: 3, longest_streak: 5 },
          "2024-01-15",
        ),
      ).toEqual({ newCurrent: 1, newLongest: 5 });
    });

    it("diffDays 3: resets to newCurrent 1", () => {
      expect(
        computeNewSharedStreakCount(
          { last_valid_date: "2024-01-12", current_streak: 2, longest_streak: 10 },
          "2024-01-15",
        ),
      ).toEqual({ newCurrent: 1, newLongest: 10 });
    });
  });
});
