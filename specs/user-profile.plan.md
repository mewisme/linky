# User Profile Feature — Playwright Test Plan

## Overview

This test plan covers the complete User Profile feature of Linky, including profile management, bio, personal info, interest tags, avatar, name/country editing, blocked users, settings navigation, and internationalization. The feature spans:

- **Frontend** (`apps/web/src/features/user/ui/`): Profile page client (`user-profile-client.tsx`), avatar upload (`profile-avatar.tsx`), name & country editing (`profile-name-fields.tsx`), bio section (`bio-section.tsx`), personal info section (`personal-info-section.tsx`), interest tags section (`interest-tags-section.tsx`), blocked users client (`blocked-users-client.tsx`).
- **Frontend pages**: `/user/profile`, `/settings`, `/settings/appearance`, `/settings/notifications`, `/settings/development`, `/connections/blocked-users`, `/connections/favorites`, `/user/progress`, `/user/reports`.
- **Backend** (`apps/api/src/domains/user/`): REST endpoints for user details, settings, blocks, streak, level, progress.
- **State**: Zustand store (`useUserStore`) + React Context (`useUserContext`) + Clerk auth.

## Test Infrastructure

### Configuration
- **Playwright config**: `playwright.config.ts`
- **testDir**: `./playwright/tests`
- **baseURL**: `process.env.BASE_TEST_URL`
- **Global setup**: `./playwright/global-setup.ts`
- **Browser**: Chromium only

### Auth
- Authentication via Clerk
- `playwright/fixtures/auth.fixtures.ts` — `authenticateUser(page, user)`
- `playwright/fixtures/users.fixtures.ts` — `TEST_USERS` (user1 through user7)
- `playwright/helpers/clerk-helpers.ts` — `waitForClerkReady(page)`

### Test File Conventions
- Files: `playwright/tests/user-profile/<test-name>.spec.ts`
- Spec reference: `// spec: specs/user-profile.plan.md`
- Seed reference: `// seed: playwright/tests/seed.spec.ts`
- Uses `test.describe` for groups, `test.beforeEach` for setup
- Authenticates user in `beforeEach` via `authenticateUser(page, TEST_USERS.user1)`

### Locator Strategy
The pages currently lack `data-testid` attributes. Tests should locate elements by:
- **Role + accessible name**: `page.getByRole('button', { name: /edit/i })`
- **Label text**: `page.getByLabel(...)`, `page.getByPlaceholder(...)`
- **Text content**: `page.getByText(...)`, `page.locator('text=...')`
- **CSS selectors with semantic elements**: `section[aria-label="..."]`, `input[type="file"]`

### Test IDs to Add (Recommended)
For robust testing, the following `data-testid` attributes should be added to profile page elements:

| Test ID | Element |
|---------|---------|
| `profile-avatar` | Avatar container |
| `profile-avatar-upload` | Hidden file input for avatar |
| `profile-name-display` | Display name text |
| `profile-country-display` | Country display |
| `profile-email-display` | Email display |
| `profile-header-edit-btn` | Edit button in profile header |
| `profile-first-name-input` | First name input in edit mode |
| `profile-last-name-input` | Last name input in edit mode |
| `profile-country-combobox` | Country combobox trigger |
| `profile-name-save-btn` | Save button for name editing |
| `profile-name-cancel-btn` | Cancel button for name editing |
| `profile-bio-section` | Bio section container |
| `profile-bio-edit-btn` | Bio edit button |
| `profile-bio-textarea` | Bio textarea |
| `profile-bio-char-counter` | Character counter |
| `profile-bio-save-btn` | Bio save button |
| `profile-bio-cancel-btn` | Bio cancel button |
| `profile-bio-display` | Bio display text |
| `profile-personal-info-section` | Personal info section |
| `profile-dob-display` | Date of birth display |
| `profile-gender-display` | Gender display |
| `profile-personal-info-edit-btn` | Personal info edit button |
| `profile-personal-info-save-btn` | Save button |
| `profile-personal-info-cancel-btn` | Cancel button |
| `profile-interests-section` | Interest tags section |
| `profile-interests-edit-btn` | Interest tags edit button |
| `profile-interests-save-btn` | Save button |
| `profile-interests-cancel-btn` | Cancel button |
| `profile-interests-search-input` | Tag search input |
| `profile-interests-empty` | Empty state message |
| `settings-grid` | Settings cards grid |
| `settings-card-{id}` | Individual settings card |
| `blocked-users-table` | Blocked users data table |
| `blocked-users-refresh-btn` | Refresh button |
| `blocked-users-empty` | Empty state |

---

## Test Data / Seed Requirements

One test user with a complete profile is required:
- **User**: `TEST_USERS.user1`
  - First name: set (e.g., "Test")
  - Last name: set (e.g., "User")
  - Country: set (e.g., "VN")
  - Bio: set (e.g., "Hello, I use Linky!")
  - Date of birth: set
  - Gender: set
  - Interest tags: at least 3 tags assigned
  - Avatar: uploaded

If the test user does not have all fields populated, test cases for empty/not-provided states should still pass (they verify the "Not provided" fallback text).

---

## Test Groups

### Group 1: Profile Page — Page Load & Display
**Coverage:** Navigation to the profile page, all sections render, correct user data displayed.

#### Test Case 1.1: Profile page loads with all sections visible
- **Priority:** P0
- **Description:** Verify navigating to `/user/profile` renders the profile page with avatar, name, bio, personal info, and interest tags sections.
- **Preconditions:** Authenticated user on home page.
- **Steps:**
  1. `await authenticateUser(page, TEST_USERS.user1)`
  2. `await page.goto('/user/profile')`
  3. Wait for page to fully load.
