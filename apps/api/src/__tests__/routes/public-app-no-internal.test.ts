import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

import { describe, expect, it } from "vitest";

const here = dirname(fileURLToPath(import.meta.url));
const publicRoutesPath = resolve(here, "../../routes/index.ts");

describe("public route composition", () => {
  it("does not mount the internal worker router on the public Express app", () => {
    const source = readFileSync(publicRoutesPath, "utf8");
    expect(source).not.toContain("createInternalWorkerRouter");
    expect(source).not.toContain("INTERNAL_WORKER_V1_PREFIX");
  });
});
