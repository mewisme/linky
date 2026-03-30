import { defineConfig } from "tsup";
import { execSync } from "node:child_process";

export default defineConfig({
  entry: [
    "src/index.ts",
    "src/healthcheck.ts",
    "src/instrument.ts",
    "src/worker/ai-job-executor.ts",
    "src/worker/jobs-job-executor.ts"
  ],
  outDir: "dist",
  format: "esm",
  treeshake: true,
  shims: true,
  minifyIdentifiers: true,
  minifySyntax: true,
  clean: true,
  onSuccess() {
    execSync("node scripts/clean.js");
    return Promise.resolve();
  },
});
