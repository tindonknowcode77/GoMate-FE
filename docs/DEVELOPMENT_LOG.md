# Development log

## 2026-10-04 - Real activity creation and host CRUD screens

### Summary

- Replaced local activity publishing with API POST/PATCH, UTC+7 date conversion
  and optional cover upload. Shared the four-step form for creation and editing;
  added multi-day end date, optional coordinates, busy/error states.
- Added paginated hosted-activity list and API detail with owner edit/delete and
  explicit delete confirmation. Match selections now open API details.

### Files changed

- `src/services/activityService.ts`, `src/screens/CreateActivityScreen.tsx`,
  `ActivityManagerScreen.tsx`, `MainApp.tsx`, `DiscoverScreen.tsx`
- `tests/activityService.test.cjs`, README and project documentation

### Verification

- Typecheck and lint passed. Service tests: 3/3 passed, including multi-day dates,
  UTC+7 conversion, malformed input, auth headers, CRUD routes and 204 handling.
- Backend suite: 46/46 passed on isolated MongoDB with cloud mocked.
- Physical-device UI and real Cloudinary cover upload not tested.

### Remaining work

- Joined activities and host approval are not implemented. Some home/group/chat
  screens still use demo data. FE session persistence remains separate work.

## 2026-10-04 - Connect Match discovery and filters

### Summary

- Replaced discovery sample filtering with authenticated activity search,
  keyword input, pagination, retry and optional foreground location lookup.
- Connected categories, VND budget and ISO weekday/hour filters; retain search
  and location when returning from filters. Added the Expo location dependency.
- Removed false match success from API discovery; join requests remain future
  work. Hide unavailable host ratings and fabricated extra photos on match cards.

### Files changed

- `src/services/discoveryService.ts`, `src/screens/DiscoverScreen.tsx`,
  `MainApp.tsx`, `MatchScreen.tsx`, `FilterScreen.tsx`
- `src/components/match/MatchPrimitives.tsx`, `tests/discoveryService.test.cjs`
- `app.json`, package/lockfile, documentation

### Verification

- Typecheck and lint passed. FE discovery/profile service tests: 2/2 passed.
- BE suite: 40/40 passed with isolated MongoDB, including geospatial filtering.
- Expo Doctor: 21/21 passed. `git diff --check`: Passed.
- No real-device GPS/UI test or production data changes.

### Remaining work

- Activity creation and join/approval APIs remain separate work. Database without
  published future activities shows an empty list. Other activity screens remain
  prototypes; skip/undo state is not persisted.

## 2026-10-04 - Document Cloudinary avatar storage

### Summary

- Recorded the switch to backend Cloudinary storage; existing ImagePicker and
  base64 API calls already support local image selection and absolute image URLs.

### Files changed

- `docs/DECISIONS.md`, `docs/DEVELOPMENT_LOG.md`

### Verification

- Backend tests: 35/35 passed with a fake Cloudinary provider.
- No FE source changes; no live cloud test because credentials are missing.

### Remaining work

- Configure Cloudinary on BE and test local image upload end to end.

## 2026-10-04 - Connect profile editing and avatar upload

### Summary

- Load and save the signed-in user's name, username, bio, location and interests
  through the profile API. Share the profile form between onboarding and editing.
- Upload selected image data, display the persisted avatar and real profile in
  the profile tab/own preview. Removed fabricated reviews/stats from own profile.
- Show loading, retry, save errors and partial-success feedback when photo upload
  fails after profile fields are saved; prevent repeated save submissions.

### Files changed

- `src/services/profileService.ts`, `src/hooks/useProfile.ts`
- `src/screens/ProfileScreen.tsx`, `EditProfileScreen.tsx`,
  `UserProfileScreen.tsx`, `MainApp.tsx`
- `tests/profileService.test.cjs`, README and profile-related docs

### Verification

- `npm.cmd run typecheck`, `npm.cmd run lint`: Passed.
- `npx.cmd expo-doctor`: 21/21 passed.
- `node --test tests/profileService.test.cjs`: Passed request/response smoke test.
- Backend integration suite: 32/32 passed using isolated MongoDB 8.3.
- `git diff --check`: Passed. Physical-device image selection not tested.

### Remaining work

