# Linky — Clerk Auth Screens: Playwright Test Plan

**Scope:** All Clerk-powered authentication screens accessible under the `/auth` route group  
(`apps/web/src/app/[locale]/(auth)/`) and the post-auth security page (`/user/security`).  
**Prepared for:** QA / Automation Engineers  
**Base URL convention:** `BASE_TEST_URL` env var (Playwright `baseURL`)  
**Locale convention:** English (`en`) has no URL prefix; Vietnamese uses `/vi/` prefix.

---

## Route → Purpose → Must-Have Tests

| Route (en) | Route (vi) | Purpose | Must-Have Test IDs |
|---|---|---|---|
| `/sign-in` | `/vi/sign-in` | Email + password login; Clerk `<SignIn>` widget | SI-01 – SI-12 |
| `/sign-in/factor-two` | `/vi/sign-in/factor-two` | TOTP / email-code MFA step | MFA-01 – MFA-05 |
| `/sign-up` | `/vi/sign-up` | New account registration; Clerk `<SignUp>` widget | SU-01 – SU-15 |
| `/sign-up/verify-email-address` | `/vi/sign-up/verify-email-address` | Post-signup email OTP verification | SU-10 – SU-13 |
| `/reset-password` | `/vi/reset-password` | Clerk `<TaskResetPassword>` — triggers email reset flow | RP-01 – RP-06 |
| `/sign-in` (breach interstitial) | — | Clerk breach-detected interstitial with "Reset your password" prompt | BR-01 – BR-04 |
| `/user/security` (authenticated) | `/vi/user/security` | Authentication card + active sessions; custom password modal | SEC-01 – SEC-12 |
| `SignOutButton` (anywhere) | — | Sign-out redirect back to `/sign-in` | SO-01 – SO-03 |

---

## Prerequisites & Test Data Setup

### Environment
- `BASE_TEST_URL` must point to a running Next.js instance with Clerk configured  
- Clerk test-mode keys are assumed (`+clerk_test` email suffix bypasses real delivery)
- `data_test_users.xlsx` — 7 pre-registered test accounts (`user1`–`user7`); columns: `id | firstName | lastName | email | password | otp | storageStatePath`
- `data_test_login.xlsx` — rows 2–13; columns: `email | password | otp | expectedMessage`
- `data_test_signup.xlsx` — rows 2–35; columns: `firstName | lastName | email | password | otp | expectedMessage`
- `SIGNUP_EMAIL_AUTO_REMOVE_POSITION` env var controls email timestamp injection (`prefix | suffix | include`, default `include`)

### Session State
- `globalSetup` pre-authenticates `user1` and `user2`, writing storage-state JSON files to paths defined in `data_test_users.xlsx`
- All `SEC-*` and `SO-*` tests must load a pre-authenticated storage state via `storageState` in the test context
- All `SI-*`, `SU-*`, `RP-*`, `BR-*` tests start with a **fresh, unauthenticated** context (no storage state)

### Required Clerk Dashboard Config
- Email/password sign-in strategy enabled
- TOTP and email-code MFA available (for MFA cases)
- "Block sign-ins to accounts using breached passwords" feature enabled (for `BR-*` cases)
- OAuth providers enabled: Google, Facebook, Discord

---

## Suite 1 — Sign-In (`/sign-in`)

### Happy Path

#### SI-01 · P0 — Valid email + password → redirect to home
**Prerequisites:** `user1` credentials  
**Steps:**
1. Navigate to `/sign-in`
2. Wait for `[data-clerk-ready="true"]`
3. Wait for `input[name="identifier"]` visible
4. Fill email with `user1.email`; press Enter
5. Wait for `input[name="password"]` visible
6. Fill password with `user1.password`; press Enter
7. Assert URL changes to a non-auth page (i.e. `isPostAuthAppUrl` returns true)
8. Assert no error elements are visible

**Expected:** User lands on home (`/`) or any post-auth app URL within 20 s.

---

#### SI-02 · P0 — Sign in with MFA enabled → TOTP step → redirect
**Prerequisites:** `user1` has TOTP configured (`user1.otp` is a valid TOTP secret/code)  
**Steps:**
1. Steps 1–6 of SI-01
2. Assert URL contains `/sign-in/factor-two`
3. Fill `input[autocomplete="one-time-code"]` with current TOTP code
4. Click "Continue"
5. Assert redirect to post-auth app URL