- **Expected Results:**
  - Avatar is visible.
  - Name display (first and last name) is visible.
  - Country flag and name are visible.
  - Email is visible.
  - Bio section header "Bio" is visible.
  - Personal info section header is visible.
  - Interest tags section header is visible.
- **Test Data:** Any authenticated test user.

#### Test Case 1.2: Correct user data is displayed
- **Priority:** P0
- **Description:** Verify the profile page shows the authenticated user's actual data (name, email, country).
- **Preconditions:** Authenticated user with known profile data.
- **Steps:**
  1. Navigate to `/user/profile`.
  2. Inspect the displayed name, email, and country.
- **Expected Results:**
  - Displayed name matches the authenticated user's first + last name.
  - Displayed email matches the authenticated user's email.
  - Country display corresponds to the user's stored country.
- **Test Data:** `TEST_USERS.user1`

#### Test Case 1.3: Bio displays "Not provided" when empty
- **Priority:** P1
- **Description:** Verify that when a user has no bio set, the bio section shows "Not provided".
- **Preconditions:** Authenticated user with no bio set.
- **Steps:**
  1. Navigate to `/user/profile`.
  2. Locate the bio section.
- **Expected Results:**
  - Bio display area shows the text "Not provided" (or the i18n equivalent).
- **Test Data:** A user without bio set, or verify the fallback text shows when bio is empty.

#### Test Case 1.4: Personal info shows "Not provided" for empty fields
- **Priority:** P1
- **Description:** Verify that date of birth and gender display "Not provided" when not set.
- **Preconditions:** Authenticated user with no date of birth or gender set.
- **Steps:**
  1. Navigate to `/user/profile`.
  2. Inspect date of birth and gender fields.
- **Expected Results:**
  - Date of birth shows "Not provided".
  - Gender shows "Not provided".
- **Test Data:** A user without date of birth and gender.

#### Test Case 1.5: Interest tags show "No interests selected" when empty
- **Priority:** P1
- **Description:** Verify the empty state message when no interest tags are selected.
- **Preconditions:** Authenticated user with no interest tags.
- **Steps:**
  1. Navigate to `/user/profile`.
  2. Locate the interest tags section.
- **Expected Results:**
  - Text "No interests selected" is displayed.
- **Test Data:** A user with no interest tags.

#### Test Case 1.6: Sidebar highlights the profile item
- **Priority:** P2
- **Description:** Verify the sidebar navigation highlights the "Profile" item as active.
- **Preconditions:** Authenticated user on `/user/profile`.
- **Steps:**
  1. Navigate to `/user/profile`.
  2. Inspect sidebar.
- **Expected Results:**
  - The profile sidebar item is visually highlighted/active.
- **Test Data:** Any authenticated test user.

---

### Group 2: Profile — Avatar Management
**Coverage:** Avatar display, hover overlay, file upload, error handling.

#### Test Case 2.1: Avatar is displayed
- **Priority:** P0
- **Description:** Verify the user's avatar image is rendered.
- **Preconditions:** Authenticated user on `/user/profile` with an avatar set.
- **Steps:**
  1. Navigate to `/user/profile`.
  2. Locate the avatar element.
- **Expected Results:**
  - An avatar image is visible with the user's profile picture.
- **Test Data:** `TEST_USERS.user1` (with avatar)

#### Test Case 2.2: Avatar fallback shows first letter when no image
- **Priority:** P1
- **Description:** Verify the fallback displays the first letter of the user's first name or email when no avatar image is set.
- **Preconditions:** Authenticated user with no avatar image.
- **Steps:**
  1. Navigate to `/user/profile`.
  2. Inspect the avatar area.
- **Expected Results:**
  - A fallback letter is displayed (first letter of first name or email).
- **Test Data:** A user without an avatar.

#### Test Case 2.3: Hover shows "Change photo" overlay
- **Priority:** P1
- **Description:** Verify hovering over the avatar shows the camera icon and "Change photo" label.
- **Preconditions:** Authenticated user on `/user/profile`.
- **Steps:**
  1. Navigate to `/user/profile`.
  2. Hover over the avatar element.
- **Expected Results:**
  - A semi-transparent overlay appears over the avatar.
  - A camera icon is visible.
  - "Change photo" label is visible.
- **Test Data:** Any authenticated test user.

#### Test Case 2.4: Upload a valid image file
- **Priority:** P0
- **Description:** Verify uploading a valid image updates the avatar and shows a success toast.
- **Preconditions:** Authenticated user on `/user/profile`.
- **Steps:**
  1. Navigate to `/user/profile`.
  2. Locate the hidden file input (`#avatar-upload`).
  3. Upload a valid PNG or JPEG image file using `page.locator('#avatar-upload').setInputFiles(...)`.
  4. Wait for the upload to complete.
- **Expected Results:**
  - A loading/pending state appears during upload.
  - A success toast with "Avatar updated" message appears.
  - The avatar image changes to the newly uploaded image.
- **Test Data:** `TEST_USERS.user1`, a small valid PNG test file.

#### Test Case 2.5: Upload an invalid file shows error toast
- **Priority:** P1
- **Description:** Verify uploading a non-image file shows an error toast.
- **Preconditions:** Authenticated user on `/user/profile`.
- **Steps:**
  1. Navigate to `/user/profile`.
  2. Upload a non-image file (e.g., a `.txt` file) via the avatar file input.
- **Expected Results:**
  - An error toast with "Invalid image file" message appears.
  - Avatar remains unchanged.
- **Test Data:** `TEST_USERS.user1`, a small `.txt` file.