- Avatar deletion and public member profiles are not part of this API.
- Other activity/community screens still use sample data. Persistent login on
  FE remains separate work; backend support is already documented.

## 2026-10-03 - Connect email authentication to the backend

### Summary

- Connected registration, six-digit email verification, resend, automatic login
  after verification, password login and logout. Added validation, busy states,
  API errors and recovery for unverified accounts and failed automatic login.
- Replaced mock authentication shortcuts with unavailable-feature feedback.
- Added Expo API URL configuration; kept credentials and sessions in memory.

### Files changed

- `src/services/authService.ts`, `src/screens/AuthScreen.tsx`,
  `src/screens/VerifyEmailScreen.tsx`, `App.tsx`
- `.env` (local URL setting), `.env.example`, `README.md`,
  `docs/BACKEND_GAPS.md`, `docs/DECISIONS.md`, `docs/DEVELOPMENT_LOG.md`

### Verification

- `npm.cmd run typecheck`, `npm.cmd run lint`: Passed.
- `npx.cmd expo-doctor`: Passed, 21/21 checks after retry with network access.
- Node/TypeScript service smoke checks with mocked fetch: Passed registration
  payload/password preservation, leading-zero OTP, API errors, session creation,
  failed logout retention, bearer token and session clearing on successful logout.
- `git diff --check`: Passed. Reviewed changed application files.
- Live SMTP and device end-to-end tests not run; require a reachable configured
  backend and an email inbox. No real registration/email was sent during testing.

### Remaining work

- Sessions do not survive app restarts. Google/Apple, password recovery and
  profile persistence remain unconnected. Configure a reachable API URL for the
  target device, restart Expo and verify the full flow against SMTP.

## 2026-10-03 - Resolve mobile migration conflicts and review backend gaps

### Summary

- Resolved stash conflicts using the upstream Expo/TypeScript application.
- Archived tracked/untracked stash snapshots and moved legacy web auth code,
  tests and the previous native starter to `C:\GoMate\backups\fe-stash-20261003`.
  Preserved the original stash and `.env`; no commit or push was made.
- Kept root build compatibility through Expo web export and added mobile
  export/dev scripts. Updated Expo to 57.0.26 as required by Expo Doctor.
- Documented UI/backend gaps, including the five-digit versus six-digit OTP
  mismatch and mock authentication/activity flows.

### Files changed

- `.gitignore`, `package.json`, `package-lock.json`, `README.md`
- Removed conflicted legacy paths from the active tree: `src/App.jsx`,
  `src/App.css`, `src/index.css`, `src/services/http.js`, `vite.config.js`.
  Their contents remain in the backup and stash.
- `docs/BACKEND_GAPS.md`, `docs/README.md`, `docs/DECISIONS.md`,
  `docs/DEVELOPMENT_LOG.md`

### Verification

- `npm ci`: Passed before the Expo patch update; update via `expo install` passed.
- `npm run typecheck`: Passed.
- `npm run lint`: Passed.
- `npm run build:mobile` and `npm run build`: Passed.
- After the patch update, `npx expo-doctor`: Passed all 21 checks;
  `npx expo export --platform all --output-dir dist-native`: Passed Android,
  iOS and web export.
- `git diff --name-only --diff-filter=U`: Empty; no unresolved conflicts.
- Device runtime and backend integration: Not tested; this task resolves the
  merge and reviews source code, without implementing API integration.

### Remaining work

- Connect the new mobile UI to backend APIs; see `BACKEND_GAPS.md`.
- npm reports 23 dependency advisories (7 moderate, 16 high); no unrelated
  forced dependency upgrades were applied.
- Existing staged `.env.example` edits and placeholder deletions were preserved.

This file records completed development work. Keep the newest entry at the top
and follow `templates/development-log-entry.md`.

## 2026-09-29 - Replace the find-companion onboarding visual

### Summary

- Replaced the programmatically composed first onboarding illustration with
  the supplied `timnguoidonghanh.png` artwork.
- Removed the obsolete avatar bubbles, connection lines, and center-logo styles
  from that slide.
- Used contained image sizing so the complete artwork remains visible on narrow
  mobile screens without cropping its outer people and activity icons.

### Files changed

- `src/screens/OnboardingScreen.tsx`
- `src/assets/timnguoidonghanh.png`
- `docs/DEVELOPMENT_LOG.md`

