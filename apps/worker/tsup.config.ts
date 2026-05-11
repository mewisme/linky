import { defineConfig } from "tsup";

export default defineConfig({
  entry: ["src/index.ts", "src/instrument.ts"],
  outDir: "dist",
  format: "esm",
  clean: true,
  treeshake: true,
});
