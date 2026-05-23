# Linky E2E (pytest + Selenium + CloakBrowser)

Standalone Python E2E suite. Không phụ thuộc Playwright hay pnpm workspace.

## Prerequisites

- [uv](https://docs.astral.sh/uv/)
- `.env` với `BASE_TEST_URL` (repo root hoặc `pytest/.env`)
- Test data: `linky_e2e/test_data/*.xlsx`
- Auth storage: `pytest/.auth/user1.json`, `user2.json` (tự tạo khi test cần login lần đầu, hoặc `uv run refresh-auth`)

## Setup

```bash
cd pytest
uv sync
uv run ensure-cloak      # tải / xác minh CloakBrowser bin + ChromeDriver (~200MB lần đầu)
uv run clean-cloak       # xóa cache CloakBrowser (~/.cloakbrowser) + ChromeDriver trong venv
cp .env.example .env   # hoặc dùng ../.env
```

`ensure-cloak` gọi `cloakbrowser.ensure_binary()` và `chromedriver-autoinstaller` — chạy trước khi `pytest` lần đầu hoặc trên CI. Khi đang tải Chromium (~200MB), log hiển thị tiến độ theo % (mỗi 10%).

`clean-cloak` xóa cache để tải lại từ đầu; sau đó chạy lại `ensure-cloak`.

`refresh-auth` tạo/cập nhật `.auth/*.json` bằng **một** browser (chạy tay trước CI, không dùng trong pytest).

Browser lifecycle: pytest **không** mở browser session riêng. Mỗi test một driver (`driver`, `video_chat_page`, …); login/storage load trên cùng driver đó. Teardown: `quit()` + kill process tree; `pytest_sessionfinish` dọn driver sót. Tránh `-n auto` với `video_chat`.

## Run tests

```bash
cd pytest

uv run pytest
uv run pytest tests/auth -m auth
uv run pytest tests/user_profile -m user_profile
uv run pytest tests/video_chat -m video_chat   # serial, không xdist

uv run pytest tests/auth tests/user_profile -n auto
HEADED=1 uv run pytest tests/auth/test_sign_in.py -s
RUN_FAST=1 uv run pytest tests/auth -q
uv run pytest --html=reports/report.html --self-contained-html
```

## Environment

| Variable | Description |
|----------|-------------|
| `BASE_TEST_URL` | App under test (required) |
| `E2E_IGNORE_HTTPS_ERRORS` | `--ignore-certificate-errors` |
| `HEADED` / `PWHEADED` | Headed browser |
| `RUN_FAST=1` | Bỏ delay human-paced (mặc định: chậm, dễ theo dõi từng bước) |
| `E2E_TIMEOUT_SEC` | WebDriverWait default (30) |
| `CLERK_TEST_DOMAIN` | Clerk test email domain (`linky.now`) |

Sign-in / sign-up Clerk test:

| | Value |
|---|--------|
| Email | `{name}+clerk_test@linky.now` |
| OTP | `424242` |
| Password (sign-up) | `ValidPass123!` |

Helpers: `linky_e2e.test_data.clerk_test_auth`, `linky_e2e.page_objects.auth.clerk_auth_flow`.

## Test data (Excel)

| File | Nội dung |
|------|----------|
| `data_test_users.xlsx` | `user1`–`user7`, email, password, otp, `storage_state_path` → `.auth/userN.json` |
| `data_test_login.xlsx` | Login matrix (rows cho auth parametrized khi cần) |
| `data_test_signup.xlsx` | Signup matrix |

`storage_state_path` trong Excel (cột 7): `.auth/user1.json` — legacy `playwright/.auth/...` vẫn được map tự động.

## Layout

```
pytest/
  linky_e2e/          # driver, page objects, fixtures, storage
  tests/
    auth/
    user_profile/
    video_chat/
  conftest.py
  .auth/              # session JSON (gitignored)
```