### Verification

- `npm run typecheck`: Passed.
- `npm run lint`: Passed with no warnings.
- `npx expo export --platform android --output-dir .tmp-onboarding-image-export`:
  Passed; the generated verification output was removed afterward.

### Remaining work

- None.

## 2026-09-29 - Refine Match Hub into a compact social-app entry point

### Summary

- Replaced the oversized organic hero and floating activity photos with a
  compact discovery orb, two restrained radar ripples, and small native-driven
  floating bubbles.
- Removed the redundant "Bắt đầu Match" button and made the complete enlarged
  discovery orb the tap target for opening the existing Match screen.
- Consolidated pending and hosted activity actions into one neutral white
  management card with consistent icon, badge, and row treatments.
- Reworked the profile entry into a mini public-profile preview showing the
  user's avatar, verification, rating, and activity count.
- Reduced typography weight, decoration, color variety, vertical gaps, and
  overall screen height while preserving every existing route and action.
- Kept activity imagery exclusive to the full Match discovery screen.

### Files changed

- `src/screens/MatchHubScreen.tsx`
- `src/theme.ts`
- `docs/DEVELOPMENT_LOG.md`

### Verification

- `npm run typecheck`: Passed.
- `npm run lint`: Passed with no warnings.
- `npx expo-doctor`: Passed all 21 checks.
- `npx expo export --platform android --output-dir .tmp-match-hub-refine`:
  Passed; the generated verification output was removed afterward.

### Remaining work

- Replace the displayed request counts and profile summary with API-derived
  values when those services are available.

## 2026-09-29 - Redesign the Match management hub

### Summary

- Kept the existing full-screen Match swipe, gesture, filter, and activity
  detail experience unchanged.
- Replaced the old "Hoạt động của bạn" layout with a compact Match hub built
  around a visual discovery hero, two management shortcuts, and a public
  profile-preview entry.
- Added zero-count handling for pending and hosted-request badges.
- Added an own-profile public preview mode with a viewer-context notice,
  profile statistics, interests, cover-cropped activity photos, a community
  review, and a persistent edit-profile action.
- Reused the current profile model and edit flow instead of introducing a
  duplicate screen or mock backend endpoint.

### Files changed

- `src/screens/MatchHubScreen.tsx`
- `src/screens/MemberProfileScreen.tsx`
- `src/screens/MainApp.tsx`
- `src/data/people.ts`
- `src/theme.ts`
- `docs/DEVELOPMENT_LOG.md`
- `docs/DECISIONS.md`

### Verification

- `npm run typecheck`: Passed.
- `npm run lint`: Passed with no warnings.
- `npx expo-doctor`: Passed all 21 checks.
- `npx expo export --platform android --output-dir .tmp-match-hub-export`:
  Passed; the generated verification output was removed afterward.

### Remaining work

- Replace the hub counters, current-user preview data, gallery, and community
  review mock data when their APIs are available.

## 2026-09-29 - Rebuild Home as an activity-management dashboard

### Summary

- Removed Match promotion, recommendations, nearby discovery, and category
  discovery from Home so new-activity discovery remains exclusive to Match.
- Added an overview state centered on the next activity, plan/group quick
  actions, and conditional actionable items such as join requests, polls, and
  expenses.
- Added a calendar state with a weekly date strip and compact lists for the
  selected day, upcoming activities, and previously joined activities.
- Added an empty state with no recommended activities, a single Match CTA, and
  three short GoMate benefits.
- Extracted reusable Home header, next-activity card, action section, calendar,
  schedule item, and empty-state components.

### Files changed

- `src/components/home/HomeComponents.tsx`
- `src/screens/HomeScreen.tsx`
- `src/screens/MainApp.tsx`
- `src/i18n/LanguageContext.tsx`
- `docs/DEVELOPMENT_LOG.md`
- `docs/DECISIONS.md`

### Verification

- `npm run typecheck`: Passed.
- `npm run lint`: Passed with no warnings.
- `npx expo-doctor`: Passed all 21 checks.
- `npx expo export --platform android --output-dir .tmp-home-export`: Passed;
  the generated verification output was removed afterward.

### Remaining work

- Home currently uses mock schedule/action data. API-derived participation,
  hosting, polls, expenses, countdowns, and empty-state selection remain to be
  connected when those services are available.

