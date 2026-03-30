import { beforeEach, describe, expect, it, vi } from "vitest";
import { processClerkWebhookDelivery } from "../../contexts/clerk-webhook-context.js";

const mockHandleClerkWebhookEvent = vi.fn();
const mockGet = vi.fn();
const mockSet = vi.fn();
const mockDel = vi.fn();

vi.mock("@/webhook/clerk-webhook-handler.js", () => ({
  handleClerkWebhookEvent: (...args: unknown[]) => mockHandleClerkWebhookEvent(...args),
}));

vi.mock("@/infra/redis/client.js", () => ({
  redisClient: {
    isOpen: true,
    get: (...args: unknown[]) => mockGet(...args),
    set: (...args: unknown[]) => mockSet(...args),
    del: (...args: unknown[]) => mockDel(...args),
  },
}));

vi.mock("@/infra/redis/timeout-wrapper.js", () => ({
  withRedisTimeout: (operation: () => Promise<unknown>) => operation(),
}));

describe("processClerkWebhookDelivery", () => {
  const deliveryId = "svix_123";
  const event = { type: "user.created", data: { id: "clerk_1", email_addresses: [] } } as any;

  beforeEach(() => {
    vi.clearAllMocks();
    mockGet.mockResolvedValue(null);
    mockSet.mockResolvedValue("OK");
    mockDel.mockResolvedValue(1);
    mockHandleClerkWebhookEvent.mockResolvedValue(undefined);
  });

  it("skips processing when delivery is already marked processed", async () => {
    mockGet.mockResolvedValueOnce("1");

    await processClerkWebhookDelivery(deliveryId, event);

    expect(mockHandleClerkWebhookEvent).not.toHaveBeenCalled();
  });

  it("processes once, then marks processed and clears processing lock", async () => {
    await processClerkWebhookDelivery(deliveryId, event);

    expect(mockHandleClerkWebhookEvent).toHaveBeenCalledTimes(1);
    expect(mockSet).toHaveBeenCalledWith(`webhook:clerk:processing:${deliveryId}`, "1", expect.any(Object));
    expect(mockSet).toHaveBeenCalledWith(`webhook:clerk:processed:${deliveryId}`, "1", expect.any(Object));
    expect(mockDel).toHaveBeenCalledWith(`webhook:clerk:processing:${deliveryId}`);
  });

  it("releases processing lock when handler fails", async () => {
    mockHandleClerkWebhookEvent.mockRejectedValueOnce(new Error("boom"));

    await expect(processClerkWebhookDelivery(deliveryId, event)).rejects.toThrow("boom");
    expect(mockDel).toHaveBeenCalledWith(`webhook:clerk:processing:${deliveryId}`);
  });
});
