# LINKY Test Case Inventory

This inventory lists all testable flows derived from TEST_STRATEGY_AUDIT.md. Test Case IDs follow the convention: TC-AUT-xxx (Automation), TC-MAN-xxx (Manual).

---

## Automation Test Cases

| ID | Feature | Test Type | Test Level | Brief Scenario | Preconditions | Expected Outcome |
|----|---------|-----------|------------|----------------|---------------|------------------|
| TC-AUT-001 | Authentication | Automation | UI | Sign-in with empty email | Page at /sign-in, Clerk ready | Email input retains value; no navigation |
| TC-AUT-002 | Authentication | Automation | UI | Sign-in with invalid email format | Page at /sign-in, Clerk ready | Email input retains value; no navigation |
| TC-AUT-003 | Authentication | Automation | UI | Sign-in with non-existent email | Page at /sign-in, Clerk ready | Error message visible: account not found |
| TC-AUT-004 | Authentication | Automation | UI | Sign-in with empty password | Email submitted, password page visible | Password input retains value; no submit |
| TC-AUT-005 | Authentication | Automation | UI | Sign-in with incorrect password | Valid email submitted, password page visible | Error message visible: password incorrect |
| TC-AUT-006 | Authentication | Automation | UI | Sign-in successfully | Valid email and password | Redirect to landing; go to chat button visible |
| TC-AUT-007 | Authentication | Automation | UI | Sign-up with invalid email format | Page at /sign-up, Clerk ready | Email input retains value; no navigation |
| TC-AUT-008 | Authentication | Automation | UI | Sign-up with password less than 8 chars | Page at /sign-up | Password error visible |
| TC-AUT-009 | Authentication | Automation | UI | Sign-up without accepting terms | Form filled, checkbox unchecked | Checkbox remains unchecked; no submit |
| TC-AUT-010 | Authentication | Automation | UI | Sign-up with email already in use | Form filled with existing email | Form feedback error visible |
| TC-AUT-011 | Authentication | Automation | UI | Sign-up with weak or compromised password | Form filled with weak password | Password error visible |
| TC-AUT-012 | Authentication | Automation | UI | Sign-up OTP empty | Sign-up submitted, OTP page visible | OTP error visible |
| TC-AUT-013 | Authentication | Automation | UI | Sign-up OTP incorrect | OTP page visible | OTP error visible |
| TC-AUT-014 | Authentication | Automation | UI | Sign-up successfully | Valid form, correct OTP | Redirect to home |
| TC-AUT-015 | Video Chat | Automation | UI | Idle page renders with start button | Authenticated user, /chat page | Idle container and start button visible |
| TC-AUT-016 | Video Chat | Automation | UI | Two users match and enter in-call | Two authenticated users, both on /chat, both start call | Both see video container, remote video, call timer |
| TC-AUT-017 | Video Chat | Automation | UI | End call returns both to idle | Two users in call | Both see start button; remote video and timer hidden |
| TC-AUT-018 | Video Chat | Automation | UI | Skip call returns both to idle | Two users in call | Both see start button; remote video hidden |
| TC-AUT-019 | Video Chat | Automation | UI | Skip then start new call | Two users, skip, both idle | Both can start again and match |
| TC-AUT-020 | Video Chat | Automation | UI | Mute toggle reflects in UI | Two users in call | Mute button shows destructive variant when muted |
| TC-AUT-021 | Video Chat | Automation | UI | Camera toggle reflects in UI | Two users in call | Camera-off indicator visible when off; button shows destructive |
| TC-AUT-022 | Video Chat | Automation | UI | Reconnect after page reload | Two users in call, user1 reloads | User1 returns to in-call state; video container visible |
| TC-AUT-023 | Video Chat | Automation | UI | Chat: open sidebar, send and receive message | Two users in call | Both see chat sidebar; message appears on both |
| TC-AUT-024 | Video Chat | Automation | UI | Favorite add during call | Two users in call | Add favorite; toast "Added to favorites"; remove button visible |
| TC-AUT-025 | Video Chat | Automation | UI | Favorite remove during call | User has added favorite in call | Remove favorite; toast "Removed from favorites"; add button visible |
| TC-AUT-026 | Video Chat | Automation | UI | Mobile viewport idle layout | Authenticated user, mobile viewport, /chat | Idle container and start button visible |
| TC-AUT-027 | Video Chat | Automation | UI | Mobile viewport in-call layout | Two users in call on mobile | Video container, remote video, timer visible; bounding box valid |
| TC-AUT-028 | Favorites | Automation | UI | Favorites list page loads | Authenticated user with favorites, /connections/favorites | Favorites data table visible |
| TC-AUT-029 | Favorites | Automation | UI | Remove favorite from list | User on favorites page, at least one favorite | Remove succeeds; list updates |
| TC-AUT-030 | User Profile | Automation | UI | Profile page loads | Authenticated user, /user/profile | Profile card, avatar, name fields visible |
| TC-AUT-031 | User Profile | Automation | UI | Progress page shows level and streak | Authenticated user, /user/progress | Progress level card, streak card, exp values visible |
| TC-AUT-032 | Admin | Automation | UI | Admin users list loads | Admin user, /admin/users | Users table or empty state visible |
| TC-AUT-033 | Admin | Automation | UI | Admin interest tags page loads | Admin user, /admin/interest-tags | Interest tags content visible |
| TC-AUT-034 | Admin | Automation | UI | Admin reports page loads | Admin user, /admin/reports | Reports content visible |