## 2026-09-29 - Redesign the complete Match experience

### Summary

- Replaced the dark, full-image Match deck with a light, single-activity flow:
  cover image, connected white summary card, inline scrollable details, and only
  Skip/Interested as primary decisions.
- Rebuilt filtering around distance, category, detailed availability, and cost,
  including the multi-day availability picker and custom time range UI.
- Added reusable Match header/card/actions, filter content, more menu, report,
  safety, undo, availability, and category-preference sheets.
- Added one-use undo behavior, session-only hiding, GoMate-specific reporting
  and safety content, and UI states for loading, no results, unavailable
  activities, location permission, and network errors.
- Restored horizontal card gestures: swipe left skips and swipe right sends the
  join request, while vertical gestures continue scrolling inline details.
- Moved Undo and the report/more menu into the image's upper-left controls and
  fixed activity thumbnails to fill four equal-width cover slots.
- Added centralized Match colors and Vietnamese/English copy for the new flow.

### Files changed

- `src/components/match/MatchPrimitives.tsx`
- `src/components/match/MatchSheets.tsx`
- `src/screens/MatchScreen.tsx`
- `src/screens/FilterScreen.tsx`
- `src/screens/MainApp.tsx`
- `src/i18n/LanguageContext.tsx`
- `src/theme.ts`
- `docs/DEVELOPMENT_LOG.md`
- `docs/DECISIONS.md`

### Verification

- `npm run typecheck`: Passed.
- `npm run lint`: Passed with no warnings.
- `npx expo-doctor`: Passed all 21 checks.
- `npx expo export --platform android --output-dir .tmp-match-export`: Passed;
  the generated verification output was removed afterward.
- Follow-up Android export to `.tmp-match-swipe-export`: Passed; generated
  output was removed afterward.

### Remaining work

- Hide/category preferences, reports, location permission, and error retries are
  local UI behavior until their backend and platform services are connected.

## 2026-09-29 - Build the GoMate settings and notification suite

### Summary

- Rebuilt Settings in the supplied minimal mobile style and adapted all labels,
  quantities, and examples to GoMate.
- Added navigable Account, Privacy & Safety, Notification Preferences,
  Appearance, Language, Change Password, GoMate Plus, Help Center, Blocked
  Accounts, and About screens.
- Restyled the main notification inbox with GoMate-specific join requests,
  messages, host updates, reminders, read state, and chronological sections.
- Added Vietnamese/English translations for the new settings experience.

### Files changed

- `src/screens/SettingsScreen.tsx`
- `src/screens/NotificationsScreen.tsx`
- `src/i18n/LanguageContext.tsx`
- `docs/DEVELOPMENT_LOG.md`
- `docs/DECISIONS.md`

### Verification

- `npm run typecheck`: Passed.
- `npm run lint`: Passed with no warnings.
- `npx expo-doctor`: Passed all 21 checks.
- `npx expo export --platform android --output-dir .tmp-settings-export`:
  Passed; the generated verification output was removed afterward.

### Remaining work

- Settings controls currently update local UI state only; persistence,
  account-security actions, billing, search, and external legal links require
  their corresponding backend or platform integrations.

## 2026-09-29 - Rebuild the authentication screens from the reference

### Summary

- Rebuilt the authentication journey to match the supplied mobile reference:
  Log In, Sign Up, Verify Email, Forgot Password, Reset Password, and Password
  Reset Success.
- Added the reference-style minimal header, pill actions, social sign-in rows,
  five-cell verification code input, password requirements, and success state.
- Kept the existing Get Started screen as the entry point and added complete
  Vietnamese/English copy for the new states.

### Files changed

- `src/screens/AuthScreen.tsx`
- `src/screens/VerifyEmailScreen.tsx`
- `src/i18n/LanguageContext.tsx`
- `docs/DEVELOPMENT_LOG.md`
- `docs/DECISIONS.md`

### Verification

- `npm run typecheck`: Passed.
- `npm run lint`: Passed with no warnings.
- `npx expo-doctor`: Passed all 21 checks.
- `npx expo export --platform android --output-dir .tmp-auth-export`: Passed;
  the generated verification output was removed afterward.

### Remaining work

- Visual browser capture was unavailable because no in-app browser session was
  exposed in the current environment. Authentication and password recovery are
  still UI-only until the backend endpoints are connected.