---

#### SI-03 · P1 — Already signed-in user visits `/sign-in` → redirect to home
**Prerequisites:** Load `user1` storage state  
**Steps:**
1. Navigate to `/sign-in`
2. Wait for Clerk to load (`[data-clerk-ready="true"]`)
3. Assert page auto-redirects to `/` (via `useEffect` → `router.replace`) within 5 s  
   OR assert "Continue" button is visible and clicking it navigates away from `/sign-in`

---

#### SI-04 · P1 — `redirect_url` query param is honoured
**Steps:**
1. Navigate to `/sign-in?redirect_url=%2Fuser%2Fprofile`
2. Sign in with valid credentials (no MFA)
3. Assert final URL is `/user/profile`

---

#### SI-05 · P1 — Invalid `redirect_url` (external origin) falls back to `/`
**Steps:**
1. Navigate to `/sign-in?redirect_url=https%3A%2F%2Fevil.example.com`
2. Sign in with valid credentials
3. Assert final URL is `/` (the code strips cross-origin redirects by only taking `pathname + search`)

---

### Error / Negative Cases

#### SI-06 · P0 — Empty email shows validation error
**Steps:**
1. Navigate to `/sign-in`; wait for Clerk ready
2. Click "Continue" without filling anything
3. Assert `[data-testid="form-feedback-error"]` or `#error-identifier` is visible

---

#### SI-07 · P0 — Malformed email shows browser/Clerk validation
**Steps:**
1. Navigate to `/sign-in`; wait for Clerk ready
2. Type `notanemail` into `input[name="identifier"]`; press Enter
3. Assert browser native validation message OR Clerk error text visible

---

#### SI-08 · P0 — Non-existent email shows error
**Steps:**
1. Navigate to `/sign-in`; wait for Clerk ready
2. Fill `nonexistent_${Date.now()}@example.com`; press Enter
3. Assert identifier error contains "Couldn't find your account" or equivalent Clerk message

---

#### SI-09 · P0 — Wrong password shows error
**Prerequisites:** `user1` credentials  
**Steps:**
1. Navigate to `/sign-in`; enter `user1.email`; press Enter
2. Enter `wrongpassword123` as password; press Enter
3. Assert `#error-password` or `[data-testid="form-feedback-error"]` is visible with a "Password is incorrect" (or similar) message

---

#### SI-10 · P1 — Wrong TOTP code shows error
**Prerequisites:** `user1` with TOTP  
**Steps:**
1. Navigate to `/sign-in`; sign in with valid email + password until `/sign-in/factor-two`
2. Fill `000000` as TOTP code
3. Assert `#error-undefined` or `[data-testid="form-feedback-error"]` visible

---

#### SI-11 · P2 — Back-navigate from password step returns to identifier step
**Steps:**
1. Navigate to `/sign-in`; fill a valid email; click Continue
2. Click browser back / Clerk's "Edit" button (if present)
3. Assert `input[name="identifier"]` is visible again

---

#### SI-12 · P2 — Sign-in page renders in Vietnamese locale
**Steps:**
1. Navigate to `/vi/sign-in`
2. Wait for `[data-clerk-ready="true"]`
3. Assert Clerk widget is visible (`input[name="identifier"]`)
4. *(Smoke only: no locale assertion on Clerk widget itself since it uses its own i18n)*

---

## Suite 2 — Sign-Up (`/sign-up`)

### Happy Path

#### SU-01 · P0 — Valid registration → email verification → redirect to home
**Prerequisites:** Fresh email with `+clerk_test` suffix  
**Steps:**
1. Navigate to `/sign-up`; wait for Clerk ready
2. Fill `firstName`, `lastName`, fresh generated email, strong password (≥8 chars)
3. Check the "I agree to the Terms of Service" checkbox
4. Click Continue / press Enter
5. Assert URL changes to `/sign-up/verify-email-address`
6. Fill 6-digit OTP from test-email delivery (or hardcoded `+clerk_test` bypass code)
7. Click Continue
8. Assert redirect to post-auth app URL

---

