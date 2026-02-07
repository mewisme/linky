import { defineConfig } from "tsup";

export default defineConfig({
  entry: ["src/index.ts"],
  outDir: "dist",
  format: "esm",
  minifyIdentifiers: true,
  minifySyntax: true,
  clean: true,
});