## 2026-09-29 - Complete the Figma onboarding sequence

### Summary

- Added the full relevant onboarding path: app-icon Splash, Find your mate,
  Share your world, Build your community, Get Started/Auth, Create Profile,
  Interests, Notifications, Location, and You are all set.
- Replaced the temporary code-drawn brand mark with the real `logo-app.png`,
  `logo-nobackground.png`, and `logofont.png` assets throughout onboarding,
  authentication, and the app header.
- Reused `onboarding-landscape.png` for the Share your world illustration and
  kept the intro/permission layouts aligned with the supplied Figma section.
- Kept Suggested Communities and Suggested People out of the flow because
  those social-network features are outside GoMate's product scope.
- Added Vietnamese/English onboarding copy and mock permission transitions with
  explicit TODOs for future native permission-service integration.

### Files changed

- `App.tsx`
- `src/screens/OnboardingScreen.tsx`
- `src/screens/OnboardingPermissionsScreen.tsx`
- `src/components/BrandLogo.tsx`
- `src/i18n/LanguageContext.tsx`
- `docs/DECISIONS.md`

### Verification

- `npm.cmd run typecheck`: Passed.
- `npm.cmd run lint`: Passed.
- `npx.cmd expo-doctor`: Passed all 21 checks.
- `npx.cmd expo export --platform android --output-dir dist`: Passed.
- Mobile-size browser renders reviewed for Splash, all three intro pages,
  Get Started, Notifications, Location, and You are all set.

### Remaining work

- Connect the permission CTAs to native notification and location services once
  those integrations are introduced.

## 2026-09-29 - Replace the legacy UI with the Figma visual language

### Summary

- Rebuilt the entry experience around the Figma `05 · Get Started` and
  `06 · Create Profile` patterns instead of restyling the previous auth cards.
- Replaced the primary Home and Match layouts with a flat, image-led hierarchy,
  one full-screen activity card, focused actions, and Figma-like spacing,
  typography, controls, headers, and bottom navigation.
- Kept the GoMate activity lifecycle and existing state callbacks while
  rebuilding Create as a staged flow and retaining dedicated detail, group,
  activity, summary, rating, messages, notifications, and profile screens.
- Centralized brand and semantic colors in `src/theme.ts`, removed the unused
  legacy onboarding header, and removed the old blue gradient from Filter.
- Added Vietnamese/English strings for the new Figma-derived entry and Home UI.

### Files changed

- `src/theme.ts`, `src/i18n/LanguageContext.tsx`
- `src/components/BrandLogo.tsx`, `src/components/FormField.tsx`
- `src/components/GradientButton.tsx`, `src/components/AppHeader.tsx`
- `src/components/BottomNav.tsx`, `src/components/ActivityCard.tsx`
- `src/screens/AuthScreen.tsx`, `src/screens/ProfileScreen.tsx`
- `src/screens/HomeScreen.tsx`, `src/screens/MatchScreen.tsx`
- `src/screens/FilterScreen.tsx`, `src/screens/CreateActivityScreen.tsx`
- Supporting activity, member, messaging, notification, and profile screens

### Verification

- `npm.cmd run typecheck`: Passed.
- `npm.cmd run lint`: Passed.
- `npx.cmd expo-doctor`: Passed all 21 checks.
- `npx.cmd expo export --platform android --output-dir dist`: Passed.
- Mobile-size browser renders reviewed for Get Started, Login, Home, Match,
  Filter, Create Activity, and Profile.

### Remaining work

- Re-run a direct Figma node inspection if the Starter-plan MCP quota resets;
  this pass used the node context already retrieved plus the supplied reference
  screenshot after the quota was exhausted.
- Replace mock service/state transitions with backend contracts when available.

## 2026-09-29 - Refactor GoMate around the activity lifecycle

### Summary

- Reframed the existing prototype around Activity → Match → Join Request →
  Group → In Progress → Summary → Rating instead of social-network concepts.
- Added centralized violet/match/success design tokens and migrated primary
  buttons, navigation, Match actions, and core surfaces away from the old blue
  gradient treatment.
- Added email verification, activity detail, four-step activity creation,
  group Chat/Plan/Expenses/Members, activity lifecycle, rating, and settings.
