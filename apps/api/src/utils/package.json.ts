import fs from "fs/promises";
import path from "path";

export async function getPackageJson() {
  const packageJson = await fs.readFile(path.join(process.cwd(), "package.json"), "utf8");
  return JSON.parse(packageJson);
}