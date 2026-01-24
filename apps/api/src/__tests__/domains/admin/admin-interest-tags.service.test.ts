import { describe, it, expect, vi, beforeEach } from "vitest";
import { importInterestTags } from "../../../domains/admin/service/admin-interest-tags.service.js";
import type { InterestTagsImportRequestBody } from "../../../domains/admin/types/admin.types.js";

const mockGetInterestTags = vi.fn();
const mockCreateInterestTag = vi.fn();
const mockUpdateInterestTag = vi.fn();

vi.mock("../../../infra/supabase/repositories/interest-tags.js", () => ({
  getInterestTags: (...args: unknown[]) => mockGetInterestTags(...args),
  createInterestTag: (...args: unknown[]) => mockCreateInterestTag(...args),
  updateInterestTag: (...args: unknown[]) => mockUpdateInterestTag(...args),
}));

beforeEach(() => {
  vi.clearAllMocks();
  mockGetInterestTags.mockResolvedValue({ data: [], count: 0 });
  mockCreateInterestTag.mockResolvedValue({ id: "created-id" });
  mockUpdateInterestTag.mockResolvedValue({});
});

describe("importInterestTags", () => {
  it("returns zeros when items is empty or missing", async () => {
    expect(await importInterestTags({ items: [] })).toEqual({
      total: 0,
      created: 0,
      updated: 0,
      skipped_invalid: 0,
    });
    expect(await importInterestTags({} as unknown as InterestTagsImportRequestBody)).toEqual({
      total: 0,
      created: 0,
      updated: 0,
      skipped_invalid: 0,
    });
    expect(mockGetInterestTags).not.toHaveBeenCalled();
    expect(mockCreateInterestTag).not.toHaveBeenCalled();
    expect(mockUpdateInterestTag).not.toHaveBeenCalled();
  });

  it("creates new tag when display_name does not exist", async () => {
    const result = await importInterestTags({
      items: [{ display_name: "Technology", category: "Hobbies" }],
    });
    expect(result).toEqual({
      total: 1,
      created: 1,
      updated: 0,
      skipped_invalid: 0,
    });
    expect(mockCreateInterestTag).toHaveBeenCalledTimes(1);
    expect(mockCreateInterestTag).toHaveBeenCalledWith({
      name: "Technology",
      category: "Hobbies",
      icon: null,
      description: null,
      is_active: true,
    });
    expect(mockUpdateInterestTag).not.toHaveBeenCalled();
  });

  it("updates existing tag when display_name exists", async () => {
    mockGetInterestTags.mockResolvedValue({
      data: [{ id: "existing-1", name: "Technology" }],
      count: 1,
    });
    const result = await importInterestTags({
      items: [{ display_name: "Technology", category: "Tech" }],
    });
    expect(result).toEqual({
      total: 1,
      created: 0,
      updated: 1,
      skipped_invalid: 0,
    });
    expect(mockCreateInterestTag).not.toHaveBeenCalled();
    expect(mockUpdateInterestTag).toHaveBeenCalledTimes(1);
    expect(mockUpdateInterestTag).toHaveBeenCalledWith("existing-1", { category: "Tech" });
  });

  it("partial field update: only provided fields are sent to update", async () => {
    mockGetInterestTags.mockResolvedValue({
      data: [{ id: "existing-1", name: "Music" }],
      count: 1,
    });
    const result = await importInterestTags({
      items: [{ display_name: "Music", category: "Arts" }],
    });
    expect(result).toEqual({
      total: 1,
      created: 0,
      updated: 1,
      skipped_invalid: 0,
    });
    expect(mockUpdateInterestTag).toHaveBeenCalledWith("existing-1", { category: "Arts" });
    expect(mockUpdateInterestTag).not.toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ icon: expect.anything(), description: expect.anything(), is_active: expect.anything() })
    );
  });

  it("case-insensitive display_name matching for update", async () => {
    mockGetInterestTags.mockResolvedValue({
      data: [{ id: "id-1", name: "Technology" }],
      count: 1,
    });
    const result = await importInterestTags({
      items: [
        { display_name: "technology", category: "Cat1" },
        { display_name: "  TECHNOLOGY  ", is_active: false },
      ],
    });
    expect(result).toEqual({
      total: 2,
      created: 0,
      updated: 2,
      skipped_invalid: 0,
    });
    expect(mockUpdateInterestTag).toHaveBeenCalledWith("id-1", { category: "Cat1" });
    expect(mockUpdateInterestTag).toHaveBeenCalledWith("id-1", { is_active: false });
    expect(mockCreateInterestTag).not.toHaveBeenCalled();
  });

  it("invalid item skipped without affecting valid items", async () => {
    mockGetInterestTags.mockResolvedValue({ data: [], count: 0 });
    const result = await importInterestTags({
      items: [
        { display_name: "Valid" },
        { display_name: "" },
        { display_name: "AlsoValid", category: "X" },
      ],
    });
    expect(result).toEqual({
      total: 3,
      created: 2,
      updated: 0,
      skipped_invalid: 1,
    });
    expect(mockCreateInterestTag).toHaveBeenCalledTimes(2);
  });

  it("same display_name twice in payload: first create, second update", async () => {
    mockGetInterestTags.mockResolvedValue({ data: [], count: 0 });
    mockCreateInterestTag.mockResolvedValueOnce({ id: "new-1" });
    const result = await importInterestTags({
      items: [
        { display_name: "Tech" },
        { display_name: "Tech", category: "UpdatedCat" },
      ],
    });
    expect(result).toEqual({
      total: 2,
      created: 1,
      updated: 1,
      skipped_invalid: 0,
    });
    expect(mockCreateInterestTag).toHaveBeenCalledTimes(1);
    expect(mockUpdateInterestTag).toHaveBeenCalledTimes(1);
    expect(mockUpdateInterestTag).toHaveBeenCalledWith("new-1", { category: "UpdatedCat" });
  });

  it("skips invalid items: empty display_name, non-string, over 100 chars", async () => {
    const result = await importInterestTags({
      items: [
        { display_name: "" },
        { display_name: "   " },
        { display_name: 123 as unknown as string },
        { display_name: "x".repeat(101) },
      ],
    });
    expect(result).toEqual({
      total: 4,
      created: 0,
      updated: 0,
      skipped_invalid: 4,
    });
    expect(mockCreateInterestTag).not.toHaveBeenCalled();
    expect(mockUpdateInterestTag).not.toHaveBeenCalled();
  });

  it("skips invalid optional fields: category/icon over 50 chars, description non-string, is_active non-boolean", async () => {
    const result = await importInterestTags({
      items: [
        { display_name: "A", category: "x".repeat(51) },
        { display_name: "B", icon: "y".repeat(51) },
        { display_name: "C", description: 1 as unknown as string },
        { display_name: "D", is_active: "yes" as unknown as boolean },
      ],
    });
    expect(result).toEqual({
      total: 4,
      created: 0,
      updated: 0,
      skipped_invalid: 4,
    });
    expect(mockCreateInterestTag).not.toHaveBeenCalled();
    expect(mockUpdateInterestTag).not.toHaveBeenCalled();
  });

  it("update with no optional fields present: counts as updated, does not call updateInterestTag", async () => {
    mockGetInterestTags.mockResolvedValue({
      data: [{ id: "id-1", name: "Existing" }],
      count: 1,
    });
    const result = await importInterestTags({
      items: [{ display_name: "Existing" }],
    });
    expect(result).toEqual({
      total: 1,
      created: 0,
      updated: 1,
      skipped_invalid: 0,
    });
    expect(mockUpdateInterestTag).not.toHaveBeenCalled();
  });

  it("on createInterestTag error: rethrows", async () => {
    mockCreateInterestTag.mockRejectedValueOnce(new Error("connection refused"));
    await expect(importInterestTags({ items: [{ display_name: "X" }] })).rejects.toThrow(
      "connection refused"
    );
  });
});