#### Test Case 2.6: Avatar upload handles network failure gracefully
- **Priority:** P2
- **Description:** Verify that if the upload API fails, an error toast is shown.
- **Preconditions:** Authenticated user on `/user/profile`; API may be mocked to return an error.
- **Steps:**
  1. Navigate to `/user/profile`.
  2. Upload a valid image while network is unreliable (or mock the failure).
- **Expected Results:**
  - An error toast appears (e.g., "Upload failed").
  - Avatar does not change.
- **Test Data:** `TEST_USERS.user1`, a valid image file.

---

### Group 3: Profile — Name & Country Editing
**Coverage:** Edit button appearance, inline edit form, save, cancel, keyboard escape, country combobox.

#### Test Case 3.1: Edit button appears on header hover
- **Priority:** P1
- **Description:** Verify the Edit button appears in the profile header on hover.
- **Preconditions:** Authenticated user on `/user/profile` (desktop viewport).
- **Steps:**
  1. Navigate to `/user/profile`.
  2. Hover over the profile header section (`section[aria-label="Profile identity"]`).
- **Expected Results:**
  - An Edit button containing "Edit" text becomes visible.
- **Test Data:** Any authenticated test user.

#### Test Case 3.2: Clicking edit shows name and country edit form
- **Priority:** P0
- **Description:** Verify clicking the Edit button in the header switches to edit mode with first name, last name, and country inputs.
- **Preconditions:** Authenticated user on `/user/profile`.
- **Steps:**
  1. Navigate to `/user/profile`.
  2. Click the Edit button in the profile header.
- **Expected Results:**
  - First name input appears, pre-filled with current first name.
  - Last name input appears, pre-filled with current last name.
  - Country combobox appears.
  - Save and Cancel buttons appear.
  - The display name is replaced by the edit form.
- **Test Data:** `TEST_USERS.user1`

#### Test Case 3.3: Save name and country changes
- **Priority:** P0
- **Description:** Verify editing first name, last name, and country and clicking Save persists the changes.
- **Preconditions:** Authenticated user on `/user/profile` in edit mode.
- **Steps:**
  1. Navigate to `/user/profile`, click Edit.
  2. Clear and type a new first name.
  3. Clear and type a new last name.
  4. Select a different country from the combobox.
  5. Click Save.
- **Expected Results:**
  - A loading spinner appears on the Save button during save.
  - A success toast with "Profile updated" message appears.
  - Edit mode closes.
  - New first name, last name, and country are displayed.
- **Test Data:** `TEST_USERS.user1`

#### Test Case 3.4: Cancel edit reverts to original values
- **Priority:** P1
- **Description:** Verify clicking Cancel after editing reverts all fields to original values.
- **Preconditions:** Authenticated user on `/user/profile` in edit mode.
- **Steps:**
  1. Navigate to `/user/profile`, click Edit.
  2. Change the first name, last name, and country.
  3. Click Cancel.
- **Expected Results:**
  - Edit mode closes.
  - Original name and country values are restored in the display.
  - No API call is made.
- **Test Data:** `TEST_USERS.user1`

#### Test Case 3.5: Escape key cancels editing
- **Priority:** P2
- **Description:** Verify pressing the Escape key during editing returns to view mode with original values.
- **Preconditions:** Authenticated user on `/user/profile` in edit mode.
- **Steps:**
  1. Navigate to `/user/profile`, click Edit.
  2. Modify first name.
  3. Press Escape key.
- **Expected Results:**
  - Edit mode closes.
  - Original values are restored.
- **Test Data:** `TEST_USERS.user1`

#### Test Case 3.6: Country combobox search and select
- **Priority:** P1
- **Description:** Verify the country combobox allows searching and selecting a country.
- **Preconditions:** Authenticated user on `/user/profile` in edit mode.
- **Steps:**
  1. Navigate to `/user/profile`, click Edit.
  2. Click the country combobox trigger.
  3. Type a country name in the search input.
  4. Select a country from the filtered results.
- **Expected Results:**
  - Country combobox opens with a list of countries.
  - Typing filters the list.
  - Selected country appears in the trigger.
- **Test Data:** `TEST_USERS.user1`

#### Test Case 3.7: Save with empty first name
- **Priority:** P2
- **Description:** Verify behavior when saving with an empty first name (should allow empty, no validation on client side based on current code).
- **Preconditions:** Authenticated user on `/user/profile` in edit mode.
- **Steps:**
  1. Navigate to `/user/profile`, click Edit.
  2. Clear the first name input.
  3. Click Save.
- **Expected Results:**
  - Save succeeds (first name is updated to empty).
  - Display shows only the last name (or no name).
- **Test Data:** `TEST_USERS.user1`

#### Test Case 3.8: Save handles API error gracefully
- **Priority:** P2
- **Description:** Verify an error toast is shown when the name update API fails.
- **Preconditions:** Authenticated user on `/user/profile`; API failure simulated.
- **Steps:**
  1. Navigate to `/user/profile`, click Edit.
  2. Modify fields, click Save when the API is expected to fail.
- **Expected Results:**
  - An error toast appears (e.g., "Update failed").
  - Edit mode remains open with modified values intact.
- **Test Data:** `TEST_USERS.user1`

---

### Group 4: Profile — Bio Section
**Coverage:** Click to edit, textarea input, character counter, save, cancel, empty state, 300-char limit.

#### Test Case 4.1: Bio section displays current bio text
- **Priority:** P0
- **Description:** Verify the bio section shows the user's current bio text.
- **Preconditions:** Authenticated user with a bio set.
- **Steps:**
  1. Navigate to `/user/profile`.
  2. Locate the bio section.