- Expanded Home, profile, notifications, applicant trust metrics, and activity
  fixture data while preserving the existing Expo architecture and API boundary.

### Files changed

- `App.tsx`, `src/theme.ts`, `src/screens/MainApp.tsx`
- `src/screens/VerifyEmailScreen.tsx`, `src/screens/ActivityDetailScreen.tsx`
- `src/screens/GroupScreen.tsx`, `src/screens/ActivityProgressScreen.tsx`
- `src/screens/ActivitySummaryScreen.tsx`, `src/screens/RatingScreen.tsx`
- `src/screens/SettingsScreen.tsx`, `src/screens/CreateActivityScreen.tsx`
- Core Home, Match, messaging, profile, host-management screens and components
- `src/data/activities.ts`, `src/data/people.ts`
- `src/services/activityService.ts`, `README.md`, `docs/DECISIONS.md`

### Verification

- `npm.cmd run typecheck`: Passed.
- `npm.cmd run lint`: Passed.
- `npx.cmd expo-doctor`: Passed all 21 checks.
- `npx.cmd expo export --platform android --output-dir dist`: Passed.
- Expo web dev bundle: Started successfully with no application runtime error.
- Visual browser QA was not available because no in-app browser session was
  exposed in the environment.

### Remaining work

- Replace the mock activity service and local route/state transitions with real
  backend contracts when they become available.
- Persist authentication, group data, expenses, lifecycle updates, and ratings.

## 2026-09-28 - Add Vietnamese and English language switching

### Summary

- Added an app-level Vietnamese/English language provider and shared localized
  text rendering so one selection updates the complete app flow.
- Added compact VI/EN controls to authentication, profile onboarding, and the
  main Profile tab, and localized form placeholders and sample activity data.
- Kept filter and form state independent from translated display labels so
  switching languages does not reset a user's current work.

### Files changed

- `App.tsx`
- `src/i18n/LanguageContext.tsx`
- `src/components/LanguageSwitcher.tsx`, `src/components/LocalizedText.tsx`
- Shared text components and all screens under `src/components/` and
  `src/screens/`
- `docs/DECISIONS.md`

### Verification

- `npm.cmd run typecheck`: Passed.
- `npm.cmd run lint`: Passed.
- `npx.cmd expo-doctor`: Passed all 21 checks.
- `npx.cmd expo export --platform android --output-dir dist`: Passed.

### Remaining work

- The selected language is kept for the current app session; persistence across
  a full app restart can be added when application settings storage is introduced.

## 2026-09-28 - Make activity discovery edge-to-edge

### Summary

- Removed the rounded activity-card container from full-screen discovery.
- Made the activity image and detail content fill the complete viewport below
  the back/filter header while preserving vertical scrolling and horizontal
  swipe gestures.
- Moved the activity counter and skip/join actions into floating overlays so the
  activity remains the only primary content on screen.

### Files changed

- `src/components/ActivityCard.tsx`
- `src/screens/MatchScreen.tsx`

### Verification

- `npm.cmd run typecheck`: Passed.
- `npm.cmd run lint`: Passed.
- `npx.cmd expo export --platform android --output-dir dist`: Passed.

### Remaining work

- None for the requested UI change.

## 2026-09-28 - Turn Match into an activity management hub

### Summary

- Replaced the Match tab's direct swipe deck with a hub for discovering
  activities, reviewing liked/pending requests, and managing hosted activities.
- Moved activity discovery into a full-screen flow that hides bottom navigation,
  keeps back/filter actions in the upper-left area, supports horizontal
  decisions, and preserves vertical detail scrolling.
- Added pending-request history, hosted-activity member approval/rejection, and
  individual member/host profile screens.
- Made host and participant rows actionable from activity details and preserved
  the correct return path through nested full-screen flows.

### Files changed

- `src/data/people.ts`
- `src/screens/MatchHubScreen.tsx`
- `src/screens/PendingActivitiesScreen.tsx`
- `src/screens/ManageActivitiesScreen.tsx`
- `src/screens/MemberProfileScreen.tsx`
- `src/screens/HostMembersScreen.tsx`
- `src/screens/MatchScreen.tsx`
- `src/screens/MainApp.tsx`
- `README.md`, `docs/DECISIONS.md`

### Verification

