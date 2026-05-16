import { createServer } from "node:http";

import express from "express";
import { afterEach, beforeAll, describe, expect, it, vi } from "vitest";

const SELF_USER_ID = "11111111-1111-4111-8111-111111111111";
const OTHER_USER_ID = "22222222-2222-4222-8222-222222222222";
const SELF_CLERK_ID = "user_self";

const getUserIdByClerkId = vi.fn().mockResolvedValue(SELF_USER_ID);
const getUploadUrl = vi.fn().mockResolvedValue("https://s3.example/upload");
const getDownloadUrl = vi.fn().mockResolvedValue("https://s3.example/download");
const startMultipart = vi.fn().mockResolvedValue("upload-id");
const getPartUploadUrl = vi.fn().mockResolvedValue("https://s3.example/part");
const completeMultipart = vi.fn().mockResolvedValue(undefined);
const abortMultipart = vi.fn().mockResolvedValue(undefined);

vi.mock("@/infra/supabase/repositories/call-history.js", () => ({
  getUserIdByClerkId: (...args: unknown[]) => getUserIdByClerkId(...args),
}));

vi.mock("@/infra/s3/presigned.js", () => ({
  getUploadUrl: (...args: unknown[]) => getUploadUrl(...args),
  getDownloadUrl: (...args: unknown[]) => getDownloadUrl(...args),
}));

vi.mock("@/infra/s3/multipart.js", () => ({
  startMultipart: (...args: unknown[]) => startMultipart(...args),
  getPartUploadUrl: (...args: unknown[]) => getPartUploadUrl(...args),
  completeMultipart: (...args: unknown[]) => completeMultipart(...args),
  abortMultipart: (...args: unknown[]) => abortMultipart(...args),
}));

vi.mock("@/config/index.js", () => ({
  config: {
    s3Bucket: "test-bucket",
  },
}));

let s3MeRouter: express.Router;

beforeAll(async () => {
  s3MeRouter = (await import("@/routes/media/s3-me.js")).default;
});

afterEach(() => {
  getUserIdByClerkId.mockClear();
  getUserIdByClerkId.mockResolvedValue(SELF_USER_ID);
  getUploadUrl.mockClear();
  getDownloadUrl.mockClear();
  startMultipart.mockClear();
  getPartUploadUrl.mockClear();
  completeMultipart.mockClear();
  abortMultipart.mockClear();
});

function makeApp(authSub: string | null): express.Application {
  const app = express();
  app.use(express.json());
  app.use((req, _res, next) => {
    if (authSub) {
      (req as unknown as { auth: { sub: string } }).auth = { sub: authSub };
    }
    next();
  });
  app.use("/api/v1/me/s3", s3MeRouter);
  return app;
}