- **Expected Results:**
  - The user's bio text is displayed in the bio area.
  - The bio area is clickable (looks interactive).
- **Test Data:** `TEST_USERS.user1`

#### Test Case 4.2: Click bio area enters edit mode
- **Priority:** P0
- **Description:** Verify clicking the bio display area switches to edit mode with a textarea.
- **Preconditions:** Authenticated user on `/user/profile`.
- **Steps:**
  1. Navigate to `/user/profile`.
  2. Click the bio display area (or the Edit button if present).
- **Expected Results:**
  - A textarea appears, pre-filled with current bio.
  - Character counter shows current length / 300.
  - Save and Cancel buttons appear.
- **Test Data:** `TEST_USERS.user1`

#### Test Case 4.3: Bio character counter updates while typing
- **Priority:** P1
- **Description:** Verify the character counter updates in real-time as the user types.
- **Preconditions:** Authenticated user on `/user/profile` in bio edit mode.
- **Steps:**
  1. Enter bio edit mode.
  2. Type text in the textarea.
  3. Observe the character counter.
- **Expected Results:**
  - Counter shows "N/300" where N is the current character count.
  - Counter updates with each keystroke.
- **Test Data:** `TEST_USERS.user1`

#### Test Case 4.4: Bio enforces 300 character maximum
- **Priority:** P1
- **Description:** Verify the bio textarea does not accept more than 300 characters.
- **Preconditions:** Authenticated user on `/user/profile` in bio edit mode.
- **Steps:**
  1. Enter bio edit mode.
  2. Type or paste a string longer than 300 characters.
- **Expected Results:**
  - Text is truncated at 300 characters.
  - Counter shows "300/300".
  - No characters beyond 300 appear.
- **Test Data:** `TEST_USERS.user1`

#### Test Case 4.5: Save bio updates display
- **Priority:** P0
- **Description:** Verify clicking Save persists the bio and shows a success toast.
- **Preconditions:** Authenticated user on `/user/profile` in bio edit mode.
- **Steps:**
  1. Enter bio edit mode.
  2. Type a new bio.
  3. Click Save.
- **Expected Results:**
  - Loading state on Save button.
  - Success toast with "Bio updated" message.
  - Edit mode closes, new bio is displayed.
- **Test Data:** `TEST_USERS.user1`

#### Test Case 4.6: Cancel edit reverts bio
- **Priority:** P1
- **Description:** Verify clicking Cancel in bio edit mode reverts to the original bio.
- **Preconditions:** Authenticated user on `/user/profile` in bio edit mode.
- **Steps:**
  1. Enter bio edit mode.
  2. Modify the bio text.
  3. Click Cancel.
- **Expected Results:**
  - Edit mode closes.
  - Original bio text is displayed.
- **Test Data:** `TEST_USERS.user1`

#### Test Case 4.7: Empty bio saves as null (shows "Not provided")
- **Priority:** P1
- **Description:** Verify clearing the bio and saving displays "Not provided".
- **Preconditions:** Authenticated user with a bio set.
- **Steps:**
  1. Enter bio edit mode.
  2. Clear all text in the textarea.
  3. Click Save.
- **Expected Results:**
  - Save succeeds.
  - Bio display shows "Not provided".
- **Test Data:** `TEST_USERS.user1`

#### Test Case 4.8: Bio edit button appears on hover
- **Priority:** P2
- **Description:** Verify the Edit button for bio appears on hover over the bio section.
- **Preconditions:** Authenticated user on `/user/profile` (desktop viewport).
- **Steps:**
  1. Navigate to `/user/profile`.
  2. Hover over the bio section area.
- **Expected Results:**
  - An Edit button appears.
- **Test Data:** Any authenticated test user.

---

### Group 5: Profile — Personal Info
**Coverage:** Date of birth picker, gender select, save, cancel, empty states.

#### Test Case 5.1: Date of birth and gender are displayed
- **Priority:** P0
- **Description:** Verify the personal info section shows current date of birth and gender.
- **Preconditions:** Authenticated user with date of birth and gender set.
- **Steps:**
  1. Navigate to `/user/profile`.
  2. Locate the personal info section.
- **Expected Results:**
  - Date of birth is displayed in a human-readable format.
  - Gender is displayed as a readable label (e.g., "Male").
- **Test Data:** `TEST_USERS.user1`

#### Test Case 5.2: Click edit opens inline editing for date of birth and gender
- **Priority:** P0
- **Description:** Verify clicking the Edit button in personal info section shows date picker and gender select.
- **Preconditions:** Authenticated user on `/user/profile`.
- **Steps:**
  1. Navigate to `/user/profile`.
  2. Click the Edit button in the personal info section.
- **Expected Results:**
  - A date picker appears for date of birth.
  - A select dropdown appears for gender with options: Male, Female, Other, Prefer not to say.
  - Save and Cancel buttons appear.
- **Test Data:** `TEST_USERS.user1`

#### Test Case 5.3: Select a date of birth and save
- **Priority:** P0
- **Description:** Verify selecting a date of birth via the date picker and saving updates the display.
- **Preconditions:** Authenticated user on `/user/profile` in personal info edit mode.
- **Steps:**
  1. Enter personal info edit mode.
  2. Open the date picker.
  3. Select a date.
  4. Click Save.
- **Expected Results:**
  - Loading state on Save button.
  - Success toast with "Personal info updated" message.
  - New date of birth is displayed.
- **Test Data:** `TEST_USERS.user1`