#### SU-02 · P1 — Already signed-in user visiting `/sign-up` → no form shown
**Prerequisites:** Load `user1` storage state  
**Steps:**
1. Navigate to `/sign-up`
2. Assert the registration form fields are **not** visible (the component renders `null` when `isSignedIn` is true)

---

#### SU-03 · P1 — Sign-up page renders in Vietnamese locale
**Steps:**
1. Navigate to `/vi/sign-up`; wait for Clerk ready
2. Assert `input[name="firstName"]` visible

---

### Validation / Error Cases

#### SU-04 · P0 — All fields blank → submit blocked with errors
**Steps:**
1. Navigate to `/sign-up`; wait for fields visible
2. Click Continue without filling anything
3. Assert at least one of: `#error-firstName`, `#error-lastName`, `#error-emailAddress`, `#error-password` is visible

---

#### SU-05 · P0 — Invalid email format
**Steps:**
1. Fill all other fields validly; type `bademail` in email; submit
2. Assert `#error-emailAddress` or browser native validation visible

---

#### SU-06 · P0 — Password too short (< 8 chars)
**Steps:**
1. Fill all other fields validly; type `abc123` in password; submit
2. Assert `#error-password` visible and contains "8 or more characters"

---

#### SU-07 · P0 — Password at max length (72 chars) shows inline error before submit
**Steps:**
1. Fill other fields validly; paste 73-character string into password
2. Assert `#error-password` visible immediately (before form submission, as per Excel flow code)

---

#### SU-08 · P0 — Duplicate (already registered) email
**Steps:**
1. Fill with an email already in `data_test_users.xlsx`; do NOT use `+clerk_test` generation
2. Submit
3. Assert Clerk error contains "email address already in use" or "is taken"

---

#### SU-09 · P1 — Terms checkbox unchecked → submit blocked
**Steps:**
1. Fill all required fields; do NOT check terms checkbox
2. Click Continue
3. Assert `input[name="legalAccepted"]` or a related Clerk error is shown

---

#### SU-10 · P0 — Wrong OTP on email verification
**Steps:**
1. Complete sign-up form with valid data; proceed to verify-email step
2. Enter `123456` (wrong OTP)
3. Assert `#error-undefined` or error element visible with mismatch/incorrect code message

---

#### SU-11 · P1 — Empty OTP on email verification
**Steps:**
1. Navigate to OTP step (via valid sign-up)
2. Click Continue without entering OTP
3. Assert error visible (e.g. "Enter code")

---

#### SU-12 · P1 — Resend code link triggers new code delivery
**Steps:**
1. Navigate to OTP step
2. Locate Clerk's "Resend code" / "Didn't receive?" link; click it
3. Assert no error shown; success or status toast/text visible

**Unknown/Blocker:** Exact Clerk resend button label depends on Clerk version and instance config. Confirm by inspecting DOM.

---

#### SU-13 · P2 — OAuth popup flow (Google) — smoke
**Steps:**
1. Navigate to `/sign-up`; wait for Clerk ready
2. Locate Google OAuth button
3. Click it
4. Assert a popup window is opened (component uses `oauthFlow="popup"`)

**Note:** Full OAuth flow cannot be automated end-to-end without test OAuth credentials. Use Clerk test mode or mock.

---

#### SU-14 · P2 — First/Last name with special characters accepted
**Steps:**
1. Fill firstName = `Ân`, lastName = `Nguyễn`; fill valid email and password; submit
2. Assert form advances past validation without error

---

#### SU-15 · P2 — Sign-up with very long valid name fields (boundary check)
**Steps:**
1. Fill firstName with 50-character string; lastName with 50-character string; submit with valid credentials
2. Assert no UI errors on the name fields

---

## Suite 3 — Password Reset (`/reset-password`)

The `/reset-password` page uses Clerk's `<TaskResetPassword>` component and is typically reached via a link in a Clerk-sent email. After completion, it redirects to `/user/security`.

### Happy Path

