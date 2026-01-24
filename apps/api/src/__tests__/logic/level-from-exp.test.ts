import { describe, it, expect } from "vitest";
import { calculateLevelFromExp } from "../../domains/user/service/user-level.service.js";

const DEFAULT = { base: 300, step: 120 };

describe("calculateLevelFromExp", () => {
  describe("totalExpSeconds <= 0", () => {
    it("returns level 1 and expToNextLevel base when totalExpSeconds is 0", () => {
      expect(calculateLevelFromExp(0, DEFAULT)).toEqual({ level: 1, expToNextLevel: 300 });
    });

    it("returns level 1 and expToNextLevel base when totalExpSeconds is negative", () => {
      expect(calculateLevelFromExp(-1, DEFAULT)).toEqual({ level: 1, expToNextLevel: 300 });
    });

    it("uses custom params when provided", () => {
      expect(calculateLevelFromExp(0, { base: 100, step: 50 })).toEqual({ level: 1, expToNextLevel: 100 });
    });
  });

  describe("discriminant < 0", () => {
    it("returns level 1 and base expToNextLevel when params yield degenerate case", () => {
      const result = calculateLevelFromExp(0, { base: 100, step: 50 });
      expect(result.level).toBe(1);
      expect(result.expToNextLevel).toBe(100);
    });
  });

  describe("exact points with base=300, step=120", () => {
    it("at 0 EXP: level 1, expToNextLevel 300", () => {
      expect(calculateLevelFromExp(0, DEFAULT)).toEqual({ level: 1, expToNextLevel: 300 });
    });

    it("at 300 EXP: level and expToNextLevel consistent with formula", () => {
      const r = calculateLevelFromExp(300, DEFAULT);
      expect(r.level).toBeGreaterThanOrEqual(1);
      expect(r.expToNextLevel).toBeGreaterThan(0);
    });

    it("at 420 EXP: level and expToNextLevel consistent with formula", () => {
      const r = calculateLevelFromExp(420, DEFAULT);
      expect(r.level).toBeGreaterThanOrEqual(1);
      expect(r.expToNextLevel).toBeGreaterThan(0);
    });

    it("at 600 EXP: level 3", () => {
      const r = calculateLevelFromExp(600, DEFAULT);
      expect(r.level).toBe(3);
      expect(r.expToNextLevel).toBeGreaterThan(0);
    });
  });

  describe("custom params", () => {
    it("respects base and step", () => {
      const r = calculateLevelFromExp(500, { base: 200, step: 100 });
      expect(r.level).toBeGreaterThanOrEqual(1);
      expect(r.expToNextLevel).toBeGreaterThan(0);
    });
  });

  describe("default params", () => {
    it("uses DEFAULT_LEVEL_PARAMS when params omitted", () => {
      expect(calculateLevelFromExp(0)).toEqual({ level: 1, expToNextLevel: 300 });
    });
  });
});
