# Linky E2E (pytest + Selenium + CloakBrowser)

Standalone Python E2E suite. Không phụ thuộc Playwright hay pnpm workspace.

## Prerequisites

- [uv](https://docs.astral.sh/uv/)
- Env vars in repo-root `.env` or `e2e/pytest/.env` (see [`.env.e2e.example`](../../.env.e2e.example))
- Clerk test accounts for `user1` / `user2` (see env vars below)

## Setup

```bash
cd e2e/pytest
uv sync
uv run ensure-cloak
cp ../../.env.e2e.example ../../.env   # merge E2E vars into root .env
```

Each test signs in through Clerk (`/sign-in` flow). Saved `.auth/*.json` cookies are **not** used during pytest runs.

Optional: `uv run refresh-auth` exports session JSON to `.auth/` for debugging only.

## Run tests

```bash
cd e2e/pytest

uv run test tests/video_chat/test_match_found.py
uv run test tests/video_chat -m video_chat
```

`uv run test` runs pytest with `-s -v` and writes `reports/report.html` (self-contained). Extra pytest args are passed through:

```bash
uv run test tests/auth -k sign_in
HEADED=1 uv run test tests/video_chat/test_call_controls.py
```

Lower-level (no HTML report):

```bash
uv run python -m pytest tests/video_chat -m video_chat
RUN_FAST=1 uv run python -m pytest tests/auth -q
```

On Windows, prefer `uv run python -m pytest` if `uv run pytest` fails with a trampoline error.

## Automation / background tabs

Every CloakBrowser session installs a CDP init script (`window.__LINKY_E2E__` + `localStorage['linky:e2e']`) so the web app treats pytest runs like foreground even when a window is blurred or a second tab/window is open. `VideoChatPage.goto()`, auth flows, and storage-state loads call `ensure_automation_context()` as a fallback if CDP injection fails.

Two-user video chat uses **separate drivers**; you do not need to keep both windows focused while driving one side.

## Video chat fixtures

Pytest only spawns browsers a test actually requests:

| Fixture | Browsers | Description |
|---------|----------|-------------|
| `video_chat_page` / `video_chat_driver` | **1** (user1) | Idle UI, search/queue, i18n, most error states |
| `single_user_call` / `single_user_call_no_media` | **1** | Low-level single-user session |
| `user1_page` / `user1_driver` | **1** | Same as `video_chat_*` |
| `two_user_call` | **2** (parallel login) | Only when a test asks for `user2_*` or `active_call` |
| `active_call` | **2** | Matchmaking connected (depends on `two_user_call`) |

Example (one browser):

```python
def test_idle(video_chat_page: VideoChatPage):
    video_chat_page.goto()
```

Example (two browsers):

```python
def test_mute(active_call: TwoUserCallSetup):
    active_call.user1_page.mute_button().click()
```

`tests/video_chat/test_api_endpoints.py` has no browser fixtures (HTTP only).

## Environment

| Variable | Description |
|----------|-------------|
| `BASE_TEST_URL` | App under test (required) |
| `API_URL` | Go API for direct HTTP tests |
| `E2E_TEST_PASSWORD` / `E2E_TEST_OTP` | Defaults for all test users |
| `E2E_USER1_*` / `E2E_USER2_*` | Required Clerk accounts (video_chat needs both) |
| `E2E_USER3_*` … `E2E_USER7_*` | Optional extra accounts |
| `CLERK_TEST_DOMAIN` | Clerk test email domain (`linky.now`) |
| `HEADED` / `PWHEADED` / `PWDEBUG` | Headed browser |
| `RUN_FAST=1` | Skip human-paced delays |
| `E2E_TIMEOUT_SEC` | WebDriverWait default (30) |

Per-user env pattern (`N` = 1–7):

| Variable | Default |
|----------|---------|
| `E2E_USER{N}_EMAIL` | `{userN}+clerk_test@{CLERK_TEST_DOMAIN}` |
| `E2E_USER{N}_PASSWORD` | `E2E_TEST_PASSWORD` → `ValidPass123!` |
| `E2E_USER{N}_OTP` | `E2E_TEST_OTP` → `424242` |
| `E2E_USER{N}_STORAGE` | `.auth/userN.json` |
| `E2E_USER{N}_FIRST_NAME` | — |
| `E2E_USER{N}_LAST_NAME` | — |

## Layout

```
e2e/pytest/
  linky_e2e/          # driver, page objects, fixtures
  tests/
    auth/
    user_profile/
    video_chat/
  conftest.py
  .auth/              # optional session export (refresh-auth only; not used by pytest)
```
