import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import XLSX from "xlsx";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, "..");

function defaultReportSlug() {
  const env = process.env.PLAYWRIGHT_REPORT_SLUG?.trim();
  if (env) {
    return env;
  }
  const marker = path.join(root, "playwright-report", ".last-run-slug");
  if (fs.existsSync(marker)) {
    const s = fs.readFileSync(marker, "utf8").trim();
    if (s) {
      return s;
    }
  }
  return "all";
}

const slug = defaultReportSlug();
const defaultDir = path.join("playwright-report", slug);
const inputPath = path.resolve(
  root,
  process.argv[2] ?? path.join(defaultDir, "results.json"),
);
const outputPath = path.resolve(
  root,
  process.argv[3] ?? path.join(defaultDir, "results.xlsx"),
);

if (!fs.existsSync(inputPath)) {
  console.error(
    `Missing ${inputPath}. Run Playwright tests first (JSON is written next to the HTML report).`,
  );
  process.exit(1);
}

const raw = JSON.parse(fs.readFileSync(inputPath, "utf8"));
const rows = [];

function errorText(result) {
  const e = result?.error;
  if (!e) {
    return "";
  }
  if (typeof e === "string") {
    return e;
  }
  return e.message ?? e.value ?? JSON.stringify(e);
}

function walkSuites(suites, ancestors, defaultFile) {
  if (!suites) {
    return;
  }
  for (const suite of suites) {
    const file = suite.file ?? defaultFile;
    const chain = [...ancestors, suite.title].filter(Boolean);
    for (const spec of suite.specs ?? []) {
      const tests = spec.tests ?? [];
      if (tests.length === 0) {
        rows.push({
          File: file,
          Suite: chain.join(" › "),
          Title: spec.title,
          Project: "",
          Status: spec.ok === false ? "failed" : spec.ok === true ? "passed" : "",
          "Duration (ms)": "",
          Error: "",
        });
        continue;
      }
      for (const test of tests) {
        const project = test.projectName ?? "";
        const results = test.results ?? [];
        if (results.length === 0) {
          rows.push({
            File: file,
            Suite: chain.join(" › "),
            Title: spec.title,
            Project: project,
            Status: "",
            "Duration (ms)": "",
            Error: "",
          });
          continue;
        }
        for (const result of results) {
          rows.push({
            File: file,
            Suite: chain.join(" › "),
            Title: spec.title,
            Project: project,
            Status: result.status ?? "",
            "Duration (ms)": result.duration ?? "",
            Error: errorText(result),
          });
        }
      }
    }
    walkSuites(suite.suites, chain, file);
  }
}

walkSuites(raw.suites, [], "");

const ws = XLSX.utils.json_to_sheet(rows);
const wb = XLSX.utils.book_new();
XLSX.utils.book_append_sheet(wb, ws, "Results");
fs.mkdirSync(path.dirname(outputPath), { recursive: true });
XLSX.writeFile(wb, outputPath);
console.log(`Wrote ${rows.length} row(s) to ${outputPath}`);