---

## Manual Test Cases

| ID | Feature | Test Type | Test Level | Brief Scenario | Preconditions | Expected Outcome |
|----|---------|-----------|------------|----------------|---------------|------------------|
| TC-MAN-001 | WebRTC | Manual | Manual | Verify video quality during call | Two users in call, real camera | Video is clear, no visible artifacts |
| TC-MAN-002 | WebRTC | Manual | Manual | Verify audio quality during call | Two users in call, real microphone | Audio is clear, no echo or distortion |
| TC-MAN-003 | WebRTC | Manual | Manual | Verify latency acceptable | Two users in call | Latency under 500ms perceived |
| TC-MAN-004 | Permissions | Manual | Manual | Camera permission denied | User denies camera | App shows appropriate error; no crash |
| TC-MAN-005 | Permissions | Manual | Manual | Microphone permission denied | User denies microphone | App shows appropriate error; no crash |
| TC-MAN-006 | Permissions | Manual | Manual | Switch camera mid-call | User has multiple cameras | Video switches to new camera |
| TC-MAN-007 | Permissions | Manual | Manual | Switch microphone mid-call | User has multiple mics | Audio switches to new microphone |
| TC-MAN-008 | Floating Video | Manual | Manual | Drag overlay to corner | User in call, overlay visible | Overlay snaps to nearest corner |
| TC-MAN-009 | Floating Video | Manual | Manual | Overlay position on mobile | User in call on mobile | Overlay correctly positioned; does not obscure controls |
| TC-MAN-010 | Connection | Manual | Manual | Connection quality indicator under poor network | Simulated or real poor network | Indicator reflects degraded state |
| TC-MAN-011 | Connection | Manual | Manual | Prolonged disconnect recovery | User disconnects for 30+ seconds | Peer sees end-call; reconnection behavior correct |
| TC-MAN-012 | Authentication | Manual | Manual | 2FA flow | User with 2FA enabled | 2FA prompt appears; sign-in completes |
| TC-MAN-013 | Authentication | Manual | Manual | Session persistence across tabs | User signed in, open new tab | Session persists; no duplicate sign-in |
| TC-MAN-014 | Admin | Manual | Manual | Embedding compare | Admin user, two users with embeddings | Compare modal shows similarity; results sensible |
| TC-MAN-015 | Admin | Manual | Manual | Find similar users | Admin user, user with embedding | Similar users list returned; ordering sensible |
| TC-MAN-016 | Admin | Manual | Manual | Bulk user actions | Admin user, users selected | Bulk action executes; list updates |
| TC-MAN-017 | Admin | Manual | Manual | Interest tags import | Admin user, JSON file | Import succeeds; tags appear in list |
| TC-MAN-018 | Matchmaking | Manual | Manual | Match quality with common interests | Two users with overlapping tags | Matched users share interests; subjective quality good |
| TC-MAN-019 | Compatibility | Manual | Manual | Cross-browser: Chrome, Firefox, Safari | Same flow on each browser | Flow works consistently |
| TC-MAN-020 | Compatibility | Manual | Manual | Mobile device: iOS Safari | Real iOS device | Video chat flow works |
| TC-MAN-021 | Compatibility | Manual | Manual | Mobile device: Android Chrome | Real Android device | Video chat flow works |
| TC-MAN-022 | Settings | Manual | Manual | Password change via Clerk | User on settings/security | Clerk modal opens; password change completes |
| TC-MAN-023 | Settings | Manual | Manual | Active sessions list | User with multiple sessions | Sessions listed; revoke works |
| TC-MAN-024 | Profile | Manual | Manual | Profile edit validation edge cases | User on profile, invalid inputs | Validation messages correct; no invalid save |
| TC-MAN-025 | UX | Manual | Manual | Exploratory: full user journey | New user | Sign-up, profile, first call, favorites, progress; no blockers |