async function withServer(
  app: express.Application,
  fn: (baseUrl: string) => Promise<void>,
): Promise<void> {
  const server = createServer(app);
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

describe("member s3 router (/api/v1/me/s3)", () => {
  describe("auth", () => {
    it("returns 401 when there is no auth.sub", async () => {
      const app = makeApp(null);
      await withServer(app, async (baseUrl) => {
        const res = await fetch(
          `${baseUrl}/api/v1/me/s3/presigned/upload?key=${encodeURIComponent(`users/${SELF_USER_ID}/avatar.png`)}`,
        );
        expect(res.status).toBe(401);
        expect(getUploadUrl).not.toHaveBeenCalled();
      });
    });

    it("returns 404 when clerk id does not resolve to a db user", async () => {
      getUserIdByClerkId.mockResolvedValueOnce(null);
      const app = makeApp(SELF_CLERK_ID);
      await withServer(app, async (baseUrl) => {
        const res = await fetch(
          `${baseUrl}/api/v1/me/s3/presigned/upload?key=${encodeURIComponent(`users/${SELF_USER_ID}/avatar.png`)}`,
        );
        expect(res.status).toBe(404);
      });
    });
  });

  describe("GET /presigned/upload", () => {
    it("returns 200 for a key under the user's own prefix", async () => {
      const app = makeApp(SELF_CLERK_ID);
      await withServer(app, async (baseUrl) => {
        const res = await fetch(
          `${baseUrl}/api/v1/me/s3/presigned/upload?key=${encodeURIComponent(`users/${SELF_USER_ID}/avatar.png`)}`,
        );
        expect(res.status).toBe(200);
        const body = (await res.json()) as { url: string; method: string };
        expect(body.url).toBe("https://s3.example/upload");
        expect(body.method).toBe("PUT");
        expect(getUploadUrl).toHaveBeenCalledTimes(1);
      });
    });

    it("returns 400 for keys outside the user's prefix", async () => {
      const app = makeApp(SELF_CLERK_ID);
      const badKeys = [
        "admin/rewards/x.png",
        `users/${OTHER_USER_ID}/avatar.png`,
        "/etc/passwd",
        "users/",
        "",
      ];
      await withServer(app, async (baseUrl) => {
        for (const key of badKeys) {
          const res = await fetch(
            `${baseUrl}/api/v1/me/s3/presigned/upload?key=${encodeURIComponent(key)}`,
          );
          expect(res.status, `expected 400 for key=${key}`).toBe(400);
        }
        expect(getUploadUrl).not.toHaveBeenCalled();
      });
    });

    it("rejects path-traversal payloads even when the prefix appears valid", async () => {
      const app = makeApp(SELF_CLERK_ID);
      const traversalKeys = [
        `users/${SELF_USER_ID}/../${OTHER_USER_ID}/avatar.png`,
        `users/${SELF_USER_ID}/sub/../../${OTHER_USER_ID}/x.png`,
        `users\\${SELF_USER_ID}\\avatar.png`,
        `users/${SELF_USER_ID}%2F..%2F${OTHER_USER_ID}/x.png`,
      ];
      await withServer(app, async (baseUrl) => {
        for (const key of traversalKeys) {
          const res = await fetch(
            `${baseUrl}/api/v1/me/s3/presigned/upload?key=${encodeURIComponent(key)}`,
          );
          expect(res.status, `expected 400 for traversal key=${key}`).toBe(400);
        }
        expect(getUploadUrl).not.toHaveBeenCalled();
      });
    });
  });

  describe("GET /presigned/download", () => {
    it("returns 200 for own prefix and 400 otherwise", async () => {
      const app = makeApp(SELF_CLERK_ID);
      await withServer(app, async (baseUrl) => {
        const ok = await fetch(
          `${baseUrl}/api/v1/me/s3/presigned/download?key=${encodeURIComponent(`users/${SELF_USER_ID}/avatar.png`)}`,
        );
        expect(ok.status).toBe(200);

        const bad = await fetch(
          `${baseUrl}/api/v1/me/s3/presigned/download?key=${encodeURIComponent(`users/${OTHER_USER_ID}/avatar.png`)}`,
        );
        expect(bad.status).toBe(400);
        expect(getDownloadUrl).toHaveBeenCalledTimes(1);
      });
    });
  });

  describe("multipart endpoints", () => {
    it("start: 200 for own key, 400 for foreign key", async () => {
      const app = makeApp(SELF_CLERK_ID);
      await withServer(app, async (baseUrl) => {
        const ok = await fetch(`${baseUrl}/api/v1/me/s3/multipart/start`, {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ key: `users/${SELF_USER_ID}/file.bin` }),
        });
        expect(ok.status).toBe(200);

        const bad = await fetch(`${baseUrl}/api/v1/me/s3/multipart/start`, {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ key: `users/${OTHER_USER_ID}/file.bin` }),
        });
        expect(bad.status).toBe(400);
        expect(startMultipart).toHaveBeenCalledTimes(1);
      });
    });

    it("part url: 200 for own key, 400 for foreign key", async () => {
      const app = makeApp(SELF_CLERK_ID);
      await withServer(app, async (baseUrl) => {
        const ok = await fetch(
          `${baseUrl}/api/v1/me/s3/multipart/upload-id/part/1?key=${encodeURIComponent(`users/${SELF_USER_ID}/file.bin`)}`,
        );
        expect(ok.status).toBe(200);

        const bad = await fetch(
          `${baseUrl}/api/v1/me/s3/multipart/upload-id/part/1?key=${encodeURIComponent(`users/${OTHER_USER_ID}/file.bin`)}`,
        );
        expect(bad.status).toBe(400);
        expect(getPartUploadUrl).toHaveBeenCalledTimes(1);
      });
    });

    it("complete: 200 for own key, 400 for foreign key", async () => {
      const app = makeApp(SELF_CLERK_ID);
      await withServer(app, async (baseUrl) => {
        const ok = await fetch(`${baseUrl}/api/v1/me/s3/multipart/complete`, {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            key: `users/${SELF_USER_ID}/file.bin`,
            uploadId: "u1",
            parts: [{ partNumber: 1, etag: "etag1" }],
          }),
        });
        expect(ok.status).toBe(200);

        const bad = await fetch(`${baseUrl}/api/v1/me/s3/multipart/complete`, {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            key: `users/${OTHER_USER_ID}/file.bin`,
            uploadId: "u1",
            parts: [{ partNumber: 1, etag: "etag1" }],
          }),
        });
        expect(bad.status).toBe(400);
        expect(completeMultipart).toHaveBeenCalledTimes(1);
      });
    });

    it("abort: 200 for own key, 400 for foreign key", async () => {
      const app = makeApp(SELF_CLERK_ID);
      await withServer(app, async (baseUrl) => {
        const ok = await fetch(`${baseUrl}/api/v1/me/s3/multipart/abort`, {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ key: `users/${SELF_USER_ID}/file.bin`, uploadId: "u1" }),
        });
        expect(ok.status).toBe(200);

        const bad = await fetch(`${baseUrl}/api/v1/me/s3/multipart/abort`, {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ key: `users/${OTHER_USER_ID}/file.bin`, uploadId: "u1" }),
        });
        expect(bad.status).toBe(400);
        expect(abortMultipart).toHaveBeenCalledTimes(1);
      });
    });
  });

  describe("admin-only endpoints are not exposed on the member router", () => {
    it("does not register GET /objects on the member router", async () => {
      const app = makeApp(SELF_CLERK_ID);
      await withServer(app, async (baseUrl) => {
        const res = await fetch(`${baseUrl}/api/v1/me/s3/objects`);
        expect(res.status).toBe(404);
      });
    });

    it("does not register DELETE /objects/:key on the member router", async () => {
      const app = makeApp(SELF_CLERK_ID);
      await withServer(app, async (baseUrl) => {
        const res = await fetch(
          `${baseUrl}/api/v1/me/s3/objects/${encodeURIComponent(`users/${SELF_USER_ID}/avatar.png`)}`,
          { method: "DELETE" },
        );
        expect(res.status).toBe(404);
      });
    });
  });
});