#### Test Case 5.4: Select a gender and save
- **Priority:** P0
- **Description:** Verify selecting a gender from the dropdown and saving updates the display.
- **Preconditions:** Authenticated user on `/user/profile` in personal info edit mode.
- **Steps:**
  1. Enter personal info edit mode.
  2. Open the gender select dropdown.
  3. Choose a gender option (e.g., "Female").
  4. Click Save.
- **Expected Results:**
  - Success toast appears.
  - Selected gender is displayed.
- **Test Data:** `TEST_USERS.user1`

#### Test Case 5.5: Cancel reverts personal info changes
- **Priority:** P1
- **Description:** Verify clicking Cancel reverts date of birth and gender to original values.
- **Preconditions:** Authenticated user on `/user/profile` in personal info edit mode.
- **Steps:**
  1. Enter personal info edit mode.
  2. Change date of birth.
  3. Change gender.
  4. Click Cancel.
- **Expected Results:**
  - Edit mode closes.
  - Original date of birth and gender are displayed.
- **Test Data:** `TEST_USERS.user1`

#### Test Case 5.6: Clear date of birth saves as null
- **Priority:** P2
- **Description:** Verify clearing the date of birth and saving shows "Not provided".
- **Preconditions:** Authenticated user with date of birth set.
- **Steps:**
  1. Enter personal info edit mode.
  2. Clear the date of birth (if possible via the date picker).
  3. Click Save.
- **Expected Results:**
  - Date of birth displays "Not provided".
- **Test Data:** `TEST_USERS.user1`

#### Test Case 5.7: Clear gender saves as null
- **Priority:** P2
- **Description:** Verify setting gender to empty/null and saving shows "Not provided".
- **Preconditions:** Authenticated user with gender set.
- **Steps:**
  1. Enter personal info edit mode.
  2. Set gender to an empty/unselected state (if select allows).
  3. Click Save.
- **Expected Results:**
  - Gender displays "Not provided".
- **Test Data:** `TEST_USERS.user1`

#### Test Case 5.8: Edit button appears on hover
- **Priority:** P2
- **Description:** Verify the personal info Edit button is hidden by default and appears on hover (desktop).
- **Preconditions:** Authenticated user on `/user/profile` (desktop viewport).
- **Steps:**
  1. Navigate to `/user/profile`.
  2. Hover over the personal info section.
- **Expected Results:**
  - An Edit button becomes visible.
- **Test Data:** Any authenticated test user.

---

### Group 6: Profile — Interest Tags
**Coverage:** Tag display with icons, show more/less toggle, edit mode, tag search, select/deselect, save, cancel, empty state, loading state.

#### Test Case 6.1: Interest tags display with icons and names
- **Priority:** P0
- **Description:** Verify assigned interest tags are displayed as badges with icons and names.
- **Preconditions:** Authenticated user with at least 3 interest tags.
- **Steps:**
  1. Navigate to `/user/profile`.
  2. Locate the interest tags section.
- **Expected Results:**
  - Tags are displayed as badge components.
  - Each badge shows an icon (emoji) and tag name.
  - Tags with categories show category in parentheses.
- **Test Data:** `TEST_USERS.user1`

#### Test Case 6.2: "Show more" expands hidden tags
- **Priority:** P1
- **Description:** Verify when more than 6 tags exist, only 6 are shown initially and a "Show more (+N)" button reveals the rest.
- **Preconditions:** Authenticated user with more than 6 interest tags.
- **Steps:**
  1. Navigate to `/user/profile`.
  2. Count visible tags (should be 6).
  3. Click "Show more (+N)".
- **Expected Results:**
  - Initially only 6 tags are visible.
  - After clicking, all tags are visible.
  - Button text changes to "Show less".
- **Test Data:** A user with 7+ interest tags.

#### Test Case 6.3: "Show less" collapses tags back
- **Priority:** P2
- **Description:** Verify clicking "Show less" collapses the tag list back to 6.
- **Preconditions:** Authenticated user with more than 6 interest tags, tags are expanded.
- **Steps:**
  1. Navigate to `/user/profile`.
  2. Click "Show more".
  3. Click "Show less".
- **Expected Results:**
  - Only 6 tags are visible again.
  - Button text changes back to "Show more (+N)".
- **Test Data:** A user with 7+ interest tags.

#### Test Case 6.4: Click edit enters tag selection mode
- **Priority:** P0
- **Description:** Verify clicking Edit in the interest tags section opens the tags multi-select component.
- **Preconditions:** Authenticated user on `/user/profile`.
- **Steps:**
  1. Navigate to `/user/profile`.
  2. Click the Edit button in the interest tags section.
- **Expected Results:**
  - A tags multi-select component appears with a search input.
  - Currently selected tags appear as removable chips in the trigger.
  - A catalog of available tags loads (may show a spinner briefly).
  - Save and Cancel buttons appear.
- **Test Data:** `TEST_USERS.user1`

#### Test Case 6.5: Tags catalog loads with spinner
- **Priority:** P2
- **Description:** Verify a loading spinner appears while the tag catalog is fetched from the API.
- **Preconditions:** Authenticated user on `/user/profile`.
- **Steps:**
  1. Navigate to `/user/profile`.
  2. Click Edit on interest tags.
- **Expected Results:**
  - A loading spinner is visible while tags load.
  - Tags appear once loading completes.
- **Test Data:** `TEST_USERS.user1`

#### Test Case 6.6: Search filters available tags
- **Priority:** P1
- **Description:** Verify typing in the tag search input filters the displayed tag list.
- **Preconditions:** Authenticated user on `/user/profile` in tag edit mode with tags loaded.
- **Steps:**
  1. Enter tag edit mode.
  2. Type a search term in the tags search input.
- **Expected Results:**
  - Only tags matching the search term (by name, description, or category) are shown.
  - Non-matching tags are hidden.