- `npm.cmd run typecheck`: Passed.
- `npm.cmd run lint`: Passed.
- `npx.cmd expo-doctor`: Passed all 21 checks.
- `npx.cmd expo export --platform android --output-dir dist`: Passed.

### Remaining work

- Persist join requests, host approvals, activity ownership, and profile data
  through the backend when its APIs are available.

## 2026-09-28 - Complete the main app and expand Match details

### Summary

- Reworked Home into a clean dashboard with no activity feed; all activity
  discovery now happens exclusively in Match.
- Expanded Match cards into vertically scrollable activity detail views while
  preserving horizontal skip/join gestures, replaced the heart action with a
  verification-style check, and added host/member access.
- Rebuilt the filter around activity-specific criteria with an active-filter
  summary, clearer categories, level, group size, budget, availability, and a
  proper no-results state.
- Added Create Activity, Messages, Chat, Profile, Edit Profile, Notifications,
  My Activities, Host & Members, and Join Confirmation screens and connected
  all flows through a five-tab application shell.
- Connected the Create Activity photo action to the device media library with a
  responsive selected-image preview.
- Used only the four activity images supplied in `src/assets/Activity-image/`.

### Files changed

- `src/components/ActivityCard.tsx`, `src/components/AppHeader.tsx`
- `src/components/BottomNav.tsx`, `src/components/ScreenHeader.tsx`
- `src/screens/HomeScreen.tsx`, `src/screens/MatchScreen.tsx`
- `src/screens/FilterScreen.tsx`, `src/screens/MainApp.tsx`
- `src/screens/CreateActivityScreen.tsx`, `src/screens/MessagesScreen.tsx`
- `src/screens/ChatScreen.tsx`, `src/screens/UserProfileScreen.tsx`
- `src/screens/EditProfileScreen.tsx`, `src/screens/NotificationsScreen.tsx`
- `src/screens/MyActivitiesScreen.tsx`, `src/screens/HostMembersScreen.tsx`
- `src/screens/MatchSuccessScreen.tsx`, `README.md`

### Verification

- `npm.cmd run typecheck`: Passed.
- `npm.cmd run lint`: Passed.
- `npx.cmd expo-doctor`: Passed all 21 checks.
- `npx.cmd expo export --platform android --output-dir dist`: Android bundle
  passed and included all four supplied activity images.

### Remaining work

- Replace fixture content and local navigation state with backend APIs and
  persistent authentication, activity, match, and messaging data.

## 2026-09-28 - Build Home, Match, Filter, and production-style auth

### Summary

- Added a polished Home discovery feed with greeting, search, category chips,
  filter access, and responsive activity cards.
- Added a Match experience that renders one activity post at a time with native
  swipe gestures, animated like/skip feedback, action buttons, and a filter
  shortcut.
- Added a full-screen activity filter with distance, age, time, category, and
  budget controls; applied distance/category filters affect Home and Match.
- Redesigned Login/Register to match the main product, routing Login directly to
  Home and new registrations through Complete Profile.
- Added a two-tab Home/Match bottom navigation and integrated the four activity
  images supplied in `src/assets/Activity-image/`.

### Files changed

- `App.tsx`, `README.md`
- `src/data/activities.ts`
- `src/components/ActivityCard.tsx`
- `src/components/AppHeader.tsx`
- `src/components/BottomNav.tsx`
- `src/screens/AuthScreen.tsx`
- `src/screens/HomeScreen.tsx`
- `src/screens/MatchScreen.tsx`
- `src/screens/FilterScreen.tsx`
- `src/screens/MainApp.tsx`
- `src/assets/Activity-image/*`

### Verification

- `npm run typecheck`: Passed.
- `npm run lint`: Passed.
- `npx expo-doctor`: Passed all 21 checks.
- `npx expo export --platform android --output-dir dist`: Android bundle passed
  with all four activity assets.

### Remaining work

- Replace local activity fixtures and filter state with backend data when the
  activity API is available.

## 2026-09-28 - Simplify profile onboarding flow

### Summary

- Removed the standalone Select Interests screen and routed authentication
  directly to Complete Profile.
- Removed the Personal & Trip Photos section, multi-photo gallery, camera flow,
  and unused camera permission.
- Kept avatar selection and interest chips inside Basic Information so both can
  be updated from the profile.
