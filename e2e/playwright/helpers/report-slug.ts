import path from "node:path";

export function playwrightReportSlug(
  argv: string[] = process.argv,
): string {
  const fromEnv = process.env.PLAYWRIGHT_REPORT_SLUG?.trim();
  if (fromEnv) {
    return fromEnv.replace(/[^a-zA-Z0-9._-]+/g, "-").slice(0, 120) || "all";
  }

  const args = argv.slice(2);
  const specPaths = args.filter((arg) => {
    if (arg.startsWith("-")) {
      return false;
    }
    const n = arg.replaceAll("\\", "/");
    return n.endsWith(".spec.ts");
  });

  if (specPaths.length === 1) {
    return path.basename(specPaths[0], ".spec.ts");
  }
  if (specPaths.length > 1) {
    const names = specPaths
      .map((p) => path.basename(p, ".spec.ts"))
      .sort()
      .join("-");
    const multi = `multi-${names}`;
    return multi.length > 100 ? `multi-${specPaths.length}-specs` : multi;
  }

  return "all";
}