#### RP-01 · P0 — Enter new valid password → success → redirect to `/user/security`
**Prerequisites:** Arrive at `/reset-password` via a valid Clerk reset-password magic link  
**Steps:**
1. Navigate to a Clerk-generated reset-password URL (contains Clerk's `__clerk_ticket` or similar token)
2. Wait for `input[name="password"]` (New password) visible
3. Enter a valid strong password in "New password"
4. Enter same password in "Confirm password"
5. Click "Reset Password"
6. Assert redirect to `/user/security` (locale-prefixed as appropriate)

---

#### RP-02 · P1 — Password field shows strength feedback while typing
**Steps:**
1. Navigate to the reset URL
2. Start typing in new-password field
3. Assert `#password-success-feedback` or strength indicator appears when password is ≥ 8 chars

---

### Validation / Error Cases

#### RP-03 · P0 — Passwords do not match → inline error
**Steps:**
1. Fill "New password" with `ValidPass123!`
2. Fill "Confirm password" with `DifferentPass456!`
3. Click Reset Password
4. Assert `#error-confirmPassword` visible with "Passwords don't match" message

---

#### RP-04 · P0 — Short new password (< 8 chars) → inline error
**Steps:**
1. Fill "New password" with `abc123`
2. Assert `#error-password` visible with "must contain 8 or more characters"

---

#### RP-05 · P1 — Breached password in new password → error
**Steps:**
1. Fill "New password" with a known breached password (e.g. `password123`)
2. Fill "Confirm password" to match
3. Click Reset Password
4. Assert `[data-testid="form-feedback-error"]` visible and contains "found as part of a breach"

---

#### RP-06 · P2 — Expired/invalid reset token → Clerk error shown
**Prerequisites:** Navigate to `/reset-password` without a valid token, or with an expired one  
**Steps:**
1. Navigate to `/reset-password` directly (no `__clerk_ticket`)
2. Assert Clerk renders an error state (e.g. "This link has expired" or equivalent)

---

## Suite 4 — Sign-In Breach Interstitial

Triggered when Clerk detects the user's existing password is in a breach database. The interstitial appears within the `/sign-in` flow after the password step.

#### BR-01 · P0 — Breach interstitial displayed on compromised password
**Prerequisites:** Test account with a known-breached password (coordinate with Clerk dashboard test account setup)  
**Steps:**
1. Navigate to `/sign-in`; enter breached-account email; enter its current (breached) password
2. Assert `ResetPasswordPage.breachWarning()` text visible: `/password has been found as part of a breach/i`
3. Assert "Reset your password" button visible

---

#### BR-02 · P0 — Clicking "Reset your password" → transitions to OTP/email step
**Steps:**
1. From BR-01 state: click "Reset your password"
2. Assert `ResetPasswordPage.resetPasswordButton()` becomes hidden
3. Assert `OTPPage.otpInput()` visible

---

#### BR-03 · P0 — Wrong OTP on breach reset → error
**Steps:**
1. From BR-02 state: fill `000000` as OTP; click Continue
2. Assert `OTPPage.errorMessage()` visible

---

#### BR-04 · P1 — Correct OTP → proceeds to new-password step → success
**Steps:**
1. From BR-02 state: fill correct OTP; click Continue
2. Assert `NewPasswordPage.newPasswordInput()` visible
3. Fill strong non-breached new password in both fields; click "Reset Password"
4. Assert redirect to post-auth URL

---

## Suite 5 — Security Page — Password Management (`/user/security`)

**Prerequisites:** All tests load `user1` storage state (authenticated context).

### Change Password Modal

#### SEC-01 · P0 — Open "Change Password" dialog
**Steps:**
1. Navigate to `/user/security`
2. Assert `[data-testid="security-authentication-card"]` visible
3. Click `[data-testid="security-password-open-dialog"]` (button label: "Change Password")
4. Assert `[data-testid="dialog-container"]` (desktop) or `[data-testid="drawer-container"]` (mobile) visible

---

#### SEC-02 · P0 — Change password with mismatched confirm → inline error
**Steps:**
1. Open change-password dialog (SEC-01)
2. Fill "New password" with `NewValid123!`; fill "Confirm" with `Different456!`
3. Click "Update Password"
4. Assert error `t('passwordsMismatch')` visible near confirm field

---

#### SEC-03 · P0 — Change password too short → inline error
**Steps:**
1. Open change-password dialog
2. Fill "New password" with `abc`; leave confirm blank
3. Click "Update Password"
4. Assert error "at least 8 characters" visible

---

#### SEC-04 · P0 — Empty new password → inline error
**Steps:**
1. Open change-password dialog
2. Leave new password blank; click "Update Password"
3. Assert error "required" visible

---

#### SEC-05 · P1 — Password strength indicator updates while typing
**Steps:**
1. Open change-password dialog
2. Type `ab` → assert strength label is "Weak" (< 8 chars)
3. Continue typing to reach 8 chars → assert "Medium"
4. Continue to 12+ chars → assert "Strong"

---

#### SEC-06 · P1 — "Sign out other devices" checkbox present and toggleable
**Steps:**
1. Open change-password dialog
2. Assert `[data-testid="security-password-sign-out-others"]` visible and unchecked
3. Click it; assert it becomes checked

---

#### SEC-07 · P1 — Cancel button closes dialog without changes
**Steps:**
1. Open change-password dialog; fill new password with `TestPass123!`
2. Click `[data-testid="dialog-cancel-button"]`
3. Assert dialog is dismissed; no error toast shown

---

#### SEC-08 · P1 — Password change requires Clerk re-verification (reverification modal appears)
**Steps:**
1. Open change-password dialog; fill valid matching passwords
2. Click "Update Password"
3. Assert Clerk's re-verification UI appears (step-up auth modal)

**Note:** This triggers `useReverification` wrapping `user.updatePassword()`. The exact Clerk modal DOM is outside custom code. Confirm by observing DOM at runtime.

---

#### SEC-09 · P2 — "Set Password" mode shown for OAuth-only user (no existing password)
**Prerequisites:** A `user1` variant that has only OAuth and no password set  
**Steps:**
1. Navigate to `/user/security`
2. Assert button label is "Set Password" (not "Change Password")
3. Open the modal; assert description text matches "set" copy

**Unknown/Blocker:** Requires a test account with `passwordEnabled = false`. Confirm from `data_test_users.xlsx` if any user qualifies or create a dedicated test account.

---

### Active Sessions Card

#### SEC-10 · P1 — Current session is labelled "This device"
**Steps:**
1. Navigate to `/user/security`; wait for sessions to load (skeletons disappear)
2. Assert at least one session row in `[id="active-sessions-list"]`
3. Assert exactly one row contains badge text "This device"

---

#### SEC-11 · P1 — "View all sessions" expands list when > 2 sessions
**Prerequisites:** `user1` account with ≥ 3 active sessions  
**Steps:**
1. Navigate to `/user/security`
2. Assert "View all sessions" button visible
3. Click it; assert `aria-expanded="true"` on the button; assert more rows now visible

---

#### SEC-12 · P2 — Sessions list shows location and last-active timestamp
**Steps:**
1. Navigate to `/user/security`; wait for sessions loaded
2. Assert at least one session row has a non-empty `lastActive` or "ago" relative time text

---

## Suite 6 — Connected OAuth Providers (`/user/security`)

**Prerequisites:** `user1` storage state (authenticated).

#### OA-01 · P1 — Connected providers listed in authentication card
**Steps:**
1. Navigate to `/user/security`
2. Assert provider badges for Google / Facebook / Discord are present
3. Linked providers show provider name; unlinked show "Connect [Provider]"

---

#### OA-02 · P1 — Click unlinked provider → triggers OAuth redirect
**Steps:**
1. Navigate to `/user/security`
2. Click an unlinked provider badge (e.g. "Connect Google")
3. Assert Clerk's `createExternalAccount` triggers (router push to OAuth URL)

**Note:** Full OAuth flow requires test credentials; test only up to the redirect occurring, not the callback.

---

#### OA-03 · P1 — Click linked provider → disconnect confirm dialog appears
**Steps:**
1. Navigate to `/user/security`
2. Click a linked provider badge (hover state shows X icon)
3. Assert `AlertDialog` with "Disconnect this sign-in method?" title is visible

---

#### OA-04 · P1 — Cancel disconnect keeps provider connected
**Steps:**
1. From OA-03 state: click "Keep Connected" (cancel)
2. Assert dialog dismissed; provider still shows as linked

---

#### OA-05 · P2 — Confirm disconnect calls Clerk destroy with re-verification
**Steps:**
1. From OA-03 state: click "Yes, Disconnect"
2. Assert Clerk re-verification modal appears (useReverification wraps `account.destroy()`)

---

## Suite 7 — Sign-Out

**Prerequisites:** All tests start with a loaded `user1` storage state.

#### SO-01 · P0 — Sign out via user button dropdown → redirect to `/sign-in`
**Steps:**
1. Navigate to any authenticated page (e.g. `/`)
2. Click the ShaderAvatar trigger (user button in sidebar)
3. Assert dropdown opens; click the "Logout" / "Sign out" menu item
4. Assert URL changes to `/sign-in` (or `/vi/sign-in` if Vietnamese locale was active)
5. Assert user is no longer signed in (sign-in form is visible)

---

#### SO-02 · P0 — Keyboard shortcut ⇧⌘Q (Ctrl+Shift+Q) triggers sign-out
**Steps:**
1. Navigate to any authenticated page
2. Press `Ctrl+Shift+Q` (or `Meta+Shift+Q` on Mac)
3. Assert redirect to `/sign-in`

---

#### SO-03 · P1 — Sign-out in Vietnamese locale redirects to `/vi/sign-in`
**Prerequisites:** `user1` with locale set to `vi` (via localStorage preference store)  
**Steps:**
1. Navigate to `/vi/` (or any `/vi/` prefixed page)
2. Sign out via user button
3. Assert redirect URL is `/vi/sign-in`

---

## Suite 8 — Redirect / Middleware Guards

#### RD-01 · P0 — Unauthenticated user accessing protected page → redirect to sign-in
**Steps:**
1. Open a fresh (unauthenticated) browser context
2. Navigate to `/user/profile` (or `/call`)
3. Assert redirect to `/sign-in` (Clerk `auth.protect()` fires in middleware)

---

#### RD-02 · P0 — Unauthenticated user accessing `/sign-in` is not redirected away
**Steps:**
1. Fresh context; navigate to `/sign-in`
2. Assert sign-in form visible; no unexpected redirect to other pages

---

#### RD-03 · P1 — `/api/*` routes skip intlMiddleware and apply Clerk auth directly
**Steps:**
1. Make a fetch from an authenticated context to `/api/users/me`
2. Assert 200 response
3. Sign out; make the same request
4. Assert 401 response

---

#### RD-04 · P2 — 404 on unknown auth-group path
**Steps:**
1. Navigate to `/sign-in/nonexistent-step`
2. Assert Clerk renders its own 404/error state OR Next.js `not-found.tsx` shown

---

## Suite 9 — Internationalization (i18n) Smoke Tests

#### I18N-01 · P1 — Auth layout metadata reads `authPage.layoutTitle` from messages
**Steps:**
1. Navigate to `/sign-in`
2. Assert `document.title` contains "Authentication" (en) or corresponding vi copy  
   *(This verifies `getTranslations({ namespace: "authPage" })` in the layout works.)*

---

#### I18N-02 · P1 — `SignedInRedirect` shows "Redirecting…" and "Continue" in English
**Prerequisites:** `user1` storage state  
**Steps:**
1. Navigate to `/sign-in` while authenticated
2. Assert text "Redirecting…" OR button "Continue" is briefly visible (or has already redirected)

---

#### I18N-03 · P2 — Reset-password page in Vietnamese locale
**Steps:**
1. Navigate to `/vi/reset-password` with a valid Clerk reset token
2. Assert page renders without error and the new-password form appears

---

## Suite 10 — Accessibility Smoke Checks

#### A11Y-01 · P2 — Sign-in page has no obvious ARIA violations
**Steps:**
1. Navigate to `/sign-in`; wait for Clerk ready
2. Run `axe-core` via `page.evaluate(() => axe.run())`
3. Assert no critical ARIA violations (allow Clerk widget's own violations to be excluded if known)

---

#### A11Y-02 · P2 — Sign-up page has no obvious ARIA violations
**Steps:**
1. Navigate to `/sign-up`; wait for Clerk ready
2. Run axe-core
3. Assert no critical violations

---

#### A11Y-03 · P2 — Security page password modal is keyboard navigable
**Steps:**
1. Navigate to `/user/security` (authenticated)
2. Tab to the "Change Password" button; press Enter
3. Assert dialog opens and focus moves inside the modal
4. Press Escape; assert dialog closes and focus returns to trigger

---

## Execution Strategy

### Test Order
```
globalSetup (auth.setup.spec.ts) → SI → SU → RP → BR → SEC → OA → SO → RD → I18N → A11Y
```

### Parallelism
- Each top-level suite runs in its own Playwright worker
- `SEC`, `OA`, `SO` must all load storage state; they can run in parallel
- `SI`, `SU`, `RP`, `BR` use fresh contexts; fully parallel with each other

### Mocking Strategy

| Scenario | Strategy |
|---|---|
| OAuth full flow (Google/Facebook/Discord) | Mock only: stub `user.createExternalAccount()` at network level or use a test OAuth client; do **not** automate third-party OAuth consent screens |
| Email OTP delivery | Use Clerk `+clerk_test` email suffix which returns a deterministic `424242` OTP code in test mode |
| Breach detection | Requires Clerk "breached passwords" feature enabled; use known breached passwords (e.g. `password123`) |
| Clerk re-verification modal | Test that the modal appears (UI state); do not attempt to bypass as it is Clerk-internal |
| TOTP codes | Use a TOTP library (e.g. `speakeasy`) seeded with `user.otp` secret to generate current codes at test runtime |

### CI Configuration
- `retries: 2` in CI; `workers: 1` (sequential) per `playwright.config.ts`
- `PLAYWRIGHT_IGNORE_HTTPS_ERRORS=true` for local SSL dev proxy
- `BASE_TEST_URL` must be set to the running app URL

---

## Assumptions & Open Questions

| # | Item | Impact |
|---|---|---|
| 1 | **`/reset-password` requires a Clerk token in the URL** — there is no navigation to this page without a valid `__clerk_ticket`. Automation must either (a) programmatically request a Clerk Backend API password-reset link, or (b) use a seeded token in the test environment. | Blocks RP-01, BR-04 without resolution |
| 2 | **OAuth smoke tests** — the `oauthFlow="popup"` on `<SignUp>` means a popup window is expected. Playwright can intercept popup events; however, the full OAuth callback cannot be automated without test OAuth client credentials. | OA-02, SU-13 are limited to "redirect triggered" assertions only |
| 3 | **TOTP clock skew** — generating a correct TOTP code at test runtime requires the secret from `data_test_users.xlsx` to be a Base32 TOTP seed (not just a static code). Verify this before implementing SI-02. | SI-02, MFA tests |
| 4 | **Clerk re-verification UX** — the exact DOM/selectors for the Clerk step-up auth modal are not in custom code. Must be discovered by running the test once and inspecting. | SEC-08, OA-05 |
| 5 | **"Set Password" account** — SEC-09 requires a test user with `passwordEnabled = false`. The current `data_test_users.xlsx` shape does not indicate whether any user qualifies. | SEC-09 |
| 6 | **Locale preference store** — SO-03 depends on the Zustand `locale-preference-store` (localStorage). The test must explicitly set `localStorage.setItem(...)` before navigating to mimic a Vietnamese-locale session. | SO-03 |
| 7 | **Clerk `data-clerk-ready` attribute** — the `waitForClerkReady` helper polls for `[data-clerk-ready="true"]`. Confirm this attribute is still emitted by the current Clerk version in use. If it has changed in newer Clerk releases, update the helper. | All SI, SU tests |
| 8 | **`/sign-up/verify-email-address` sub-route** — Clerk manages this sub-path internally. The Playwright `path` prop is set to the locale-prefixed `/sign-up`, so deep-link URLs to the verify step may or may not be bookmarkable. Confirm whether a page refresh at the OTP step works or requires re-initiating sign-up. | SU-10, SU-11 |
| 9 | **Breach test accounts** — Clerk's breach detection is based on Have I Been Pwned. Common passwords like `password123` are usually flagged, but behaviour may vary by Clerk instance config. A dedicated test account using a known-breached password is strongly recommended. | BR-01 through BR-04 |
| 10 | **`/vi/reset-password`** — the reset-password page is a server component calling `getLocale()`. Verify that navigating to the Vietnamese variant with a valid token works end-to-end (locale-prefixed redirect to `/vi/user/security` is expected). | RP-01, I18N-03 |