- Updated onboarding progress from three steps to two and removed the unused
  interest screen/card components.

### Files changed

- `App.tsx`
- `src/components/OnboardingHeader.tsx`
- `src/screens/ProfileScreen.tsx`
- `src/screens/InterestsScreen.tsx` (removed)
- `src/components/InterestCard.tsx` (removed)
- `app.json`, `README.md`

### Verification

- `npm run typecheck`: Passed.
- `npm run lint`: Passed.
- `npx expo-doctor`: Passed all checks.
- `npx expo export --platform android --output-dir dist`: Android bundle passed.

### Remaining work

- Persist the basic profile and interest selections when the backend API is
  available.

## 2026-09-28 - Modernize interests and profile onboarding

### Summary

- Replaced image-based interest tiles with a responsive two- or three-column
  icon card grid, gradient selected states, selection count, and a fixed Next
  action.
- Redesigned Complete Profile as two clean cards for basic information and
  personal/trip photos.
- Added quick age controls, area and interest chips, a compact bio, editable
  avatar, multi-image library selection, camera capture, photo removal, and a
  six-photo limit.
- Configured purpose-specific photo/camera permission copy and disabled the
  unused Android microphone permission.
- Removed the unused interest image sprite and added the SDK-compatible
  `expo-image-picker` dependency.

### Files changed

- `src/components/InterestCard.tsx`
- `src/screens/InterestsScreen.tsx`
- `src/screens/ProfileScreen.tsx`
- `src/assets/interests-sprite.png` (removed)
- `app.json`, `package.json`, `package-lock.json`

### Verification

- `npm run typecheck`: Passed.
- `npm run lint`: Passed.
- `npx expo-doctor`: Passed all 21 checks.
- `npx expo export --platform android --output-dir dist`: Android bundle passed.

### Remaining work

- Persist profile fields and selected media to the backend when its API is
  available.

## 2026-09-28 - Build GoMate mobile onboarding flow

### Summary

- Migrated the root project from the Vite starter to Expo SDK 57 with strict
  TypeScript.
- Built responsive Login/Register, Select Interests, and Complete Profile
  screens with reusable inputs, gradients, buttons, branding, and progress UI.
- Added tab switching, password visibility, editable fields, multi-select
  interests, an image-picker placeholder, and navigation between screens.
- Generated and integrated a landscape illustration, nine-interest sprite, and
  sample profile portrait matching the visual references.
- Removed unused Vite scaffold files so Expo no longer misidentifies the old
  `src/app` directory as an Expo Router root.

### Files changed

- `App.tsx`, `index.ts`, `app.json`, `tsconfig.json`, `eslint.config.js`
- `package.json`, `package-lock.json`, `.gitignore`, `README.md`, `AGENTS.md`
- `src/components/*.tsx`, `src/screens/*.tsx`, `src/theme.ts`
- `src/assets/onboarding-landscape.png`
- `src/assets/interests-sprite.png`
- `src/assets/profile-avatar.png`
- Removed the unused Vite entry points, styles, layouts, services, and public
  starter assets.

### Verification

- `npm run typecheck`: Passed.
- `npm run lint`: Passed.
- `npx expo-doctor`: Passed all 21 checks.
- `npx expo export --platform android --output-dir dist`: Android bundle passed.
- `npm audit --omit=dev`: Reported 10 moderate transitive issues in the Expo
  toolchain; npm's suggested fix is an incompatible Expo downgrade.

### Remaining work

- Replace the image-picker placeholder with a real media-library flow when
  profile persistence is implemented.
- Recheck the Expo toolchain audit advisories when a compatible SDK update is
  available; no forced dependency downgrade was applied.

## 2026-09-28 - Add project documentation workflow

### Summary

- Added repository-wide agent instructions requiring documentation after every
  coding task.
- Added a shared development log, decision log, and reusable entry template.
- Extended the mobile-app instructions so its tasks follow the same log.

### Files changed

- `AGENTS.md`
- `GoMate-FE/AGENTS.md`
- `docs/README.md`
- `docs/DEVELOPMENT_LOG.md`
- `docs/DECISIONS.md`
- `docs/templates/development-log-entry.md`

### Verification

- Reviewed the documentation structure and relative paths.
- No application tests were run because this task changes documentation only.

### Remaining work

- None.