- **Test Data:** `TEST_USERS.user1`

#### Test Case 6.7: No tags found shows empty state
- **Priority:** P2
- **Description:** Verify searching for a non-existent tag shows "No tags found" message.
- **Preconditions:** Authenticated user in tag edit mode.
- **Steps:**
  1. Enter tag edit mode.
  2. Type a gibberish search term like "xyzzy123".
- **Expected Results:**
  - "No tags found" message is displayed.
- **Test Data:** `TEST_USERS.user1`

#### Test Case 6.8: Select a tag adds it to selected chips
- **Priority:** P1
- **Description:** Verify clicking an unselected tag adds it to the selected tags in the trigger.
- **Preconditions:** Authenticated user in tag edit mode with tags loaded.
- **Steps:**
  1. Enter tag edit mode.
  2. Click on an unselected tag in the list.
- **Expected Results:**
  - A checkmark appears next to the tag in the list.
  - The tag appears as a removable chip in the trigger area.
- **Test Data:** `TEST_USERS.user1`

#### Test Case 6.9: Deselect a tag removes it from chips
- **Priority:** P1
- **Description:** Verify clicking a selected tag (or its remove button) removes it from selection.
- **Preconditions:** Authenticated user in tag edit mode with tags loaded.
- **Steps:**
  1. Enter tag edit mode.
  2. Click on a currently selected tag's remove button in the trigger, or click the tag in the list to toggle it off.
- **Expected Results:**
  - The checkmark disappears from the tag in the list.
  - The tag chip is removed from the trigger.
- **Test Data:** `TEST_USERS.user1`

#### Test Case 6.10: Save interest tags updates display
- **Priority:** P0
- **Description:** Verify clicking Save persists the selected tags and shows a success toast.
- **Preconditions:** Authenticated user in tag edit mode with tags modified.
- **Steps:**
  1. Enter tag edit mode.
  2. Select new tags and deselect some existing ones.
  3. Click Save.
- **Expected Results:**
  - Loading state on Save button.
  - Success toast with "Interest tags updated" message.
  - Edit mode closes.
  - Updated tags are displayed.
- **Test Data:** `TEST_USERS.user1`

#### Test Case 6.11: Cancel reverts tag selection
- **Priority:** P1
- **Description:** Verify clicking Cancel reverts to the originally selected tags.
- **Preconditions:** Authenticated user in tag edit mode with tags modified.
- **Steps:**
  1. Enter tag edit mode.
  2. Select and deselect some tags.
  3. Click Cancel.
- **Expected Results:**
  - Edit mode closes.
  - Original tags are displayed.
- **Test Data:** `TEST_USERS.user1`

#### Test Case 6.12: Tooltip shows tag description on hover
- **Priority:** P2
- **Description:** Verify hovering over a tag badge in view mode shows a tooltip with the tag's description.
- **Preconditions:** Authenticated user on `/user/profile` with tags that have descriptions.
- **Steps:**
  1. Navigate to `/user/profile`.
  2. Hover over a tag badge that has a description.
- **Expected Results:**
  - A tooltip appears showing the tag's description text.
- **Test Data:** `TEST_USERS.user1`

---

### Group 7: Blocked Users Page
**Coverage:** Page navigation, blocked users list, unblock action, refresh, empty state.

#### Test Case 7.1: Blocked users page loads
- **Priority:** P0
- **Description:** Verify navigating to `/connections/blocked-users` renders the blocked users page.
- **Preconditions:** Authenticated user.
- **Steps:**
  1. `await authenticateUser(page, TEST_USERS.user1)`
  2. `await page.goto('/connections/blocked-users')`
- **Expected Results:**
  - Page loads with title "Blocked Users".
  - A data table or content area is visible.
- **Test Data:** `TEST_USERS.user1`

#### Test Case 7.2: Blocked users list displays entries
- **Priority:** P0
- **Description:** Verify the blocked users table shows entries if any users are blocked.
- **Preconditions:** Authenticated user with at least one blocked user.
- **Steps:**
  1. Navigate to `/connections/blocked-users`.
  2. Inspect the data table.
- **Expected Results:**
  - Blocked users are listed with their details.
  - Each row has an unblock action.
- **Test Data:** `TEST_USERS.user1` (with blocked users)

#### Test Case 7.3: Empty state when no blocked users
- **Priority:** P1
- **Description:** Verify the page shows an empty state when no users are blocked.
- **Preconditions:** Authenticated user with no blocked users.
- **Steps:**
  1. Navigate to `/connections/blocked-users`.
- **Expected Results:**
  - An empty state message or empty table is displayed.
- **Test Data:** A user with no blocked users.

#### Test Case 7.4: Unblock a user removes them from the list
- **Priority:** P0
- **Description:** Verify clicking the unblock action removes a user from the blocked list.
- **Preconditions:** Authenticated user on `/connections/blocked-users` with blocked users.
- **Steps:**
  1. Navigate to `/connections/blocked-users`.
  2. Click the unblock action on a row.
- **Expected Results:**
  - A success toast with "User unblocked" message appears.
  - The user is removed from the table.
- **Test Data:** `TEST_USERS.user1` (with at least one blocked user)

#### Test Case 7.5: Refresh button reloads blocked users
- **Priority:** P2
- **Description:** Verify clicking the refresh button reloads the blocked users list from the API.
- **Preconditions:** Authenticated user on `/connections/blocked-users`.
- **Steps:**
  1. Navigate to `/connections/blocked-users`.
  2. Click the refresh button.
- **Expected Results:**
  - The table reloads with current data.
  - A loading spinner may appear on the refresh button during fetch.
