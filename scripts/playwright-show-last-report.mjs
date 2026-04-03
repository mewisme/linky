import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const marker = path.join(root, "playwright-report", ".last-run-slug");
let slug = "all";
if (fs.existsSync(marker)) {
  const s = fs.readFileSync(marker, "utf8").trim();
  if (s) {
    slug = s;
  }
}
const reportDir = path.join(root, "playwright-report", slug);
spawnSync("pnpm", ["exec", "playwright", "show-report", reportDir], {
  stdio: "inherit",
  shell: true,
  cwd: root,
});
