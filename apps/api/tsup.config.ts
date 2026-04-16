import fs from "node:fs";
import path from "node:path";
import { defineConfig } from "tsup";
import { execSync } from "node:child_process";

export default defineConfig({
  entry: [
    "src/index.ts",
    "src/healthcheck.ts",
    "src/instrument.ts",
    "src/worker/ai-job-executor.ts",
    "src/worker/jobs-job-executor.ts",
  ],
  outDir: "dist",
  format: "esm",
  treeshake: true,
  shims: true,
  minifyIdentifiers: true,
  minifySyntax: true,
  clean: true,
  onSuccess() {
    for (const name of ["ai-job-executor.d.ts", "jobs-job-executor.d.ts"]) {
      const from = path.join("src/worker", name);
      const to = path.join("dist/worker", name);
      if (fs.existsSync(from)) {
        fs.copyFileSync(from, to);
      }
    }
    execSync("node scripts/clean.js");
    return Promise.resolve();
  },
});