- **Test Data:** `TEST_USERS.user1`

#### Test Case 7.6: Unblock handles API error gracefully
- **Priority:** P2
- **Description:** Verify an error toast is shown when unblock fails.
- **Preconditions:** Authenticated user on `/connections/blocked-users`; API failure simulated.
- **Steps:**
  1. Navigate to `/connections/blocked-users`.
  2. Click unblock when API is expected to fail.
- **Expected Results:**
  - An error toast appears (e.g., "Unblock failed").
  - The user remains in the list.
- **Test Data:** `TEST_USERS.user1`

---

### Group 8: Settings Navigation
**Coverage:** Settings index page, cards grid, navigation to sub-pages.

#### Test Case 8.1: Settings page loads with cards grid
- **Priority:** P0
- **Description:** Verify navigating to `/settings` shows a grid of settings category cards.
- **Preconditions:** Authenticated user.
- **Steps:**
  1. Navigate to `/settings`.
- **Expected Results:**
  - Page loads with "Settings" heading and description.
  - A grid of cards is displayed (Appearance, Notifications, Development, etc.).
  - Each card has an icon, title, and description.
- **Test Data:** Any authenticated test user.

#### Test Case 8.2: Navigate to Appearance settings
- **Priority:** P1
- **Description:** Verify clicking the Appearance card navigates to `/settings/appearance`.
- **Preconditions:** Authenticated user on `/settings`.
- **Steps:**
  1. Navigate to `/settings`.
  2. Click the Appearance card.
- **Expected Results:**
  - URL changes to `/settings/appearance`.
  - Appearance settings page loads (shader selector, sidebar variant).
- **Test Data:** Any authenticated test user.

#### Test Case 8.3: Navigate to Notification settings
- **Priority:** P1
- **Description:** Verify clicking the Notifications card navigates to `/settings/notifications`.
- **Preconditions:** Authenticated user on `/settings`.
- **Steps:**
  1. Navigate to `/settings`.
  2. Click the Notifications card.
- **Expected Results:**
  - URL changes to `/settings/notifications`.
  - Notification settings page loads with sound toggle and push notification section.
- **Test Data:** Any authenticated test user.

#### Test Case 8.4: Navigate to Development settings
- **Priority:** P2
- **Description:** Verify clicking the Development card navigates to `/settings/development`.
- **Preconditions:** Authenticated user on `/settings`.
- **Steps:**
  1. Navigate to `/settings`.
  2. Click the Development card.
- **Expected Results:**
  - URL changes to `/settings/development`.
  - Development settings page loads.
- **Test Data:** Any authenticated test user.

#### Test Case 8.5: Notification sound toggle works
- **Priority:** P1
- **Description:** Verify toggling the notification sound switch and saving persists the change.
- **Preconditions:** Authenticated user on `/settings/notifications`.
- **Steps:**
  1. Navigate to `/settings/notifications`.
  2. Toggle the notification sound switch.
  3. Click Save.
- **Expected Results:**
  - Loading state on Save button.
  - Success toast with "Settings updated" message.
  - Toggle state persists on reload.
- **Test Data:** `TEST_USERS.user1`

#### Test Case 8.6: Settings cards are keyboard accessible
- **Priority:** P2
- **Description:** Verify settings cards can be navigated via keyboard (Tab and Enter).
- **Preconditions:** Authenticated user on `/settings`.
- **Steps:**
  1. Navigate to `/settings`.
  2. Press Tab to focus a settings card.
  3. Press Enter.
- **Expected Results:**
  - Cards receive visible focus indicator.
  - Pressing Enter navigates to the corresponding sub-page.
- **Test Data:** Any authenticated test user.

---

### Group 9: Internationalization
**Coverage:** Vietnamese locale, label translation, locale switching.

#### Test Case 9.1: Vietnamese locale loads translated profile page
- **Priority:** P1
- **Description:** Verify navigating to `/vi/user/profile` shows the profile page with Vietnamese labels.
- **Preconditions:** Authenticated user.
- **Steps:**
  1. Navigate to `/vi/user/profile`.
  2. Inspect section headers and labels.
- **Expected Results:**
  - Page loads with Vietnamese text for section headers, buttons, and placeholders.
  - "Edit" button text is translated.
  - "Bio", "Personal Info", "Interests" section headers are translated.
  - "Not provided" text is translated.
- **Test Data:** Any authenticated test user.

#### Test Case 9.2: Switch locale from Vietnamese back to English
- **Priority:** P1
- **Description:** Verify navigating from Vietnamese locale back to English restores English labels.
- **Preconditions:** Authenticated user on `/vi/user/profile`.
- **Steps:**
  1. Navigate to `/vi/user/profile`.
  2. Navigate to `/user/profile`.
- **Expected Results:**
  - All labels and text revert to English.
- **Test Data:** Any authenticated test user.

#### Test Case 9.3: Vietnamese settings page loads translated
- **Priority:** P2
- **Description:** Verify the settings page loads with Vietnamese translations.
- **Preconditions:** Authenticated user.
- **Steps:**
  1. Navigate to `/vi/settings`.
- **Expected Results:**
  - Settings page heading and card descriptions are in Vietnamese.
- **Test Data:** Any authenticated test user.

#### Test Case 9.4: Vietnamese blocked users page loads translated
- **Priority:** P2
- **Description:** Verify the blocked users page loads with Vietnamese translations.
- **Preconditions:** Authenticated user.
- **Steps:**
  1. Navigate to `/vi/connections/blocked-users`.
- **Expected Results:**
  - Page heading and table labels are in Vietnamese.
- **Test Data:** Any authenticated test user.

---

