import { describe, it, expect } from "vitest";
import { addDays } from "../../utils/date-helpers.js";

describe("addDays", () => {
  it("adds 1 day", () => {
    expect(addDays("2024-01-15", 1)).toBe("2024-01-16");
  });

  it("subtracts 1 day", () => {
    expect(addDays("2024-01-15", -1)).toBe("2024-01-14");
  });

  it("adds 2 days", () => {
    expect(addDays("2024-01-15", 2)).toBe("2024-01-17");
  });

  it("delta 0 returns same date", () => {
    expect(addDays("2024-06-10", 0)).toBe("2024-06-10");
  });

  it("month rollover: Jan 31 + 1 = Feb 1", () => {
    expect(addDays("2024-01-31", 1)).toBe("2024-02-01");
  });

  it("Feb 28 + 2 in non-leap year = Mar 2", () => {
    expect(addDays("2023-02-28", 2)).toBe("2023-03-02");
  });

  it("Feb 28 + 1 in leap year = Feb 29", () => {
    expect(addDays("2024-02-28", 1)).toBe("2024-02-29");
  });

  it("Feb 29 + 1 in leap year = Mar 1", () => {
    expect(addDays("2024-02-29", 1)).toBe("2024-03-01");
  });

  it("Dec 31 + 1 = Jan 1 next year", () => {
    expect(addDays("2024-12-31", 1)).toBe("2025-01-01");
  });

  it("Jan 1 - 1 = Dec 31 previous year", () => {
    expect(addDays("2024-01-01", -1)).toBe("2023-12-31");
  });
});
