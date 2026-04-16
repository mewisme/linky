# Playwright E2E — commands and reports

End-to-end tests live under `playwright/tests`. Configuration is in `playwright.config.ts` at the monorepo root. Test data (Excel, fixtures) is under `playwright/test-data/` and `playwright/fixtures/`.

---

## Environment variables

| Variable | Purpose |
|----------|---------|
| `BASE_TEST_URL` | Required for `baseURL` (e.g. `https://www.example.com`). Loaded via `dotenv` from `.env` at the repo root. |
| `PLAYWRIGHT_IGNORE_HTTPS_ERRORS` | Set to `true` or `1` if the browser must ignore TLS errors (e.g. local HTTPS interception). |
| `PLAYWRIGHT_REPORT_SLUG` | Optional override for the report folder name (see **Report output**). Sanitized to safe characters. |
| `CI` | When set, Playwright uses stricter behavior (`forbidOnly`, retries, worker count) per `playwright.config.ts`. |

---

## npm scripts (`package.json`)

Run these from the **repository root** (`linky`).

| Command | Description |
|---------|-------------|
| `pnpm test` | Run the full Playwright suite (`pnpm exec playwright test`). |
| `pnpm test:ui` | Playwright UI mode (`playwright test --ui`). |
| `pnpm test:debug` | Debug mode (`playwright test --debug`). |
| `pnpm test:trace` | Run with tracing enabled (`playwright test --trace`). |
| `pnpm test:report` | Open the HTML report with **no path** (`playwright show-report`). Uses Playwright’s default output directory if you have not passed a custom folder. Prefer `pnpm test:report:last` after a local run that uses per-slug folders. |
| `pnpm test:report:last` | Open the HTML report for the **last** run, using `playwright-report/.last-run-slug` to resolve `playwright-report/<slug>/`. |
| `pnpm test:report:excel` | Convert JSON results to Excel (see **JSON → Excel**). |
| `pnpm test:codegen` | Launch Playwright codegen (`playwright codegen`). |

---

## Report output

Each run writes:

- **HTML report:** `playwright-report/<slug>/` (e.g. `index.html`, `data/`)
- **JSON report:** `playwright-report/<slug>/results.json`

After **global setup** starts, the repo also writes **`playwright-report/.last-run-slug`** containing the same `<slug>` so scripts that are not invoked with Playwright’s `argv` can find the latest results.

### How `<slug>` is chosen

Implemented in `playwright/helpers/report-slug.ts`:

1. If **`PLAYWRIGHT_REPORT_SLUG`** is set, that value is used (sanitized).
2. Else, if the command line contains **exactly one** path ending in `.spec.ts`, the slug is the **basename** without `.spec.ts` (e.g. `sign-in` for `playwright/tests/auth/sign-in.spec.ts`).
3. Else, if **multiple** `.spec.ts` paths are present, the slug is `multi-<sorted-basenames>` or `multi-<N>-specs` if the name would be too long.
4. Otherwise the slug is **`all`** (full suite or no spec path in `argv`).

Examples:

- `pnpm exec playwright test playwright/tests/auth/sign-in.spec.ts` → `playwright-report/sign-in/`
- `pnpm test` → `playwright-report/all/`

### Open a specific report folder

```bash
pnpm exec playwright show-report playwright-report/sign-in
```

---

## JSON → Excel

```bash
pnpm test:report:excel
```

**Default input:** `playwright-report/<slug>/results.json` where `<slug>` is resolved in this order:

1. First CLI argument (full path to `results.json`).
2. Else `PLAYWRIGHT_REPORT_SLUG` (folder `playwright-report/<slug>/`).
3. Else contents of `playwright-report/.last-run-slug`.
4. Else `all`.

**Default output:** `playwright-report/<slug>/results.xlsx` (same slug resolution), unless you pass a second CLI argument.

Explicit paths:

```bash
node scripts/playwright-json-to-excel.mjs playwright-report/sign-in/results.json playwright-report/sign-in/out.xlsx
```

---

## Useful `playwright test` CLI examples

Run via `pnpm exec` from the repo root.

```bash
# Single file
pnpm exec playwright test playwright/tests/auth/sign-in.spec.ts

# Single test by title (anchor with $ to avoid matching row 30 when you want row 3)
pnpm exec playwright test --grep "row 3$"

# Headed browser
pnpm exec playwright test playwright/tests/auth/sign-up.spec.ts --headed

# Sharded / CI (when configured)
pnpm exec playwright test --shard=1/3
```

Full CLI reference: [Playwright Test CLI](https://playwright.dev/docs/test-cli).

---

## Global setup and auth

`playwright.config.ts` sets `globalSetup` to `playwright/tests/auth/global-setup.ts`. It prepares storage state for shared users (when missing) and writes `.last-run-slug` for reporting. Excel-driven sign-in/sign-up flows use files under `playwright/test-data/`.

---

## Related paths

| Path | Role |
|------|------|
| `playwright.config.ts` | Projects, reporters, timeouts, `baseURL`, traces. |
| `playwright/helpers/report-slug.ts` | Report folder naming. |
| `playwright/helpers/wait-for-home.ts` | Post-auth URL polling used by auth flows. |
| `scripts/playwright-json-to-excel.mjs` | JSON report → `.xlsx`. |
| `scripts/playwright-show-last-report.mjs` | Opens the last HTML report (`test:report:last`). |