### Group 10: Error & Edge Cases
**Coverage:** API failures, auth failures, concurrent edits, loading states.

#### Test Case 10.1: Profile page handles unauthenticated access
- **Priority:** P1
- **Description:** Verify accessing `/user/profile` without authentication redirects to sign-in.
- **Preconditions:** Not authenticated.
- **Steps:**
  1. Navigate to `/user/profile` without authenticating.
- **Expected Results:**
  - User is redirected to the sign-in page.
- **Test Data:** None (no auth).

#### Test Case 10.2: Profile page handles API error on load
- **Priority:** P2
- **Description:** Verify the profile page gracefully handles a failed user details API call (server component catches with `.catch(() => null)`).
- **Preconditions:** Authenticated user; API for user details returns 500.
- **Steps:**
  1. Mock or cause the user details endpoint to fail.
  2. Navigate to `/user/profile`.
- **Expected Results:**
  - Page still loads without crashing.
  - Sections may show empty/fallback states.
- **Test Data:** `TEST_USERS.user1`

#### Test Case 10.3: Concurrent edits do not conflict
- **Priority:** P2
- **Description:** Verify that rapidly editing and saving multiple sections works without race conditions.
- **Preconditions:** Authenticated user on `/user/profile`.
- **Steps:**
  1. Edit bio and save.
  2. Immediately edit personal info and save.
  3. Immediately edit interest tags and save.
- **Expected Results:**
  - All saves complete successfully.
  - Final state reflects all changes.
  - No data loss or corruption.
- **Test Data:** `TEST_USERS.user1`

#### Test Case 10.4: Loading states display during save operations
- **Priority:** P2
- **Description:** Verify each save button shows a loading spinner while the API call is in progress.
- **Preconditions:** Authenticated user on `/user/profile`.
- **Steps:**
  1. Edit any section.
  2. Click Save.
  3. Observe the Save button during the API call.
- **Expected Results:**
  - A spinning loader icon appears on the Save button.
  - Save button is disabled during the call.
  - Loader disappears and toast appears on completion.
- **Test Data:** `TEST_USERS.user1`

#### Test Case 10.5: Bio save API failure shows error toast
- **Priority:** P2
- **Description:** Verify an error toast is shown when the bio update API fails.
- **Preconditions:** Authenticated user in bio edit mode; API failure simulated.
- **Steps:**
  1. Enter bio edit mode and type text.
  2. Click Save when the API is expected to fail.
- **Expected Results:**
  - An error toast appears (e.g., "Update failed").
  - Edit mode remains open with the text intact.
- **Test Data:** `TEST_USERS.user1`

#### Test Case 10.6: Interest tags save API failure shows error toast
- **Priority:** P2
- **Description:** Verify an error toast is shown when the interest tags update API fails.
- **Preconditions:** Authenticated user in tag edit mode; API failure simulated.
- **Steps:**
  1. Enter tag edit mode and modify tags.
  2. Click Save when the API is expected to fail.
- **Expected Results:**
  - An error toast appears.
  - Edit mode remains open.
- **Test Data:** `TEST_USERS.user1`

#### Test Case 10.7: Profile name save with network interruption
- **Priority:** P2
- **Description:** Verify the profile handles network interruption gracefully during save.
- **Preconditions:** Authenticated user in name edit mode.
- **Steps:**
  1. Enter name edit mode and modify fields.
  2. Simulate network disconnection.
  3. Click Save.
- **Expected Results:**
  - An error toast appears.
  - Edit mode remains open.
  - Original values are not lost.
- **Test Data:** `TEST_USERS.user1`

#### Test Case 10.8: Tag catalog fetch failure shows error state
- **Priority:** P2
- **Description:** Verify that if fetching available tags fails, the UI handles it gracefully.
- **Preconditions:** Authenticated user; tags API returns an error.
- **Steps:**
  1. Navigate to `/user/profile`.
  2. Click Edit on interest tags while the tags catalog API is failing.
- **Expected Results:**
  - The spinner disappears.
  - An empty list or error state is shown (no crash).
- **Test Data:** `TEST_USERS.user1`

---

## Test Execution Priority Summary

| Priority | Count | Description |
|----------|-------|-------------|
| P0 | 16 | Critical path: page load, all sections display, save flows for each section, blocked users page load, settings page load |
| P1 | 20 | Important: empty states, cancel/revert, avatar upload, hover interactions, i18n, search, select/deselect |
| P2 | 15 | Nice-to-have: error handling, keyboard accessibility, concurrent edits, tooltips, edge cases |

Total: 51 test cases across 10 groups.

---

## Notes for Implementation

1. **No data-testid attributes exist yet** on profile page elements. Tests must use semantic selectors (`getByRole`, `getByLabel`, `getByPlaceholder`, `getByText`) initially. Adding `data-testid` attributes (per the recommended list above) will improve test reliability.

2. **Test user state**: Tests that modify profile data (name, bio, DOB, gender, tags, avatar) should ideally use a dedicated test user or reset state between test runs. Some tests may need to be run sequentially if they modify shared state.

3. **Avatar upload**: Tests require a test image file. Place a small PNG file (e.g., `playwright/test-data/test-avatar.png`) in the test data directory.

4. **Country combobox**: The `ComboboxCountry` component uses a searchable dropdown. Tests should open the combobox, type a country name, and select from results.

5. **i18n keys**: All user-facing text is internationalized. Tests that check for specific text should use the English locale (default path without `/vi/` prefix) for consistent assertions.

6. **Responsive behavior**: Some hover-based interactions (Edit buttons) only work on desktop viewports (`sm:` breakpoint). Tests should use a desktop viewport (1280x720 or larger).
