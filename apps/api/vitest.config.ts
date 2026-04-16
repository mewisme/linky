import { defineConfig } from "vitest/config";
import { resolve } from "path";

export default defineConfig({
  test: {
    globals: false,
    include: ["src/__tests__/**/*.test.ts"],
    environment: "node",
    setupFiles: ["./src/__tests__/setup.ts"],
    env: {
      INTERNAL_WORKER_SECRET: "test-internal-worker-secret-key-min-32-chars",
    },
  },
  resolve: {
    alias: {
      "@": resolve(__dirname, "./src"),
    },
  },
});
