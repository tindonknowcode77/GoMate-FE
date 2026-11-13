# Development log

## 2026-11-13 - Merge admin UI branch into current business workflows

### Summary

- Merge `origin/fix_ui_admin_tan` (`66b2738`) into `quan_business` after syncing the latest payment changes.
- Resolve both conflicts by retaining the new admin finance presentation, deposit-change approval tab and actions, dispute refund actions, and bank picker styles. Include deposit-change counts in the new tab badges.

### Files changed

- Incoming branch: admin overview, review and management components, portal styles, translations, and `tests/admin-crud.web.cjs`.
- Conflict resolutions: `src/gomate-portal/AdminFinance.jsx` and `src/gomate-portal/finance.css`.
- `docs/DEVELOPMENT_LOG.md`.

### Verification

- `npm run typecheck`: Passed.
- `npm run lint`: Passed with five existing warnings.
- `npm run build`: Passed.
- `npx expo-doctor`: 20/21 checks passed; five existing Expo package patch-version mismatches remain.
- `node tests/admin-crud.web.cjs`: Failed at the new role filter; the current backend rejects the incoming branch's `role` query parameter with `Invalid request fields`.
- `node tests/finance.web.cjs`: Failed waiting for the old transfer-report message in the mobile wallet, before reaching admin finance checks.
- Reviewed resolved finance differences against the incoming branch to confirm the current deposit-change workflow and bank styles remain present.

### Remaining work

- Align the incoming role filter with backend support and update the finance browser test for the current payment flow. Browser workflows have not passed; no backend or test behavior was changed as part of this merge.
- Existing lint warnings and Expo patch-version mismatches remain.

## 2026-11-12 - Clarify the admin finance dashboard

### Summary

- Reorganize finance totals into differentiated metric tiles and a single reconciliation summary that shows the checked balance equation and status.
- Add count badges to horizontally scrollable workflow tabs, clearer section headers, structured account/amount details, compact transaction states and responsive table-to-row cards for mobile.
- Keep existing API calls, review actions, banking confirmations and pagination intact; avoid a repeated finance page title in the content panel.

### Files changed

- `src/gomate-portal/AdminFinance.jsx`, `finance.css`, `GoMatePortal.jsx`.

### Verification

- `npm run typecheck`: Passed.
- `node tests/finance.web.cjs`: Passed; incoming reconciliation, refund approval/completion, activity verification, payout processing, merchant wallet and mobile overflow checks completed. Inspected the generated desktop finance screenshot.
- `npm run lint`: Failed on unresolved `exceljs` in unchanged `src/gomate-portal/formExcel.js`; five unrelated warnings remain.
- `npx expo-doctor`: 20/21 checks passed; five existing Expo patch-version mismatches remain.
- `git diff --check`: Passed.

### Remaining work

- None for this finance UI. Existing lint resolver and Expo patch mismatches remain outside this change.

## 2026-11-12 - Use icon actions in business and post administration

### Summary

- Replace Chi tiết, Sửa and Xóa text buttons with eye, edit and destructive trash icon buttons in business and post management rows. Retain tooltips, screen-reader labels, pending-post emphasis and existing edit/delete restrictions.
- Use an eye icon for opening business verification details while keeping its document review and approve/reject flow intact.
- Extend the admin browser workflow to assert the three accessible icon actions on business and post rows and the verification-details icon.

### Files changed

- `src/gomate-portal/AdminManagement.jsx`, `AdminBusinessReview.jsx`, `admin-management.css`.
- `tests/admin-crud.web.cjs`.

### Verification

- `npm run typecheck`: Passed.
- `npm run test:admin:web`: Passed, including admin CRUD, icon actions, business-document review and mobile layout.
- Explicit ESLint for changed portal components: Passed with one existing hook warning in `AdminManagement.jsx`.
- `npm run lint`: Failed on unresolved `exceljs` in unchanged `src/gomate-portal/formExcel.js`; five unrelated warnings remain.
- `npx expo-doctor`: 20/21 checks passed; five existing Expo patch-version mismatches remain.
- `git diff --check`: Passed.

### Remaining work

- None for these actions. The full-lint resolver error and Expo patch mismatches remain outside this change.

## 2026-11-12 - Filter accounts by role and compact row actions

### Summary

- Add a server-backed role filter to the account list so it searches the full paginated set using effective admin, business, business-staff, staff and user roles.
- Replace account-row text actions with compact eye, edit and delete icon buttons, including contextual tooltips, accessible names and destructive styling. Preserve the existing action handlers and disable deleting self/admin accounts.

### Files changed

- FE: `src/gomate-portal/AdminManagement.jsx`, `GoMatePortal.jsx`, `admin-management.css`, `tests/admin-crud.web.cjs`.
- BE: `src/modules/portal/admin-validation.js`, `admin.js`, `tests/admin-validation.test.js`, `admin-crud.test.js`, `docs/ADMIN_CRUD.md`.
- `GoMate-BE/docs/DEVELOPMENT_LOG.md`.

### Verification

- `npm run typecheck`: Passed.
- `npm run test:admin:web`: Passed, including role filtering, icon action accessibility, account CRUD and mobile layout.
- `node --test tests/admin-validation.test.js tests/admin-crud.test.js`: Passed, 5/5 tests.
- `npm run lint`: Still fails on unresolved `exceljs` in unchanged `src/gomate-portal/formExcel.js`; five unrelated warnings remain.
- `npx expo-doctor`: 20/21 checks passed; five existing Expo patch-version mismatches remain.
- `git diff --check`: Passed. Explicit ESLint on the changed screen reports one existing hook warning; applying it to the CommonJS test also exposes pre-existing `__dirname` and `Buffer` globals warnings.

### Remaining work

- None for the account filter/actions. Existing full-lint dependency resolution and Expo patch mismatches remain.

## 2026-11-12 - Rebuild the admin overview dashboard

### Summary

- Replace the full business review table and complete post cards on the admin overview with a concise dashboard: three differentiated metric links and two short pending queues for business applications and posts.
- Show up to four recent items per queue, add direct navigation to full review pages, and adapt the metric and queue layout for narrow screens.

### Files changed

- `src/gomate-portal/ConnectedPortal.jsx`, `AdminOverview.jsx`, `connected-portal.css`, `src/i18n/portalTranslations.ts`.

### Verification

- `npm run typecheck`: Passed.
- Explicit ESLint for changed JSX/TS files: Passed with one existing hook warning in `AdminManagement.jsx`.
- `npm run lint`: Failed on unresolved `exceljs` in unchanged `src/gomate-portal/formExcel.js`; five unrelated warnings remain.
- `npx expo-doctor`: 20/21 checks passed; Expo and four Expo packages are each one patch behind the SDK's expected version.
- Expo Web bundle on port `8082`: HTTP 200. `git diff --check`: Passed. UI workflow tests were not run for this layout change.

### Remaining work

- None for the overview. The full lint resolver error and Expo patch mismatches remain outside this change.

## 2026-11-12 - Simplify the admin post review queue

### Summary

- Remove the duplicate card list from the admin's post review route while retaining the overview cards for the dashboard and business workspace.
- Prioritize pending posts in the single admin list, show a compact business/content/event/group/offer summary, emphasize opening pending reviews, and collapse subgroup details in the review dialog. Keep search, status filters, editing, deletion and approval actions available.

### Files changed

- `src/gomate-portal/ConnectedPortal.jsx`, `AdminManagement.jsx`, `connected-portal.css`.

### Verification

- `npm run typecheck`: Passed.
- Explicit ESLint for changed JSX/TS files: Passed with one existing hook warning in `AdminManagement.jsx`.
- `npm run lint`: Failed on unresolved `exceljs` in unchanged `src/gomate-portal/formExcel.js`; five unrelated warnings remain.
- `npx expo-doctor`: 20/21 checks passed; Expo and four Expo packages are each one patch behind the SDK's expected version.
- `GET http://localhost:8082/portal`: HTTP 200. `git diff --check`: Passed. UI workflow tests were not run for this presentation change.

### Remaining work

- None for the review queue. The full lint resolver error and Expo patch mismatches remain outside this change.

## 2026-11-12 - Refine post moderation cards

### Summary

- Rework the connected portal post review UI into a clear main post card with separated subgroup rows, compact icon metadata, calmer content styling and status pills. Keep review, resubmission, withdrawal, editing and lifecycle callbacks intact.
- Add responsive action alignment and emerald/amber/red status treatments. The portal is not configured for Tailwind, so use its existing scoped CSS instead of introducing an unconfigured styling dependency.

### Files changed

- `src/gomate-portal/ConnectedPortal.jsx`, `PostReviewPanel.jsx`, `GoMatePortal.jsx`, `connected-portal.css`.
- `src/i18n/portalTranslations.ts`, `src/gomate-portal/usePortalText.ts`.

### Verification

- `npm run typecheck`: Passed.
- Explicit ESLint for changed JSX/TS files: Passed.
- `npm run lint`: Failed on unresolved `exceljs` in unchanged `src/gomate-portal/formExcel.js`; five unrelated warnings remain.
- `npx expo-doctor`: 20/21 checks passed; Expo and four Expo packages are each one patch behind the SDK's expected version.
- Expo Web started on port `8082` because `8081` was occupied; `GET /portal` returned HTTP 200.
- `git diff --check`: Passed. UI workflow tests were not run for this presentation-only change.

### Remaining work

- None for the post review UI. The full lint resolver error and Expo patch mismatches remain outside this change.

## 2026-11-09 - Replace the cramped business management link in app groups

### Summary

- Replace the underlined management link sharing a narrow banner row with a full-width `Quản lý doanh nghiệp` button, grid icon, forward arrow and pressed feedback.
- Present the verified-business heading, offer and deposit as separate readable rows in a bordered card. Keep member payment/paid controls separate from manager navigation and retain existing role checks and `/portal` navigation.
- Report native browser-opening errors and avoid rendering a raw numeric zero for absent deposits. Preserve the user's existing payment-loading cleanup.

### Files changed

- `src/screens/GroupScreen.tsx`.
- `tests/business-workflow.web.cjs`: Update the management-button copy expected by the existing workflow.

### Verification

- `npm run typecheck`, `npm run lint`, `npm run build`: Passed; lint retains five existing unrelated warnings.
- Ad hoc Chromium rendering against isolated Express/MongoDB: manager banner at 320px and 390px, `/portal` navigation, and member-only payment controls passed. Inspected screenshots; no squeezed text column or long underlined management link.
- `npx expo-doctor`: 20/21 checks passed; existing five Expo patch-version mismatches remain.
- `git diff --check`: Passed. Full business-registration workflow was not repeated for this focused presentation change.

### Remaining work

- No remaining work for this UI change. Native external-browser behavior was typechecked but not run on a physical device.

## 2026-11-09 - Refine group withdrawal and deletion controls

### Summary

- Replace small lifecycle text links with outlined action buttons. Group Management separates withdrawal and deletion into clear rows with archive/trash icons, concise effects, amber withdrawal and red deletion styling.
- Redesign confirmations with the selected group/post name, notification and deposit effects, neutral cancellation, and an action-colored confirmation. Add Escape dismissal, focus containment/restore, duplicate-submit locking and visible failures without closing the dialog.
- Keep existing lifecycle APIs and confirmation labels; adapt shared post actions to the same button/dialog styling. Mobile action rows and confirmation footers fit narrow screens.
- Reserve scroll space below group controls so the floating language selector cannot trap the final action beneath it on mobile.

### Files changed

- `src/gomate-portal/PostLifecycleActions.jsx`, `post-lifecycle.css`, `GroupManagement.jsx`, `GoMatePortal.jsx`.
- `tests/business-campaign-controls.web.cjs` captures desktop/mobile controls and the mobile deletion dialog, and verifies Escape does not mutate the group.

### Verification

- `npm run typecheck`, `npm run lint`, explicit JSX ESLint, and `npm run build`: Passed. Standard lint retains five existing unrelated warnings.
- `node tests/business-campaign-controls.web.cjs`: Passed for withdrawal, failed-request retention, cancellation, deletion, chat and responsive layout.
- `npx expo-doctor`: 20/21 checks passed; the existing five Expo patch-version mismatches remain. No dependency changes were needed.
- `git diff --check`: Passed.

### Remaining work

- None for these controls; existing Expo patch-version warnings remain.

## 2026-11-09 - Redesign the business group management workspace

### Summary

- Replace the long stacked campaign screen with a searchable group browser and a focused details workspace. Use explicit lifecycle colors, contextual metrics, and a single next-step action; open on a practical overview instead of loading chat immediately.
- Organize requests and attendance under Members, isolate chat/itinerary/deposits/notices, and keep automatic approval, deposit settings, personnel and withdrawal/deletion under Management. Add direct personnel and wallet navigation.
- Collapse group selection into an accessible mobile switcher. Support keyboard tab navigation and confirmation dialogs for start/finish. Reset forms when switching groups, hide stale details on empty filters, and disable itinerary mutations for closed groups.
- Preserve the API-backed operations and earlier finance changes. No new runtime dependency or backend change was needed.

### Files changed

- `src/gomate-portal/ActiveCampaignDashboard.jsx`, `BusinessGroupBrowser.jsx`, `GroupOverview.jsx`, `GroupMembers.jsx`, `GroupManagement.jsx`, `business-groups.css`, `ConnectedPortal.jsx`.
- `tests/business-groups.web.cjs`, `tests/business-campaign-controls.web.cjs`, `tests/portal-reliability.web.cjs`, `package.json`, `docs/DECISIONS.md`.

### Verification

- `npm run typecheck`, `npm run lint`, explicit ESLint for all five group JSX modules, `npm run build`: Passed. Standard lint retains five existing unrelated warnings; group-module lint is clean.
- `node tests/business-groups.web.cjs`: Passed against isolated Express/MongoDB and Chromium. Covers selection/search, requests, attendance, schedule confirmation, start/cancel/Escape/finish, cross-group draft isolation, closed-group controls and the mobile switcher.
- `node tests/portal-reliability.web.cjs`: Passed, including filtered empty states, keyboard tabs, management-only settings, deposit/auto-approval changes, responsive layout and offline recovery.
- `node tests/business-campaign-controls.web.cjs`: Passed on the updated navigation, including live owner/staff chat, attachments, withdrawal, admin deletion and wallet refresh.
- Inspected desktop and mobile screenshots from the browser runs. No horizontal page overflow at 390px. `git diff --check`: Passed.
- `npx expo-doctor`: 20/21 checks passed; the same five existing Expo packages remain one patch behind the SDK recommendations. Dependencies were not upgraded for this UI change.

### Remaining work

- None for the redesign. Existing Expo patch-version warnings remain; the preceding payment task's banking integration limitations still apply.

## 2026-11-09 - Verified deposits, member refunds and admin-controlled settlement

### Summary

- Add the admin finance/revenue workspace for incoming reconciliation, activity evidence, refunds, merchant payouts, disputes and audit history. Show held funds separately from realized fee revenue and paid-out money.
- Replace the member wallet with saved refund bank details, server-derived balances/history, cancellation/refund requests, independent participation confirmation and disputes. Replace merchant instant withdrawal with per-activity admin-reviewed payout requests and immutable recipient snapshots.
- Make the QR confirmation button report-only; accept success only after verified incoming money. Use sequential polling on weak networks and retain a stable payout request key across a lost response.
- Expose bank-transfer locking before manual execution, bank-proof completion, and explicit recovery only after the bank confirms no transfer occurred. Defaults: 24-hour free cancellation, at least 48-hour settlement hold, existing 10% fee recognized on actual payout completion.

### Files changed

- `src/gomate-portal/AdminFinance.jsx`, `finance.css`, `ConnectedPortal.jsx`, `BusinessWallet.jsx`.
- `src/screens/UserWalletScreen.tsx`, `src/components/VietQrPaymentModal.tsx`, `src/services/paymentService.ts`, `tests/finance.web.cjs`, `docs/DECISIONS.md`.
- Backend implementation and operational guide: `../GoMate-BE/docs/PAYMENT_FLOW.md`.

### Verification

- `npm run typecheck`, `npm run lint`, explicit ESLint for the two new/replaced finance JSX modules, and `npm run build`: Passed. Normal lint retains five unrelated existing warnings; explicit finance JSX lint is clean.
- `node tests/finance.web.cjs`: Passed on isolated MongoDB and Chromium, including report-only QR, mobile bank/refund UI, admin reconciliation/refund/settlement/payout, merchant bank editing, lost-response payout retry and mobile viewport. No real bank transfer occurred.
- `node tests/portal-reliability.web.cjs`, `node tests/business-campaign-controls.web.cjs`: Passed.
- BE full regression: 164 tests passed; adverse finance suite covers 21 scenarios plus its parent test.
- `npx expo-doctor`: 20/21 checks passed; dependency alignment reports five already installed Expo packages one patch behind the currently recommended versions. No dependency upgrade was included in this payment change.

### Remaining work

- Bank transfers are executed manually outside GoMate, then recorded by admin with their bank reference. Automatic incoming needs a configured trusted bank adapter/secret; no automatic payout provider or account-ownership verification is configured. See the backend operational guide for rollout and legacy reconciliation.

## 2026-11-09 - Move group settings into the management tab

### Summary

- Show automatic member approval and deposit settings only inside the group's `Quản lý` tab, alongside manager information.

### Files changed

- `src/gomate-portal/ActiveCampaignDashboard.jsx`, `tests/portal-reliability.web.cjs`, `docs/DEVELOPMENT_LOG.md`.

### Verification

- Typecheck, lint, explicit JSX ESLint and web build: Passed; five existing lint warnings remain.
- Portal reliability browser test: Passed, including settings hidden on the default group view, visible in management, and working approval/deposit updates.
- Expo Doctor: 20/21 checks passed; same five existing dependency patch mismatches.
- `git diff --check`: Passed.

### Remaining work

- Existing Expo patch mismatches and lint warnings remain.

## 2026-11-09 - Admin status colors, reliable refresh and editable business posts

### Summary

- Color admin statuses and effective account roles across users, applications, posts, reports and support. Fix the create-post button's inherited muted text and rename it to `Tạo bài đăng`.
- Open the workspace after profile verification, apply resources independently, retain successful results, bound requests, cancel obsolete loads, retry on network reconnection and refresh the currently displayed admin table or wallet from the header. Remove the redundant eager admin user-list request and reset private state when the session changes.
- Add owner-only automatic member approval and deposit settings for upcoming groups, plus an editable basic-post form that preserves approval. Keep paid deposit receipts unchanged; invalidate obsolete unpaid QR orders. Approved members open their group directly in the app and receive an accurate matching result toast.
- Remove the requested business/group/wallet explanations and redundant app lifecycle/matching guidance while retaining validation and operation errors.

### Files changed

- Portal loading/API, shared status styling, admin management, wallet, group dashboard, post composer and new `BusinessPostEditor.jsx` / `portalStatus.js`.
- `src/screens/MainApp.tsx`, `src/screens/MatchScreen.tsx`, `src/components/ActivityLifecyclePanel.tsx`, `src/services/api.ts`.
- `tests/portal-reliability.web.cjs`, `package.json`, decision/development logs; paired backend implementation and regression tests.

### Verification

- Typecheck, repository lint and explicit ESLint on changed JSX: Passed; existing five repository lint warnings and one AdminManagement cleanup warning remain.
- Same-origin Expo web build: Passed.
- Admin CRUD browser regression and business campaign controls browser regression: Passed.
- Portal reliability browser test: Passed with delayed notifications, header refresh, all five admin status pages, effective roles, create CTA contrast, auto-approval, deposit edits, approved-post edits, interrupted connectivity recovery, an eight-second hung-profile timeout and mobile layout.
- Backend suite: 141 existing tests passed; the new business settings regression passed separately, including concurrent capacity, stale writes, ownership, paid-receipt preservation, cancelled QR rejection and interrupted/out-of-order content-sync recovery.
- Six frontend activity/auth/native-session regressions: Passed.
- Expo Doctor: 20/21 checks passed; five existing dependency patch mismatches remain.

### Remaining work

- Initial assets/profile access still require connectivity; full offline operation is not implemented. Physical native devices were not exercised. Existing Expo patch mismatches and lint warnings remain. Automatic approval applies to new/repeated join requests, not the existing pending queue; deposits can change before group start.

## 2026-11-09 - Compact Excel controls across business forms

### Summary

- Replace the explanatory Excel card with a compact shared toolbar for verification, locations and promotional posts: template download, import and a collapsed demo-file menu.
- Remove repeated instructions and shorten success feedback to the imported filename. Use smaller controls, scoped styles and wrapping on narrow screens.

### Files changed

- `src/gomate-portal/FormExcelTools.jsx`, `src/gomate-portal/form-excel.css`.
- `docs/DEVELOPMENT_LOG.md`.

### Verification

- Typecheck, repository lint and explicit JSX ESLint: Passed; repository lint retains five existing warnings.
- Same-origin web build: Passed.
- `npm.cmd run test:excel:web`: Passed all three import/submit flows, template download, validation, persistence and mobile controls.
- Expo Doctor: 20/21 checks passed; the same five existing Expo dependency patch mismatches remain.
- `git diff --check`: Passed.

### Remaining work

- Existing Expo patch mismatches and lint warnings remain.

## 2026-11-09 - Excel autofill and demo workbooks for business forms

### Summary

- Add template downloads and Excel import to business verification, location editing/creation and multi-group post creation. Imports fill editable drafts and never submit automatically.
- Validate the complete workbook before changing form state; reject wrong templates, missing/repeated keys, formulas, invalid coordinates, dates, categories, capacities and deposits. Preserve locked verification identity fields.
- Extract embedded license/supplemental images into the existing document previews and submit flow, and let imported files satisfy required attachment inputs. Keep separate PDF uploads supported.
- Supply six demo XLSX files with fictional businesses, marked document images, HCMC locations and future multi-group workshops, plus regeneration and browser-test commands.
- Clear verification industry-load errors in the successful async callback to satisfy the explicit JSX lint check.

### Files changed

- `src/gomate-portal/formExcel.js`, `FormExcelTools.jsx`, `BusinessVerificationForm.jsx`, `LocationLibrary.jsx`, `MultiGroupPostComposer.jsx`.
- `public/demo-excel/` (six workbooks and usage guide); `scripts/generate-demo-excel.cjs`; `tests/form-excel.web.cjs`.
- `package.json`, `package-lock.json`, `docs/DECISIONS.md`, `docs/DEVELOPMENT_LOG.md`.

### Verification

- `npm.cmd run typecheck`: Passed.
- `npm.cmd run lint`: Passed with five existing warnings.
- Explicit ESLint on all five changed portal sources: Passed after the industry-loading callback fix.
- Same-origin `npm.cmd run build`: Passed, including a separate lazy-loaded ExcelJS chunk.
- `npm.cmd run test:excel:web`: Passed against isolated MongoDB, real APIs and Chromium: downloadable template, all six sample files, verification with both images and submit, post groups and submit, location creation and version-preserving edit, wrong-template/formula/invalid-deposit rejection, no auto-submit, persistence and mobile controls.
- `npx.cmd --yes expo-doctor`: 20/21 checks passed; same five existing Expo dependency patch mismatches.

### Remaining work

- Existing Expo patch mismatches and lint warnings remain. XLSX import is for web business forms; native devices were not exercised. Regenerate static post demo files with `npm run demo:excel` before future demos. Real verification requires the business's own documents and the existing admin review.

## 2026-11-09 - Synchronize quan_business with remote FE and BE

### Summary

- Merge the two incoming frontend commits with the 21 local-only commits without rewriting history. Fast-forward the paired backend to a7572ed.
- Resolve BusinessWallet conflicts by combining bank-account/payout state synchronization with contextual refresh success/error notices; retain the specific reconciliation refresh button label.
- Preserve both branches' development history, incoming admin CRUD/validation and user refund/payment history features. Local backup branches retain the pre-sync heads in each repository.

### Files changed

- Incoming admin, wallet, payment service, package script and decision-document changes.
- Conflict resolutions: src/gomate-portal/BusinessWallet.jsx and docs/DEVELOPMENT_LOG.md.

### Verification

- npm.cmd run typecheck: Passed. npm.cmd run lint: Passed with five existing warnings.
- Explicit ESLint on the merged portal sources: Passed with one existing AdminManagement effect-cleanup warning.
- node --test tests/*.test.cjs: All 15 frontend tests passed.
- Same-origin npm.cmd run build: Passed after the final reconciliation label fix.
- node tests/admin-crud.web.cjs: Passed CRUD, validation, persistence, approval, reporting, support and mobile checks.
- node tests/business-campaign-controls.web.cjs: Passed after retaining the specific wallet refresh label; campaign, staff/chat, lifecycle, notices and mobile checks passed.
- GoMate-BE npm.cmd test: All 141 tests passed, including incoming admin and payment coverage.
- npx.cmd --yes expo-doctor: 20/21 checks passed; existing patch mismatches for expo, expo-constants, expo-image-picker, expo-location and expo-sharing.
- git diff --check and staged diff check: Passed; no unresolved index entries.

### Remaining work

- The five existing Expo dependency patch mismatches remain. Native devices were not exercised.

## 2026-11-05 - Harden admin validation and concurrent updates

### Summary

- Validate all five admin forms before submission: trimmed required values, minimum/maximum lengths, email, phone, website protocol/credentials, tax ID, reference IDs, integer discount bounds and nonblank passwords. Keep optional legacy fields editable and retain invalid form input for correction.
- Harden BE queries, nested payloads, reference normalization, request sizes and safe-integer revisions. Role/subscription writes now invalidate stale admin edits through the same revision counter.

### Files changed

- `src/gomate-portal/adminFormValidation.js`, `AdminManagement.jsx`, `tests/admin-crud.web.cjs`.
- Matching BE validators, routes, revision handling and negative/concurrency tests in GoMate-BE; `docs/ADMIN_CRUD.md` documents the tightened contract.

### Verification

- `npm.cmd run typecheck`: Passed. `npm.cmd run lint`: Passed with the same five existing warnings; JSX remains excluded by repository lint configuration.
- `EXPO_PUBLIC_API_BASE_URL=/api npx.cmd expo export --platform web`: Passed.
- BE validation, HTTP, CRUD, auth, portal authority and business regression selection: 34 tests passed, covering malformed inputs, forbidden fields, oversized payloads, query injection, literal search, stale/concurrent updates and no writes on validation errors.
- `node tests/admin-crud.web.cjs`: Passed all five CRUD flows plus client-side blank-name/password/title/reason/subject errors; confirmed invalid forms send no admin mutation requests. Browser request observation uses pass-through routing to avoid teardown races from proxy fetches.
- `npx.cmd expo-doctor`: 17/18 passed; same five existing Expo package patch mismatches.

### Remaining work

- Existing Expo patch mismatches and previously documented wallet-toast test discrepancy remain.

## 2026-11-05 - Admin CRUD across users, businesses, posts, reports and support

### Summary

- Add admin create/detail/edit/delete forms, searchable paginated tables, status filters, deletion confirmation and keyboard-accessible dialogs. Add report moderation and support replies/closure; expose existing role/subscription controls. Retain business document review and post/group lifecycle actions.
- Connect all forms to new server-authorized BE routes with stale-write checks and history-preserving deletion. Place management tools above review queues.

### Files changed

- `src/gomate-portal/AdminManagement.jsx`, `admin-management.css`, `ConnectedPortal.jsx`.
- `tests/admin-crud.web.cjs`, `package.json`, `docs/DECISIONS.md`; matching BE implementation and API documentation are in GoMate-BE.

### Verification

- `npm.cmd run typecheck`: Passed.
- `npm.cmd run lint`: Passed, with five existing warnings outside the admin files; JSX is excluded by the repository lint configuration.
- `EXPO_PUBLIC_API_BASE_URL=/api npx.cmd expo export --platform web`: Passed (PowerShell environment variable used); browser tests require a same-origin build.
- `node tests/admin-crud.web.cjs`: Passed against temporary MongoDB and a real browser: user, business, post, report and ticket CRUD, reload persistence, approval, subscription changes, support reply and mobile layout. No production database or `.env` changes.
- BE authorization/auth/business regression tests: 29 passed. `git diff --check`: Passed.
- `node tests/business-campaign-controls.web.cjs`: Failed at the final wallet-refresh success-toast expectation. Earlier campaign, owner/staff chat, group withdrawal and admin post deletion assertions passed. The unchanged `BusinessWallet.jsx` refresh handler does not emit the toast expected by this existing test.
- `npx.cmd expo-doctor`: 17/18 passed; existing Expo/Constants/Image Picker/Location/Sharing versions are one patch behind SDK expectations.

### Remaining work

- Existing Expo patch mismatches and wallet-refresh toast/test discrepancy remain. Admin forms currently use Vietnamese; no archive restore UI. Account email and verified business identity fields are immutable. New admin posts contain promotional content; event/group edits retain existing data and published posts use lifecycle actions.

## 2026-11-02 - Add the Staff workspace to the app

### Summary

- Let only accounts confirmed as `staff` by `/portal/me` open a Staff switch from their profile. Embed the existing API-backed `/staff` workspace in the native app and reuse it directly on web.
- Recheck staff access when opening the native view, pass the current session through the WebView bridge, and use an ephemeral WebView session. Staff accounts can reach the switch without completing the member profile.
- Align `expo`, `expo-location` and `expo-sharing` to the patch versions required by Expo SDK 57 after Expo Doctor reported mismatches.

### Files changed

- `App.tsx`; `src/screens/MainApp.tsx`; `src/screens/ProfileViews.tsx`; `src/screens/StaffWorkspaceScreen.tsx`; `src/screens/StaffWorkspaceScreen.native.tsx`; `src/screens/StaffWorkspaceScreen.web.tsx`.
- `src/PortalEntry.web.tsx`; `src/gomate-portal/ConnectedPortal.jsx`; `.env.example`; `README.md`; `package.json`; `package-lock.json`; `docs/DECISIONS.md`; `docs/DEVELOPMENT_LOG.md`.

### Verification

- `npm.cmd run typecheck`: Passed.
- `npm.cmd run lint`: Passed.
- `git diff --check`: Passed.
- `npx.cmd expo install expo@~57.0.31 expo-location@~57.0.22 expo-sharing@~57.0.24`: Completed; npm reported 28 audit findings (2 low, 24 moderate, 2 high), not investigated here.
- `npx.cmd expo-doctor`: Passed, 21/21 checks, after aligning the three Expo package versions.
- Automated tests: Not run; they were not requested.

### Remaining work

- Native WebView behavior was not exercised on an Android/iOS device. Set `EXPO_PUBLIC_STAFF_PORTAL_URL` if the deployed Staff website does not share the API host. The npm audit findings were not investigated.

## 2026-11-01 - Remove cost estimate helper text

### Summary

- Remove the approximate-cost example from activity creation while retaining the cost input and optional cost-sharing note.

### Files changed

- `src/screens/CreateActivityScreen.tsx`; `docs/DEVELOPMENT_LOG.md`.

### Verification

- `npm.cmd run typecheck`: Passed.
- `npm.cmd run lint`: Passed.
- `git diff --check`: Passed.
- `npx.cmd expo-doctor`: Did not complete; produced no output after 50 seconds and was interrupted.

### Remaining work

- None.

## 2026-11-01 - Fill address fields from map selections

### Summary

- Reverse-geocode tapped map points through the authenticated BE Maps proxy and use the returned address components to fill province, district, ward and address in activity creation. Show the in-progress state and preserve manual address selection.

### Files changed

- `src/components/LocationField.tsx`; `src/screens/CreateActivityScreen.tsx`; `src/services/mapsService.ts`; `docs/DECISIONS.md`; `docs/DEVELOPMENT_LOG.md`.

### Verification

- `npm.cmd run typecheck`: Passed.
- `npm.cmd run lint`: Passed.
- FE and BE `git diff --check`: Passed.
- BE `node --check src/modules/maps/routes.js` and `node --check src/modules/maps/service.js`: Passed.
- `npx.cmd expo-doctor`: Did not complete; produced no output after 50 seconds and was interrupted.

### Remaining work

- Restart GoMate-BE to expose the new reverse-geocoding route before using map taps.

## 2026-11-01 - Remove static interests prompt

### Summary

- Remove the default “Chọn sở thích phù hợp với bạn · tối đa 12” helper text from the interests picker while retaining search-result feedback.

### Files changed

- `src/components/ProfilePickers.tsx`; `docs/DEVELOPMENT_LOG.md`.

### Verification

- `npm.cmd run typecheck`: Passed.
- `npm.cmd run lint`: Passed.
- `git diff --check`: Passed.
- `npx.cmd expo-doctor`: Did not complete; produced no output after 50 seconds and was interrupted.

### Remaining work

- None.

## 2026-11-01 - Make profile image optional

### Summary

- Remove the avatar requirement from profile validation and completion gating. Profiles without an image can finish onboarding; existing initials fallbacks remain in place.

### Files changed

- `src/screens/MainApp.tsx`; `src/screens/ProfileViews.tsx`; `src/screens/ProfileAccountScreens.tsx`; `src/services/profileService.ts`; `docs/DECISIONS.md`; `docs/DEVELOPMENT_LOG.md`.

### Verification

- `npm.cmd run typecheck`: Passed.
- `npm.cmd run lint`: Passed.
- `git diff --check`: Passed.
- `npx.cmd expo-doctor`: Did not complete; produced no output after 50 seconds and was interrupted.

### Remaining work

- None.

## 2026-11-01 - Refine onboarding and activity forms

### Summary

- Add password visibility and separate required Terms/Privacy acknowledgments during registration. Show profile completion errors per missing field, require a profile image in the client completion flow, and simplify the interests hint.
- Make trip planning collapsible and optional, hide empty plan sections, add a schedule edit shortcut in the final preview, clarify cost estimation, add a phone-verification status placeholder, and align the business application form with BE-required fields.
- Defer the partner portal's initial data load by one microtask so it satisfies the current React effect lint rule.

### Files changed

- `src/components/FormField.tsx`; `src/components/ProfilePickers.tsx`; `src/components/TripPlanEditor.tsx`; `src/components/match/MatchPrimitives.tsx`; `src/gomate-portal/PartnerPortal.jsx`; `src/screens/ActivityDetailScreen.tsx`; `src/screens/AuthScreen.tsx`; `src/screens/CreateActivityScreen.tsx`; `src/screens/MainApp.tsx`; `src/screens/ProfileAccountScreens.tsx`; `src/screens/ProfileViews.tsx`; `src/services/profileService.ts`; `docs/DECISIONS.md`; `docs/DEVELOPMENT_LOG.md`.

### Verification

- `npm.cmd run typecheck`: Passed.
- `npm.cmd run lint`: Passed.
- `npx.cmd expo-doctor`: Did not complete; produced no output within 60 seconds and was interrupted.
- `git diff --check`: Passed.
- Tests not run: this UI task did not request test execution.

### Remaining work

- Phone verification is display-only because the BE has no SMS verification endpoint. The business submission flow was matched to the BE validator but could not be verified end-to-end while the local BE/MongoDB service is stopped.

## 2026-11-01 - Remove stale local API override

### Summary

- Clear the stale LAN `EXPO_PUBLIC_API_BASE_URL` override so the existing development resolver chooses the API host from the web origin or Expo host.

### Files changed

- `.env`; `docs/DEVELOPMENT_LOG.md`.

### Verification

- `npm.cmd run typecheck`: Passed.
- `npm.cmd run lint`: Failed on the existing `react-hooks/set-state-in-effect` error in `src/gomate-portal/PartnerPortal.jsx:142`.
- `npx.cmd expo-doctor`: Did not complete; produced no output within 60 seconds and was interrupted.
- Frontend HTTP check at `localhost:8081`: HTTP 200. API TCP check at port 3000: unreachable. The configured MongoDB service is stopped, and starting it failed with a Windows service access error, so an end-to-end API request was not verified.

### Remaining work

- Start the MongoDB service with sufficient Windows permissions, start the BE, and restart Expo; then verify sign-in. For a physical device, configure the BE to bind to the LAN.

## 2026-10-20 - Complete API-backed staff workspace

### Summary

- Remove unsupported fixed shift, readiness, 24/7 and SLA claims. Render missing or failed metrics as unavailable instead of zero and clear old metrics when refreshing.
- Add staff business-application navigation and pending counts using existing authenticated APIs. Display event schedule, location, cost, itinerary and offer terms before moderation.
- Initialize support reply status from the persisted ticket so closed tickets are not silently reopened.

### Files changed

- src/gomate-portal/StaffDashboard.jsx; src/gomate-portal/ConnectedPortal.jsx; tests/staff.web.cjs; src/gomate-portal/README.md.

### Verification

- npm.cmd run typecheck, npm.cmd run lint, npm.cmd run build: Passed.
- node tests/staff.web.cjs: Passed with isolated MongoDB and real HTTP APIs: metrics, application and event approval, published feed, report resolution, support persistence/status, failed metrics and retry, mobile width. Inspected desktop screenshot.
- Backend portal tests: 7 passed including staff aggregate assertions.
- npx.cmd --no-install expo-doctor: Blocked by npm registry EACCES.

### Remaining work

- Run expo-doctor with registry access. Reload the backend if running without watch to pick up the additional metric.

## 2026-10-20 - Connect partner workspace and remove mock business data

### Summary

- Serve the API-backed partner workspace at /business and /portal without demo-email routing. Preserve backend role enforcement and allow activity deep links for workspace users.
- Remove mock accounts, login, dashboards, posts, chat and fabricated metrics from GoMatePortal; keep shared visual components.
- Fetch categories from /portal/options; leave event prices, capacity, location, dates and discounts blank and submit the business-entered itinerary. Add API-backed support and subscription views, loading/error states and session-expiry handling.

### Files changed

- App.tsx; src/gomate-portal/{PartnerPortal,ConnectedPortal,GoMatePortal}.jsx; src/gomate-portal/index.js and README.md; tests/business-demo.web.cjs; docs/DECISIONS.md.

### Verification

- npm.cmd run typecheck, npm.cmd run lint, npm.cmd run build: Passed.
- npm.cmd run test:business:web: Passed against isolated MongoDB and real API; verified application review, /business entry, empty defaults, custom itinerary persistence, event publication, support persistence after reload, membership/chat and responsive layouts. Inspected generated mobile screenshot.
- Backend portal and business-event tests: 8 passed; options contract also passed after adding its assertion.
- git diff --check: Passed for frontend.
- npx.cmd expo-doctor: Could not complete; npm registry access failed with EACCES in this environment.

### Remaining work

- Run expo-doctor when npm registry access is available. Explicit /demo accounts remain test fixtures using real authentication; no production database records were deleted.

## 2026-10-16 - Allow immediate Admin role assignment

### Summary
- Removed target email verification prerequisite from role API and role editor at the user's request. Self-role protection and session revocation remain. Assignment does not mark email as verified or change login verification.

### Files changed
- BE portal/repository.js, tests/portal.test.js, docs/PORTAL_API.md; FE ConnectedPortal.jsx and docs/DECISIONS.md.

### Verification
- Backend portal tests: 7/7 passed, including assignment to an unverified account without changing email_verified.

### Remaining work
- None.


## 2026-10-16 - Admin dashboard redesign into seven functional sections

### Summary
- Organized Admin navigation into overview, users, business approvals, post moderation, reports, support and subscriptions. Split role editing from plan editing.
- Added AdminDashboard with live metrics, refresh/error states, JSON export, clickable statistic cards and six functional shortcuts.
- Redesigned Admin with teal sidebar, section descriptions, welcome banner, responsive statistic grid and consistent forms/cards. Removed the customer ticket creation form from operator workspaces.

### Files changed
- src/gomate-portal/AdminDashboard.jsx, WorkspaceLayouts.jsx, ConnectedPortal.jsx, portal-connected.css; tests/portal.web.cjs.

### Verification
- Typecheck, lint, web build: passed. Expo Doctor: 21/21 passed.
- Browser portal integration: passed with temporary MongoDB, including business approvals, subscription changes in the separate section, role changes, revoked sessions, moderation, support, JSON export and responsive widths.
- Reviewed the generated Admin dashboard screenshot at test-results/portal-admin.png.

### Remaining work
- None within this redesign scope. No real billing was introduced.


## 2026-10-16 - Admin user role management

### Summary
- Added Admin-only PATCH /api/portal/users/:id/role for user, staff and admin. Requires verified email, blocks self changes, records actor/time and increments credential version atomically to revoke previous sessions.
- Added role editor and save feedback to Admin user cards, separate from subscription changes. Business access still derives from approved applications and is explained in the UI.

### Files changed
- BE portal routes/repository, portal tests, Postman collection and PORTAL_API.md.
- FE ConnectedPortal.jsx and portal.web.cjs.

### Verification
- Backend portal tests: 7/7 passed using temporary MongoDB, including authorization, validation, self protection, session revocation and business effective roles.
- Browser portal workflow: passed, including UI role assignment and old session rejection.
- FE typecheck, final lint and web build passed; Expo Doctor 21/21 passed.

### Remaining work
- None within role assignment scope. Business approval remains a separate workflow.


## 2026-10-16 - Separate Admin, Staff and Business workspaces

### Summary
- Added dedicated /admin, /staff and /business web workspaces with distinct layouts, navigation and visual themes. /portal remains a compatible entry.
- Resolve effective role from the backend before rendering the main user app; privileged accounts bypass user onboarding and redirect to their workspace. Wrong workspace URLs normalize to the authenticated role.
- Native privileged sessions show guidance to use the web workspace instead of entering user surveys.

### Files changed
- App.tsx; src/gomate-portal/ConnectedPortal.jsx; WorkspaceLayouts.jsx; portal-connected.css; tests/portal.web.cjs; docs/DECISIONS.md.

### Verification
- npm run typecheck and npm run lint: passed.
- Expo web export with /api base URL: passed.
- npm run test:portal:web: passed with temporary MongoDB and Chrome; includes role redirects from root and incorrect workspace URLs, existing workflows, responsive widths and screenshots.
- npx expo-doctor: 21/21 passed (rerun with network access after sandbox registry EACCES).
- Reviewed Admin, Staff and Business screenshots.

### Remaining work
- Native workspaces are web-only. Staff provisioning and account locking UI are outside this interface separation task; existing API capabilities remain unchanged.


## 2026-10-16 - Connect Business, Staff and Admin portal to the backend

### Summary

- Replace demo credentials and local-only dashboard mutations with shared authentication and persisted portal APIs. Add the platform-specific /portal entry, verified business applications, private document submission, moderation, support threads, real metrics and JSON export.
- Manage Free/Plus entitlements and status without payment collection. Reuse the existing configured Google login. Remove nonfunctional Apple/demo controls from the portal; the main app is unchanged.
- Add loading/error/retry handling, prevent duplicate submissions, handle expired sessions, and make the portal scroll correctly inside the Expo web root.
- Enable JSX lint checks and add a browser regression covering three roles against an isolated MongoDB backend.

### Files changed

- App.tsx, src/PortalEntry*, src/gomate-portal/*, gomate-portal-preview.html.
- package.json, eslint.config.js, tests/portal.web.cjs, docs/DECISIONS.md.

### Verification

- Frontend unit tests: 13 passed.
- Expo Doctor: 21/21 passed.
- Web export with EXPO_PUBLIC_API_BASE_URL=/api: passed. Clear Metro cache when changing the baked API URL.
- npm run typecheck and npm run lint: passed with no warnings (including portal JSX).
- node tests/portal.web.cjs: passed against isolated MongoDB; login, document submission, business approval, Plus assignment, post submission/moderation/feed, support replies, reload persistence, metrics download and desktop/mobile width/scroll checks.
- Reviewed desktop/mobile screenshots in test-results; git diff --check passed.

### Remaining work

- Configure real email/Google providers as needed and provision the first verified admin using the documented operator CLI. No real accounts or database permissions were changed during tests.
- Business announcements appear in the portal feed, separate from mobile personal activities. Apple sign-in, native push and payment processing remain outside this portal task.

## 2026-10-16 - Resolve fe-ui2 merge conflicts

### Summary

- Resolved all 16 conflicted files using the integrated fe-ui2 screens, API session flow, Expo configuration and matching dependency lockfile.
- Preserved local development/build scripts and the original profile/activity forms and service contracts under explicit legacy modules. Adapted the original discovery screen to the new match callback contract.
- Routed legacy authentication through the shared API session so old and new screens cannot maintain separate logins. Kept existing service tests and added a shared-session regression test.

### Files changed

- App.tsx, .env.example, app.json, package.json, package-lock.json.
- Conflicted screens, src/components/match/MatchPrimitives.tsx, src/services/activityService.ts, src/services/profileService.ts.
- src/services/authService.ts, legacyActivityService.ts, legacyProfileService.ts, discoveryService.ts; src/hooks/useProfile.ts.
- src/screens/LegacyCreateActivityScreen.tsx, ActivityManagerScreen.tsx, DiscoverScreen.tsx, ProfileScreen.tsx; tests/*Service.test.cjs, tests/auth-compat.test.cjs.

### Verification

- npm.cmd ci --ignore-scripts --no-audit --no-fund: Passed; installed the merged lockfile.
- npm.cmd run typecheck: Passed.
- npm.cmd run lint: Passed with no warnings.
- node --test tests/*.test.cjs: Passed, 13 tests.
- npx.cmd --yes expo-doctor: Passed, 21/21 checks.
- git diff --check and conflict-marker scan: Passed.

### Remaining work

- Complete the local merge commit after reviewing the staged resolution. Browser/device checks against a running backend remain manual.

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

## 2026-11-02 - Merge quang-ui into quan_business

### Summary

- Merge `origin/quang-ui` (`c1e0450`) into `quan_business`, preferring the existing business workflows when implementations conflict.
- Keep the current portal, VietQR escrow, session isolation, activity lifecycle, invitations, live counts, profile validation and Google directions. Retain compatible incoming UI changes and new compatibility services/screens.
- Restore files deleted by the incoming branch that are still needed by the current application. Fix the incoming portal entry import and preserve existing npm test commands.
- Restore the wallet refresh success/error notices alongside the current VietQR wallet.

### Files changed

- Incoming UI components/screens, compatibility services, Playwright configuration/tests and package manifests.
- `src/PortalEntry.web.tsx`, `src/services/mapsService.ts`, `src/gomate-portal/BusinessWallet.jsx`.
- `docs/DEVELOPMENT_LOG.md`.

### Verification

- `npm.cmd run typecheck`: Passed.
- `npm.cmd run lint`: Passed with five existing warnings.
- `npx.cmd expo-doctor`: Passed, 21/21 checks.
- Six Node tests covering activity input, directions, compatibility authentication/activity/profile services and discovery: Passed.
- Expo web export with `EXPO_PUBLIC_API_BASE_URL=/api`: Passed after the final wallet notice fix.
- Explicit ESLint on `BusinessWallet.jsx` with `--no-ignore`: Passed.
- Business campaign browser test: Passed, including campaign creation, split groups, scoped chat, staff accounts, withdrawal, admin deletion, wallet refresh notice and mobile layout. The initial run exposed the missing wallet refresh notice, now corrected.
- `npm.cmd run test:web`: Login, persisted session and browser navigation passed; the test then timed out looking for the obsolete label `Gửi yêu cầu tham gia`. The preserved `quan_business` detail screen uses `Yêu cầu tham gia`; the remaining smoke assertions were not reached.
- `git diff --cached --check`: Passed.

### Remaining work

- Five existing lint warnings; update the user smoke test for current join/cancel labels. Native devices and the incoming branch's alternate portal tests have not been validated.

## 2026-11-01 - Contextual portal action errors

### Summary

- Add an explicit operation/target to every shared portal action failure, including employee, location, document, review, campaign/group lifecycle, plan, deposit, offer, attendance, refresh and logout actions.
- Centralize Vietnamese explanations for common API validation, duplicate email, permission, stale data, authentication and server errors. Keep wrong login credentials distinct from an expired session, retain useful server reasons and avoid duplicate expiry notices when returning to authentication.
- Apply the same error formatting to registration/verification/resend, wallet loading/refresh and location coordinate validation. Existing success messages and top-right notice behavior are preserved.

### Files changed

- `src/gomate-portal/portalActionError.js`, `ConnectedPortal.jsx`, `PortalAuth.jsx`, `BusinessWallet.jsx`, `LocationLibrary.jsx`.
- `tests/business-campaign-controls.web.cjs`; portal README.

### Verification

- Browser campaign controls: Passed. Real invalid login and duplicate employee email plus controlled invalid-payload (400), unavailable-refresh (503) and stale-withdrawal (409) responses produce the correct operation and translated reason. Failed refresh preserves the workspace; failed withdrawal leaves the group published. Successful creation, scoped chat, withdrawal/deletion, wallet refresh and mobile checks still pass.
- `npm.cmd run typecheck`: Passed.
- Explicit ESLint on all changed portal source files with `--no-ignore`: Passed.
- Expo web export with `EXPO_PUBLIC_API_BASE_URL=/api`: Passed.
- `npx.cmd expo-doctor`: Passed, 18/18 checks.
- `npm.cmd run lint`: Failed on the two pre-existing render-time `Date.now()` purity errors in `HomeComponents.tsx` and `ActivityProgressScreen.tsx`, with five unrelated warnings.
- Reviewed edits and ran `git diff --check`: Passed.

### Remaining work

- Existing repository-wide lint errors remain outside this task.

## 2026-11-01 - Describe each portal action in its notification

### Summary

- Remove the generic success fallback. Report the actual action and affected employee, location, business application, post or group after successful API completion.
- Distinguish staff creation/update/revocation, post/group withdrawal/deletion, application/post review, schedule/start/completion, attendance, deposits, plans, offers, downloads, refresh and authentication.
- Add a specific result for manual wallet reconciliation refresh; initial wallet loading remains silent and ignores responses after unmount.

### Files changed

- `src/gomate-portal/ConnectedPortal.jsx`, `PortalAuth.jsx`, `BusinessWallet.jsx`.
- `tests/business-campaign-controls.web.cjs`.

### Verification

- Browser campaign controls: Passed; assert contextual notices for saving a location, approving a named post, creating a named employee and refreshing wallet reconciliation, and absence of the former generic success notice. Existing desktop/mobile positioning and dismissal checks also passed.
- `npm.cmd run typecheck`: Passed.
- Explicit ESLint with `--no-ignore` on the three changed JSX files: Passed.
- Expo web export with `EXPO_PUBLIC_API_BASE_URL=/api`: Passed.
- `npx.cmd expo-doctor`: Passed, 18/18 checks.
- `npm.cmd run lint`: Failed on the two existing render-time `Date.now()` purity errors in `HomeComponents.tsx` and `ActivityProgressScreen.tsx`; five unrelated warnings remain.
- Reviewed edits and ran `git diff --check`: Passed.

### Remaining work

- Existing repository-wide lint errors remain outside this task.

## 2026-11-01 - Top-right action notices and direct business staff accounts

### Summary

- Show dismissible success/error notices in a fixed top-right stack, independent of scroll position. Shared portal actions, location feedback and authentication use the notifier instead of result banners at the top of the page. Success/error notices expire after 6/10 seconds; repeated errors create distinct notices.
- Businesses create new employee accounts with name, email, password, phone, title and optional assigned groups. Accounts work immediately without employee consent or admin review; existing emails are rejected and editing cannot replace account identity. Only admin reviews business applications/posts and administers the platform.
- Remove employee invitations and the admin employee-approval UI/APIs. Keep existing approved/consented grants compatible; direct grants use provisionedAt and preserve immediate scoped activity/chat access and revocation.

### Files changed

- FE: src/gomate-portal/{PortalNotifications.jsx,ConnectedPortal.jsx,PortalAuth.jsx,BusinessStaffManagement.jsx,AdminBusinessReview.jsx,LocationLibrary.jsx,connected-portal.css,README.md}.
- FE: tests/{business-campaign-controls.web.cjs,business-workflow.web.cjs}; docs/DECISIONS.md.
- BE: src/modules/portal/{operations-routes.js,operations.js,repository.js}, src/common/business-staff-access.js; tests/{business-workflow.test.js,business-campaign-control.test.js}; API/development docs.

### Verification

- BE npm.cmd test: Passed, all 124 tests. Includes immediate employee login, duplicate email/password validation, assigned-group isolation, reassignment, revocation and admin-only platform authority.
- FE business-campaign-controls.web.cjs: Passed with real backend/browser flows; desktop/mobile toast position, repeated errors, dismissal, account creation/login without approvals, scoped chat and lifecycle controls. Reviewed desktop screenshot.
- FE portal-registration.web.cjs: Passed; signup, email verification, session restoration/retry and mobile layout.
- The older business-workflow.web.cjs also reached direct employee creation/login, app activity/member access and chat, then failed at the stale consumer join-button label (Gửi yêu cầu tham gia versus the current Yêu cầu tham gia). Its remaining consumer lifecycle assertions are unverified in this run; backend lifecycle tests and focused browser controls passed.
- npm.cmd run typecheck: Passed. Web export with EXPO_PUBLIC_API_BASE_URL=/api: Passed. npx.cmd expo-doctor: Passed, 18/18 checks (registry access required escalation).
- Explicit ESLint on changed portal JSX with --no-ignore: Passed. npm.cmd run lint: Failed on pre-existing react-hooks/purity errors in HomeComponents.tsx and ActivityProgressScreen.tsx; five unrelated warnings remain. The repository lint configuration normally excludes JSX.
- Reviewed FE/BE diffs; no changes to pre-existing package.json/package-lock.json edits. git diff --check: Passed.

### Remaining work

- Existing pending employee grants stay inactive until their business explicitly saves them. No production data migration was run.
- The business supplies the employee's initial password; provisioning marks email_verified for immediate login and sends no verification email or credentials.
- Resolve the two existing lint purity errors outside this task.

## 2026-10-30 - Copy-ready input data for two HCMC demo flows

### Summary

- Add the requested input values rather than presenter instructions: personal activity and business workshop in Ho Chi Minh City, with descriptions, locations, schedules, capacities, offers, verification fields, itinerary and chat text. Clearly label fictional business data and future-date requirements.

### Files changed

- `docs/DU_LIEU_NHAP_DEMO_HCM.txt`, `docs/DEVELOPMENT_LOG.md`.

### Verification

- Compared field names, lengths and sample values with the current composer and verification form. Documentation only; no application checks rerun.

### Remaining work

- Use an existing verified account for staff email and matching demo documents for verification; choose future dates if reusing later.

## 2026-10-30 - Plain-text demo script and current-branch delivery

### Summary

- Add a Vietnamese plain-text script for the individual and business journeys, including Admin review, assigned staff, stable group allocation, inline locations, chat and withdrawal/deletion. Include setup, accounts, expected results and presenter checklist.
- Deliver the accumulated FE/BE changes on their existing `quan_business` branches. Parent workspace launcher files are versioned under FE `tooling/workspace-root/` because the parent is not a Git repository.

### Files changed

- `docs/DEMO_HAI_LUONG.txt`, `docs/DEVELOPMENT_LOG.md`.

### Verification

- Reviewed instructions against current demo guide, launcher and verified portal flow. No source change in this documentation task; preceding entry records passing build, typecheck, browser regressions and backend tests.
- Check staged whitespace and final remote branch SHAs during delivery.

### Remaining work

- None for the demo document. Existing lint/Expo Doctor limitations remain recorded below.

## 2026-10-30 - Manual campaigns, stable group audiences and business group chat

### Summary

- Allow manual meeting points without a saved branch, with optional inline save and coordinates. Default to shared group information; split exact totals (20/3 = 7, 7, 6), explaining uneven splits before submission.
- Move notices to the top-right bell; use refresh/settings icons. Settings is a placeholder. Redesign active-group search, cards and operational tabs; add owner/assigned-staff chat with history, polling, read receipts and authenticated attachments.
- Persist one consumer group per campaign across discovery, direct URLs, joins, favorites, feed and chat. Owners/Admin/assigned staff retain scoped management access. New business group capacities count participants, excluding the organizer.
- Add owner/Admin withdrawal/deletion of campaigns or groups, version checks and confirmation. Close requests/chat writes, retain history, notify affected users, and retry durable cleanup without resurrecting groups.

### Files changed

- FE: `src/gomate-portal/MultiGroupPostComposer.jsx`, `LocationLibrary.jsx`, `ConnectedPortal.jsx`, `ActiveCampaignDashboard.jsx`, `GoMatePortal.jsx`, `connected-portal.css`; new `BusinessGroupChat.jsx`, `PortalHeaderActions.jsx`, `PostLifecycleActions.jsx`; `tests/business-campaign-controls.web.cjs`, `package.json`, decision log.
- BE: new `src/common/business-audience.js`, `src/modules/portal/post-lifecycle.js`; portal repository/routes/validation/operations, activity repository/routes/me-routes/chat-events, chat repository, database indexes; `tests/business-campaign-control.test.js`, `tests/business-workflow.test.js`, `docs/PORTAL_API.md`.

### Verification

- Relevant BE activity/business/chat/portal suite: 43 tests passed across 16 files. New campaign-control test passed again with injected post-commit chat failure, durable reconciliation, exactly-once notifications and no resurrection.
- Root `npm run build:web`, FE `npm run typecheck`: passed. New `node tests/business-campaign-controls.web.cjs`: passed against isolated real BE/Mongo, including inline save, 20/3 split, approval, owner/staff chat and image download, withdrawal/deletion and mobile bounds. Screenshot inspected.
- `node tests/portal-registration.web.cjs` and `node tests/verification-documents.web.cjs`: passed again against the final export, including session restoration and private document previews.
- FE lint retains two unrelated Date.now render-purity errors and five warnings; Expo Doctor passes 20/21 checks with existing expo/expo-location/expo-sharing patch mismatches.

### Remaining work

- Settings intentionally has no action. Existing approved campaigns are not repartitioned or migrated to new participant counters. The full legacy native-app workflow test has a previously recorded unrelated staff-screen text expectation; the dedicated browser regression covers the new portal flow.

## 2026-10-30 - Stable file picking, private image previews and complete Admin verification

### Summary

- Anchor the portal scroller to the viewport independently of Expo's fixed-height root. Anchor the native file input inside its upload control to avoid focus scrolling the document and exposing blank space after the picker closes.
- Show local and saved image thumbnails for primary and supplemental verification documents in the business form/summary and Admin details. Load saved images through the existing authenticated owner/Admin download endpoint; revoke blob URLs and cancel obsolete requests. Refresh replaced files by application revision, including replacements with the same filename. PDFs keep a file card/download rather than an unsafe inline embed.
- Use the complete application review panel on both Admin Overview and Business applications. Include every submitted business/contact field, account type, country, certificate/tax numbers, submission/update dates and both documents. Keep review state current after data refresh and show the modal above floating controls on mobile.

### Files changed

- `src/gomate-portal/VerificationDocumentPreview.jsx`, `BusinessVerificationForm.jsx`, `AdminBusinessReview.jsx`, `ConnectedPortal.jsx`, `connected-portal.css`.
- `src/i18n/portalTranslations.ts`, `package.json`, `tests/verification-documents.web.cjs`, `tests/business-workflow.web.cjs`, `docs/DEVELOPMENT_LOG.md`.

### Verification

- Root `npm run build:web`, FE `npm run typecheck`, `git diff --check`: passed. Local `/portal` returns 200 and serves the latest bundle.
- `node tests/verification-documents.web.cjs`: passed against an isolated real backend/database. Covers file chooser selection/cancel, viewport coverage without root scrolling, local image replacement, persisted private thumbnails, all submitted fields in Admin, rejection/resubmission with a same-name replacement and mobile rendering. Desktop/mobile screenshots inspected.
- `node tests/portal-registration.web.cjs`: passed, including PDF submissions and restored-session/no-login-flash checks.
- `npm run lint`: existing two Date.now render-purity errors and five warnings in unrelated files. `npx expo-doctor`: existing three patch mismatches; 20/21 checks passed.

### Remaining work

- Native picker coverage uses headless Chrome's file chooser automation; the exact original OS/DevTools repaint artifact was not independently reproduced. Image previews and viewport bounds pass the regression scenario without resizing or opening DevTools.

## 2026-10-30 - Restore portal sessions without login flash and clarify Admin/Staff

### Summary

- Render a loading/retry workspace while a stored session resolves, rather than mounting email/password login. Keep sessions during temporary API failures; expired sessions still return to login.
- Restrict platform review/management to Admin in FE and BE; reject assigning the retired global Staff role. Business Staff remains derived from business-created grants and retains group-scoped permissions.
- Replace demo Staff with Admin and migrate only marked workshop demo accounts, preserving passwords/IDs and invalidating previous sessions. Applied the targeted migration locally without reseeding activities.

### Files changed

- FE: `src/gomate-portal/ConnectedPortal.jsx`, `DemoHub.jsx`, `connected-portal.css`, `src/i18n/portalTranslations.ts`, `tests/portal-registration.web.cjs`, demo/module documentation and logs.
- BE: portal routes/repository, operator role command, `src/database/workshop-demo.js`, `workshop-demo-admin.js`, portal/business test fixtures, `tests/portal-authority.test.js`, `docs/PORTAL_API.md`.

### Verification

- `node --test tests/portal-authority.test.js tests/portal.test.js tests/business-events.test.js tests/business-verification.test.js tests/business-workflow.test.js`: 20 tests passed. Verifies Admin-only approval, legacy Staff/Business Staff denial, role assignment restrictions and safe/idempotent demo migration.
- FE `node tests/portal-registration.web.cjs`: passed. DOM observer confirms no password form mounts during delayed reload or retry after HTTP 503; HTTP 401 clears the session and displays login. Demo card shows Admin; business registration/upload still passes.
- Root `npm run build:web`, FE `npm run typecheck`: passed. Local demo migration returned demo.admin@gomate.local with admin role, retaining the existing password.
- FE `npm run lint`: existing two Date.now render-purity errors and five warnings in unrelated files. `npx expo-doctor`: existing patch mismatches for expo, expo-location and expo-sharing (20/21 checks passed).

### Remaining work

- Real legacy Staff accounts require an explicit operator decision if they should become Admin; no automatic promotion is performed.

## 2026-10-30 - Company and household business verification form

### Summary

- Remove the authenticated sidebar demo link; add company/individual account type, Vietnam region, explicit name/certificate guidance, 28 selectable industries with Other, and optional supplemental upload. Keep representative/contact information.
- Persist schemaVersion 3 certificate identity, freeze certificate/type/region after submission and retain approval-based business access. Keep older application request shapes compatible.
- Validate uploads on BE: matching PDF/PNG/JPEG/JPG formats, max 10 MB per file and parsed PDFs limited to 1–30 pages. Store supplemental files privately in a separate collection; expose metadata and owner/reviewer downloads only.

### Files changed

- FE: `src/gomate-portal/BusinessVerificationForm.jsx`, `ConnectedPortal.jsx`, `AdminBusinessReview.jsx`, `connected-portal.css`, `src/i18n/portalTranslations.ts`, `tests/portal-registration.web.cjs`, `tests/business-workflow.web.cjs`.
- BE: `src/modules/portal/business-options.js`, `documents.js`, `validation.js`, `routes.js`, `repository.js`, `src/database/mongo.js`, package/lockfile, portal/business-workflow test fixtures, `tests/business-verification.test.js`, `docs/PORTAL_API.md`.
- `docs/DECISIONS.md`, `docs/DEVELOPMENT_LOG.md`.

### Verification

- Root `npm run build:web`, FE `npm run typecheck`, both repository `git diff --check`: passed.
- BE `node --test tests/business-verification.test.js tests/portal.test.js tests/business-workflow.test.js`: 18 tests passed. Includes PDF 30/31 page boundaries, malformed/oversized files, simultaneous two 10 MB uploads, allowed industries, certificate immutability, private supplemental downloads, rejection/resubmission and approval permissions.
- FE `node tests/portal-registration.web.cjs`: passed with real isolated auth/portal APIs, household business upload plus supplemental PDF, industry selection and reload persistence; desktop/mobile screenshots inspected.
- FE `node tests/business-workflow.web.cjs`: profile rejection/resubmission/approval and campaign publication stages passed. The wider suite then timed out on its unrelated staff-onboarding text expectation (Bạn là nhân sự quản lý nhóm doanh nghiệp, line 71); no staff UI was changed in this task. Updated selectors to match visible state rather than transient icon-containing alerts.
- `npm run lint`: existing two Date.now render-purity errors and five warnings in unrelated app files. `npx expo-doctor`: existing three Expo package patch mismatches (20/21 checks passed).

### Remaining work

- PDF validation rejects unreadable/password-protected files. Only Vietnam is offered as requested. Real document identity/name matching is performed by reviewers, not OCR.

## 2026-10-30 - Business registration directly inside the portal

### Summary

- Use the app's BrandLogo and Ionicons in the portal instead of the separate drawn logo/icons.
- Add real account registration, password confirmation and email verification within `/portal`, followed by the existing business application form. Business permissions still require application approval.
- Move demo and app access below authentication. State that downloads are unavailable, with a working web-app link. Include Vietnamese/English copy and mobile layout.

### Files changed

- `src/gomate-portal/PortalAuth.jsx`, `ConnectedPortal.jsx`, `GoMatePortal.jsx`, `connected-portal.css`.
- `src/i18n/portalTranslations.ts`, `package.json`, `tests/portal-registration.web.cjs`.

### Verification

- `npm run build:web` (shared root), `npm run typecheck`: passed.
- `node tests/portal-registration.web.cjs`: passed against an isolated MongoDB database and actual auth endpoints; covers mismatched passwords, account creation without business privileges, wrong/correct verification codes, authenticated business onboarding, reload persistence and mobile overflow. Inspected desktop and mobile screenshots.
- `npm run lint`: existing two render-purity errors and five warnings in unrelated app files; no new reported errors. Portal JSX is excluded by the existing lint configuration.
- `npx expo-doctor`: 20/21 checks passed; existing patch-version mismatches for expo, expo-location and expo-sharing.

### Remaining work

- No app download URL exists yet. Real email delivery requires the existing BE mail configuration; the test captures verification mail without external delivery.
## 2026-10-30 - Standardize local web on port 3000

### Summary

- Replace the shared-root dual-server launcher with a fresh web export followed by BE watch mode on port 3000. Force same-origin `/api` during export; stop startup on export failure.
- Add `dev` and `build:web` aliases, document manual rebuild/refresh after FE edits, and update demo URLs. Preserve native Expo commands.

### Files changed

- Shared parent `package.json`, `scripts/web-local.cjs`, `README.md`; versioned copies in `tooling/workspace-root/`.
- `tooling/README.md`, `docs/DEMO_GUIDE.md`, `docs/DECISIONS.md`, `docs/DEVELOPMENT_LOG.md`.

### Verification

- `node --check scripts/web-local.cjs`, `npm run build:web`, `npm run typecheck`, launcher-copy equality and `git diff --check`: passed.
- HTTP GET on existing local server: `/`, `/portal`, `/demo`, `/api/health` all returned 200 after the fresh export. An attempted second BE startup correctly failed with EADDRINUSE; the existing server was left running.
- `npm run lint`: failed on existing Date.now render purity errors in HomeComponents.tsx and ActivityProgressScreen.tsx; five existing warnings. Those files were not changed.
- `npx expo-doctor`: 20/21 passed; existing patch-version mismatches for expo, expo-location and expo-sharing.

### Remaining work

- Existing lint errors and Expo patch-version warnings remain outside this launcher change. Frontend edits require `npm run build:web` and a browser refresh.
## 2026-10-29 - Surface approved business assignments in the staff app

### Summary

- Include approved, consented enterprise assignments in the staff member's activity list and home schedule without creating participant requests, consuming capacity or requiring a deposit.
- Materialize missing group conversations when staff open their chat list, including older approved assignments. Keep current grants authoritative so edits/revocation remove access immediately.
- Allow assigned staff to read their group's activity, members, attendance/updates and completed activity details. Show a manager badge and business portal shortcut in the app; hide the ordinary participant leave action for assigned managers.

### Files changed

- BE: `src/common/business-staff-access.js`; activity repository/routes; chat repository; `tests/business-workflow.test.js`; business API docs.
- FE: `src/data/activities.ts`, `src/services/activityApi.ts`; `MainApp.tsx`, `ActivityDetailScreen.tsx`, `GroupScreen.tsx`, `MembershipViews.tsx`; `tests/business-workflow.web.cjs`.
- Development and decision logs.

### Verification

- BE `npm.cmd test`: Passed, 120 tests. Added assignment visibility, automatic chat creation/idempotency, no participant request or capacity changes, completed-group reads, and immediate revocation coverage.
- FE typecheck, lint and Expo web export: Passed.
- `npx.cmd expo-doctor`: 17/18 passed; existing expo/expo-location/expo-sharing patch mismatches remain.
- `npm.cmd run test:business:web`: Passed, including assigned staff activity visibility, automatic chat discovery, member list access and sending a real message without participant registration; full lifecycle/revocation and timeout recovery regressions also passed, with no browser runtime errors. Reviewed staff group screenshot.
- `git diff --check`: Passed in both repositories. Existing unrelated working changes preserved.

### Remaining work

- Restart the running backend to load the new APIs, then refresh the app. Existing staff assignments need no database migration or reapproval.
- Staff use the existing business portal for delegated management actions; ordinary activity owner write permissions remain restricted to the owner.

## 2026-10-29 - Prevent overlapping portal refreshes and repeated timeout alerts

### Summary

- Share one in-flight portal load and wait for all endpoint requests to settle before starting another batch. Mutations wait for the prior refresh so stale responses do not race post-save reloads.
- Replace the 10-second interval with a completion-based 15-second schedule and failure backoff (30/60/120 seconds). Skip hidden tabs and offline browsers.
- Keep last successful data on background failures, show a persistent stale-data notice separately from action errors, and clear that notice after recovery. Manual actions still report failures.

### Files changed

- `src/gomate-portal/ConnectedPortal.jsx`
- `tests/business-workflow.web.cjs`
- `docs/DEVELOPMENT_LOG.md`

### Verification

- `npm.cmd run typecheck`, `npm.cmd run lint`, Expo web export: Passed.
- `npx.cmd expo-doctor`: 17/18 passed; existing expo/expo-location/expo-sharing patch mismatches remain.
- `npm.cmd run test:business:web`: Passed full business workflow plus a real 15-second staff API timeout: one request batch, cached data retained, no repeated red alert, recovery clears the stale notice, no browser runtime errors. Initial simulated-clock attempts did not exercise the timer reliably; final coverage uses real elapsed time.
- Diff reviewed against existing working changes; no backend or dependency changes for this fix.

### Remaining work

- This corrects frontend request overlap and repeated background error alerts. Actual backend/network outages still require a successful connection; no production backend logs were available to attribute the original slow request.

## 2026-10-29 - Business wallet reconciliation without unverified payouts

### Summary

- Add an owner-only wallet API and portal screen showing recorded deposits by group, estimated 10% fees rounded per participant, and estimated business proceeds.
- Keep manual receipts separate from verified held funds and available balance (both zero). Completed activities do not create withdrawable money. Reuse existing business/staff/group lifecycle without changing shared staff authority.

### Files changed

- FE: `src/gomate-portal/BusinessWallet.jsx`, `ConnectedPortal.jsx`, `tests/business-workflow.web.cjs`.
- BE: `src/modules/portal/wallet.js`, `operations.js`, `operations-routes.js`; `tests/business-wallet.test.js`, `business-workflow.test.js`; business API documentation.
- `docs/DEVELOPMENT_LOG.md`, `docs/DECISIONS.md`.

### Verification

- FE `npm.cmd run typecheck`, `npm.cmd run lint`, Expo web export: Passed.
- BE `node --test tests/business-wallet.test.js tests/business-workflow.test.js`: Passed, 10 tests including owner-only access, tenant isolation, receipt reversal and zero spendable funds after completion.
- FE `npm.cmd run test:business:web`: Passed, full owner/admin/staff/participant lifecycle and wallet UI; no browser runtime errors. Used cached MongoDB binary after default cache access failed. Reviewed wallet screenshot.
- `npx.cmd expo-doctor`: 17/18 passed; existing expo, expo-location and expo-sharing patch mismatches. Initial sandbox npm access failed; network-enabled retry completed.
- `git diff --check`: Passed in both repositories; existing unrelated working changes preserved.

### Remaining work

- Payment integration is explicitly excluded by the user. No real collection, refunds, payouts, payment webhooks, dispute handling or financial fraud protection is implemented. The 10% fee is an estimate only, not a persisted contractual fee.
- Business web self-registration and automatic capacity-based chat splitting were not added in this task; existing GoMate account/application and manually composed groups remain.
- Existing Expo patch mismatches remain.

## 2026-10-27 - Refine enterprise staff, shared group plans and mapped locations

### Summary

- Keep enterprise staff as consented, admin-reviewed group assignments. Notify the admin queue when businesses submit and recipients accept. Expose multiple approved managers per group without counting them as participants.
- Preserve itinerary dates and saved-location selection; canonical business locations supply addresses and map coordinates. Assigned staff can quick-select locations belonging to their business, with server ownership checks on every save.
- Add editable offer notifications with version conflict checks; update delivered notifications instead of duplicating them. Add participation/management views and deposit confirmation reversal controls to the business dashboard.

### Files changed

- BE: src/modules/portal/operations.js, operations-routes.js, repository.js; tests/business-workflow.test.js; docs/business-workflow.md.
- FE: ActiveCampaignDashboard.jsx, ConnectedPortal.jsx, BusinessStaffManagement.jsx; tests/business-workflow.web.cjs; development and decision logs.

### Verification

- BE npm.cmd test: Passed, 118 tests, including multiple employees sharing a group, independent revocation, admin queue notifications, canonical coordinates/location references and stale offer edits.
- BE node --test tests/business-workflow.test.js: Passed after the final canonical-address length guard.
- npm.cmd run test:business:web: Passed with owner/admin/employee/participant accounts; confirms saved location coordinates, offer edits without duplicate notifications, participant access to the same plan, attendance/completion/rating and revocation. No browser runtime errors.
- npm.cmd run typecheck, npm.cmd run lint and Expo web export: Passed.
- npx.cmd expo-doctor: 17/18 passed; existing expo/expo-location/expo-sharing patch mismatches remain.
- Git diff --check: Passed in both repositories.

### Remaining work

- Staff sign in with their own verified GoMate accounts; the business requests their enterprise role. No shared credentials or platform-staff permissions are granted.
- Deposits remain a manual ledger. Existing Expo patch-version mismatches remain.

## 2026-10-27 - Persist the complete business web workflow

### Summary

- Complete and validate company/tax/address/representative/license registration, private document access, rejection/resubmission, duplicate tax guards and versioned reviews.
- Persist business locations, multi-group campaigns, assigned employees, plans, manual deposit receipts and offers. Publish real activities only after review; use stable IDs and reconcile interrupted publication.
- Require employee consent and admin approval with group-scoped permissions; assignment edits/revocation remove delegated portal and chat access. Keep global account roles and participant counts unchanged.
- Connect the existing web portal to these APIs and enforce participant/deposit/schedule/attendance guards through completion and existing mobile ratings.

### Files changed

- BE: src/modules/portal/{validation,operations,operations-routes,repository,routes}.js; src/database/mongo.js; activity-readiness, activities/chat repositories and server publication reconciliation.
- BE: tests/business-workflow.test.js, portal.test.js, business-events.test.js; docs/business-workflow.md and README.md.
- FE: ConnectedPortal, BusinessVerificationForm, BusinessStaffManagement, AdminBusinessReview, LocationLibrary, ActiveCampaignDashboard; MainApp business notification routing; BusinessIdentity and activity type expose the required deposit before joining.
- FE: tests/business-workflow.web.cjs and business-demo.web.cjs; development and decision logs.

### Verification

- BE npm.cmd test: Passed, 117 tests against temporary MongoDB, including cross-business access, stale writes, consent/re-consent, chat revocation, publication interruption/retry and the full group lifecycle.
- FE npm.cmd run typecheck and npm.cmd run lint: Passed.
- Expo web export with EXPO_PUBLIC_API_BASE_URL=/api: Passed.
- Activity lifecycle browser suite: Passed, including personal chat/planning/attendance/rating regression checks.
- npm.cmd run test:business:web: Passed, four isolated accounts through registration/rejection/resubmission, real two-group publication, employee consent/approval, deposits/plans/offers, attendance/completion/rating and immediate revocation; no browser runtime errors.
- npx.cmd expo-doctor: 17/18 checks passed; existing Expo/expo-location/expo-sharing patch-version mismatch remains.

### Remaining work

- Deposits are an audited manual ledger, without a payment gateway/refunds. Business verification is staff document review, without a government registry integration.
- Existing Expo/expo-location/expo-sharing patch mismatches remain; dependencies were not changed. Restart BE to create the new indexes and serve the matching FE export.

## 2026-10-26 - Allow the Expo web fallback port through backend CORS

### Summary

- Add explicit localhost/127.0.0.1 origins for port 8082 to backend defaults, the example environment and local CORS configuration. Preserve the existing allowlist; untrusted origins remain blocked.
- Restart the local backend so the browser on 8082 uses the updated configuration.

### Files changed

- BE: src/config/env.js, .env.example, local .env (untracked), tests/app.test.js, README.md.
- FE/BE development logs.

### Verification

- BE node --test tests/app.test.js: Passed, 5 tests, including 8082 CORS/preflight and rejection of an untrusted origin.
- Running BE GET /api/auth/google/config with Origin http://localhost:8082: HTTP 200 and matching Access-Control-Allow-Origin.
- Running BE OPTIONS /api/auth/login: HTTP 204 and matching allowed origin.
- FE checks not repeated: no FE implementation or dependencies changed.

### Remaining work

- None for the reported CORS failure; reload the browser page.

## 2026-10-26 - Enforce the cross-account activity and friendship journey

### Summary

- Refresh Match on entry/every 10 seconds without resetting swiped cards; remove mock fallback and implicit profile-region restriction. Keep self-hosted posts out of discovery and omit empty search queries.
- Replace immediate host-added friends with notified invitations requiring recipient acceptance. Pending invitations consume no seats or chat access; show decisions in Friends/Notifications and invitation status to the host.
- Require the configured minimum of confirmed accounts (including host, excluding anonymous companions), at least one approved public joiner, and a confirmed schedule before starting. Reserve enough account capacity and one outside-member place; API version checks prevent concurrent overbooking/stale transitions.
- Require complete attendance marking before manual finish; add friend actions to Summary/Rating. Never-started overdue activities expire without becoming completed/rateable.
- Restore the missing portal category-options endpoint encountered by the full backend suite and isolate activity write quotas by authenticated account.

### Files changed

- Added `src/components/ActivityInvitations.tsx`; updated activity creation/group/invite/lifecycle/management/plan controls, Summary/Rating/Friends/Notifications/Match/MainApp/Search, `activityApi.ts`, `activityService.ts`, `useRemote.ts` and activity types.
- Updated `tests/activity-lifecycle.web.cjs`, `tests/trip-social.web.cjs`, `tests/activity-input.test.cjs`.
- Companion BE changes: activity readiness helper, invitation persistence/endpoints, discovery/validation/scheduler rules, portal options, `tests/user-journey.test.js`, existing contract tests and `docs/activity-participation.md`.
- Updated `docs/DECISIONS.md` and both repositories' development logs.

### Verification

- BE `node --test`: Passed, 110 tests. Covers five identities, self exclusion, cross-account search, private consent, forbidden impersonation, no access before acceptance, minimum/outside-member gates, stale schedules, simultaneous acceptance/start, attendance, rating eligibility, friendship approval and expiry.
- `npm run test:trip:web`: Passed against temporary real BE/MongoDB. Includes activity creation in one browser while another already browses Match, invitation acceptance, draft restore, chat and reserved-seat conversion after consent.
- `npm run test:lifecycle:web`: Passed with independent host/invitee/public-joiner browser sessions. Includes disabled host actions, Match commitment/application, approval, group chat, schedule edits/confirmation, attendance, completion, rating, a targeted post-trip friend request/acceptance and expired UI.
- `npm run typecheck`, `npm run lint`, `node --test tests/activity-input.test.cjs` (2 tests), web export with `EXPO_PUBLIC_API_BASE_URL=/api`: Passed. Lint has no warnings.
- `npx expo-doctor`: 17/18 passed; existing patch mismatches remain for expo 57.0.30, expo-location 57.0.21 and expo-sharing 57.0.23.
- Reviewed FE/BE diffs and `git diff --check`; no generated exports or unrelated local changes included. Tests use cached MongoDB 8.2.6, isolated from application data.

### Remaining work

- Native-device verification and existing Expo patch alignment remain outstanding. Deploy/restart the matching FE and BE together; existing host-added memberships are preserved, and legacy groups may need capacity/companions adjusted to meet the new start rules.

## 2026-10-26 - Participation commitments, verification, friends and group plans

### Summary

- Require a participation commitment before sending a join request from Match or activity details. Add Friends to Profile and update chat action icons.
- Support six-digit verification paste/autofill, incomplete-code prevention and narrow-screen scrolling. Save the pending multi-select choice on Done; offer activity ages from 12 and validate age ranges.
- Keep capacity above existing members, companions and selected friends; allow multi-digit entry without premature clamping.
- Remove personal cost UI/budget filters and public trip plans. Create/edit plans through group chat; preserve legacy data and business pricing. Hide the bottom gallery for single photos and remove Match search.
- Open Google Maps car, motorcycle or walking directions from the embedded map.

### Files changed

- Added `src/components/JoinConfirmation.tsx`, `tests/activity-input.test.cjs`.
- Updated `CreateActivityScreen`, `ActivityDetailScreen`, `ActivitySearchScreen`, `ActivitySummaryScreen`, `FilterScreen`, `MainApp`, `MessagesScreen`, `ProfileViews`, `VerifyEmailScreen`.
- Updated activity/group/preview cards, number/selection/age controls, `PlanOverview`, `RouteMap`, chat actions, `activityService.ts`, `mapsService.ts`.
- Updated `tests/trip-social.web.cjs` and `docs/DECISIONS.md`.

### Verification

- `npm run typecheck`: Passed.
- `npm run lint`: Passed, no warnings.
- `node --test tests/activity-input.test.cjs`: Passed (2 tests: Google direction modes/coordinates and activity age/capacity validation).
- `EXPO_PUBLIC_API_BASE_URL=/api npx expo export --platform web`: Passed. Cleared Metro cache when switching from the configured local API URL for integration checks.
- `npm run test:trip:web`: Passed with cached MongoDB 8.2.6. Covers six-digit paste, incomplete-code guard, 320px verification layout, profile Friends navigation, friendship acceptance, draft preference restoration, single-photo gallery suppression, commitment cancellation/acceptance, group chat/files, host-only plan editing and Excel download; no browser runtime errors.
- `npx expo-doctor`: 17/18 passed; existing patch mismatches: expo 57.0.30 (expected ~57.0.31), expo-location 57.0.21 (~57.0.22), expo-sharing 57.0.23 (~57.0.24). Retried with network access after initial sandbox network failure.

### Remaining work

- Physical-device keyboard/autofill and Google Maps app handoff remain unverified. Existing Expo patch alignment remains a dependency follow-up.

## 2026-10-26 - Portal languages and app feedback, uploads and session isolation

### Summary

- Use the GoMate icon for the web favicon in exports and the running development page.
- Add a persistent English/Vietnamese portal selector across login, business verification, campaigns, location management, staff management and Admin review. Switching language preserves form state.
- Add the missing Google icon to native and fallback web sign-in buttons.
- Route screen/component action errors through a shared app-owned dialog while keeping inline feedback. Simplify introduction/name validation without relaxing server limits.
- Raise onboarding/avatar image selection to 10 MiB and align both multipart and base64 avatar APIs. Keep the user's existing Nickname placeholder edit.
- Remount account-owned app state on identity changes, synchronize browser storage events, and reject late responses from older sessions so Match preferences/favorites cannot leak across accounts.
- Backend now automatically completes overdue activities and sends deduplicated in-app reminders/completion notices; see the backend scheduler and lifecycle documentation.

### Files changed

- `App.tsx`, `app.json`, `src/services/api.ts`, `src/services/feedback.ts`, `src/services/activityService.ts`
- `src/components/AppFeedback.tsx`, `src/components/GoogleLoginButton*.tsx`, `src/components/WebWorkspace.web.tsx`
- Screen/component action-feedback state, including `src/screens/ProfileViews.tsx`, `ProfileScreen.tsx`, `AuthScreen.tsx`, `MainApp.tsx`, `CreateActivityScreen.tsx` and `ChatScreen.tsx`
- `src/i18n/LanguageContext.tsx`, `src/i18n/portalTranslations.ts`, `src/gomate-portal/usePortalText.ts` and portal views
- `tests/ui-experience.web.cjs`, `docs/DECISIONS.md`, `docs/DEVELOPMENT_LOG.md`

### Verification

- `npm run typecheck`: Passed.
- `npm run lint`: Passed without warnings.
- `node tests/ui-experience.web.cjs`: Passed against localhost:8081 with API fixtures; checks portal language persistence/form preservation, favicon, account switching with a delayed old response, activity validation popup and Google icon/feedback.
- `npx expo export --platform web --output-dir dist`: Passed.
- `npx expo export --platform android --output-dir dist-native`: Passed.
- Backend focused checks: 20/20 passed for profile/avatar limits, Match isolation, lifecycle and scheduler. Expanded backend suite: 103/104 passed; the existing business-events test expects `/api/portal/options`, absent from backend HEAD.
- `npx expo-doctor`: 20/21 passed; existing patch mismatches remain for expo, expo-location and expo-sharing.

### Remaining work

- Physical-device interaction and external Google OAuth were not exercised. Browser regression uses isolated API fixtures.
- Existing backend `/api/portal/options` test mismatch and Expo patch updates remain separate follow-up work.

## 2026-10-26 - Merge tan-business into fe-ui2

### Summary

- Fast-forward `fe-ui2` from `4562592` to `a1ab937` using `origin/tan-business`; no conflicts.
- Integrate the business portal verification, staff review, location library, campaign dashboard, and multi-group composer work.

### Files changed

- `src/gomate-portal/{ActiveCampaignDashboard,AdminBusinessReview,BusinessStaffManagement,BusinessVerificationForm,ConnectedPortal,LocationLibrary,MultiGroupPostComposer}.jsx`
- `src/gomate-portal/connected-portal.css`
- `tests/business-demo.web.cjs`
- `docs/DEVELOPMENT_LOG.md`

### Verification

- `npm run typecheck`: Passed.
- `npm run lint`: Passed.
- `git diff --check`: Passed.
- `git merge-base --is-ancestor origin/tan-business HEAD`: Passed.
- `npx expo-doctor`: 20/21 checks passed; dependency check reports patch mismatches for expo (57.0.30 versus ~57.0.31), expo-location (57.0.21 versus ~57.0.22), and expo-sharing (57.0.23 versus ~57.0.24).

### Remaining work

- Review the Expo patch updates separately; dependencies were not changed as part of this branch merge.

## 2026-10-23 - Expand Admin business verification and staff review

### Summary

- Add an Admin business application table and detail modal for company identity, tax ID, address, representative contacts, license document download, review notes, and decisions.
- Add a Business Staff approvals table with group assignments, pending/approved/rejected filters, and mock approve/reject actions.
- Keep the existing Staff reviewer view and API-backed business application decisions.

### Files changed

- `src/gomate-portal/AdminBusinessReview.jsx`
- `src/gomate-portal/ConnectedPortal.jsx`
- `src/gomate-portal/connected-portal.css`
- `docs/DEVELOPMENT_LOG.md`

### Verification

- `npm run typecheck`: Passed.
- `npm run lint`: Passed.
- `git diff --check`: Passed.

### Remaining work

- The current application API does not persist tax ID, address, or representative fields, so the Admin view displays those details when supplied and indicates when they are absent. Business Staff approval requests and decisions are mock state until a backend endpoint is available.

## 2026-10-23 - Add active campaign and group dashboard

### Summary

- Add an Active Campaign / Group Dashboard for Business operations with group selection, deposit progress, paid/pending member tracking, total collected deposits, and schedule readiness.
- Add an interactive Lịch trình timeline builder with add/edit/delete, reorder controls, notes, and quick-select Location Library pins.
- Add Special Offer notification composition, preview, recipient count, send feedback, and recent notification history.

### Files changed

- `src/gomate-portal/ActiveCampaignDashboard.jsx`
- `src/gomate-portal/ConnectedPortal.jsx`
- `src/gomate-portal/connected-portal.css`
- `docs/DEVELOPMENT_LOG.md`

### Verification

- `npm run typecheck`: Passed.
- `npm run lint`: Passed.
- `git diff --check`: Passed.
- `npx expo-doctor`: Existing baseline remains 20/21 checks; `expo`, `expo-location`, and `expo-sharing` have patch versions older than the SDK expectation.

### Remaining work

- Deposit records, itinerary edits, and notifications are mock Business/Business Staff state; the current portal API has no group-management, payment, or notification endpoint.

## 2026-10-22 - Add Business Staff and multi-group post tools

### Summary

- Add Business Staff account request UI with contact details, group assignments, edit/delete actions, and the explicit Pending Admin (Minh) Approval status.
- Replace the Business create-post screen with one promotional post and multiple separately configured group drafts, including Location Library selection and per-person deposit amounts.
- Keep generated group and staff account records in mock frontend state; submit the main post through the existing portal API.

### Files changed

- `src/gomate-portal/BusinessStaffManagement.jsx`
- `src/gomate-portal/MultiGroupPostComposer.jsx`
- `src/gomate-portal/ConnectedPortal.jsx`
- `src/gomate-portal/connected-portal.css`
- `docs/DEVELOPMENT_LOG.md`

### Verification

- `npm run typecheck`: Passed.
- `npm run lint`: Passed.
- `npx expo-doctor`: 20/21 checks passed; the existing `expo`, `expo-location`, and `expo-sharing` patch versions do not match the expected SDK patches.
- `git diff --check`: Passed.

### Remaining work

- Business Staff accounts, generated groups, and deposit configuration are not persisted by the current portal API; only the promotional post is submitted to the supported endpoint.

## 2026-10-22 - Expand business verification and add location library

### Summary

- Expand the business verification form with tax ID, detailed address, license upload, and representative contact details while keeping the existing application API payload compatible.
- Add a Business-only Location Library with mock address search/pinning, branch add/edit/delete, and saved-location reuse in event creation.

### Files changed

- `src/gomate-portal/ConnectedPortal.jsx`
- `src/gomate-portal/BusinessVerificationForm.jsx`
- `src/gomate-portal/LocationLibrary.jsx`
- `src/gomate-portal/connected-portal.css`
- `tests/business-demo.web.cjs`
- `docs/DEVELOPMENT_LOG.md`

### Verification

- `npm run typecheck`: Passed.
- `npm run lint`: Passed.
- `npm run test:business:web`: Could not start; the sibling `GoMate-BE` checkout is missing `src/database/workshop-demo.js`.
- `npx expo-doctor`: 20/21 checks passed. The existing Expo SDK patch versions for `expo`, `expo-location`, and `expo-sharing` do not match the currently expected patches.
- `git diff --check`: Passed after the final UI and test edits.

### Remaining work

- Verification details beyond company/category/website/license and all branch locations are mock frontend state; the current portal API does not persist those added fields or locations. `useMapAPI` is a local mock and does not call a live map provider.

## 2026-10-19 - Merge partner web UI, improve group tools and ship a real business demo

### Summary

- Commit prior lifecycle work, then merge `origin/htan-ui-web` into `fe-ui2` without conflicts. Reuse its portal design foundations in a live `/portal` workspace; isolate web DOM/CSS from native bundles and keep the original mock module as a visual preview.
- Move the shared-content library to the top-right chat header and add working menu actions for plans, members, host management, refresh and link sharing. Preserve composer contents and host-only phase timelines.
- Replace plain attendance controls with progress/counts, filters, avatars/status chips and explicit selected states. Redesign Plans with appointment, price/roster, itinerary and document cards, retaining versioned editing/downloads.
- Add verified business offer identity/green card borders, discount percentages and terms. Connect staff-reviewed events to app discovery/membership/chat. Use official schedules and disable anonymous companions/host-added friends for business groups on both client/API.
- Add independent-session `/demo` login and setup guide, idempotent local demo seed, activity keyword search and shareable links. Seed only demo-owned accounts/data; use normal backend authorization.

### Files changed

- `App.tsx`, `package.json`, `README.md`, `src/gomate-portal/*`, `src/components/{ChatHeaderActions,AttendanceRoster,PlanOverview,BusinessIdentity,WebWorkspace*}.tsx`.
- Chat/group/attendance/plan/detail/search/Match screens and components, activity DTO mapping/model, `tests/{business-demo,activity-lifecycle,trip-social}.web.cjs`.
- `docs/{DEMO_GUIDE,ACTIVITY_CHAT_AND_MANAGEMENT,DECISIONS,DEVELOPMENT_LOG}.md`; companion BE changes are on its `fe-ui2` branch.

### Verification

- Full BE suite: 103/103 passed, including verification/publication, consumer spoof prevention, guest/friend restrictions, ordinary join approval/chat and attendance/rating. Fixed local dependency installation (missing Leaflet); no source workaround for the previous map timeout.
- `npm run test:web`, `test:lifecycle:web`, `test:trip:web`, `test:community:web`, `test:maps:web`, `test:business:web`, `test:integration`: Passed. Nine native-session/API-URL/profile-date checks passed. Browser suites reported no runtime errors.
- `npm run typecheck`, `npm run lint`: Passed; `npx expo-doctor`: 21/21. Expo web and Android exports passed.
- Business browser integration covered new application → staff approval → event/offer creation → publication → searchable verified card → join approval → cross-session chat; checked 360/390/768/1440 px layouts and header library/menu.
- Inspected attendance, business plan, Chat and mobile/desktop portal screenshots. Actual installed Chrome and Edge independently logged into host/member accounts and found demo activities against the local running API. Repeated local seed preserved the same future sample activity IDs. `git diff --check`: Passed.

### Remaining work

- Physical iOS/Android keyboard/share-sheet verification. Prices/offers remain informational; there is no payment flow. Legacy text-only business announcements remain portal-only until recreated with event details.

## 2026-10-19 - Keep the timeline inside host Management

### Summary

- Move the activity timeline into host Management only. Chat now shows a compact informational notice for both host and members, with no timeline or lifecycle action buttons. Remove timelines from progress and summary as well.
- Keep progress and summary/review access in Plans so participants can still follow and rate the activity. Preserve schedule confirmation, start, attendance and completion in host controls.

### Files changed

- `src/screens/{GroupScreen,ActivityProgressScreen,ActivitySummaryScreen}.tsx`, `src/components/{ActivityManagementPanel,ActivityPlanPanel}.tsx`, `src/i18n/LanguageContext.tsx`.
- `tests/activity-lifecycle.web.cjs`, `docs/ACTIVITY_CHAT_AND_MANAGEMENT.md`, `docs/DECISIONS.md`.

### Verification

- `npm run typecheck`, `npm run lint`: Passed. `npx expo-doctor`: 21/21 passed. Expo web export: Passed.
- `npm run test:lifecycle:web`: Passed: timeline visible only in host Management across all phases; informational Chat notices for both roles; no timeline in Plans, Members, attendance or summary; rating remains accessible through Plans. Checked chat/composer at 360/390/768/1440 px and inspected Chat/Management screenshots.
- `npm run test:trip:web`: Passed, including schedule confirmation, chat/media/composer, shared plans/Excel and drafts. Both suites reported no browser runtime errors. `git diff --check`: Passed.

### Remaining work

- Physical iOS/Android device verification.

## 2026-10-19 - Visible activity timeline and next host actions

### Summary

- Keep a four-stage, API-backed timeline above the group tabs. Offer schedule confirmation/start directly from chat and put the next host action at the top of Management. Link Plans to these controls and refresh group state after saving a plan.
- Direct running hosts to attendance and a visible finish action, warn about unmarked members at confirmation, and retain the timeline in progress/summary. Preserve existing server rules and distinguish schedules that were never confirmed. Include English UI translations.

### Files changed

- `src/components/{ActivityLifecyclePanel,ActivityManagementPanel,ActivityPlanPanel}.tsx`.
- `src/screens/{GroupScreen,ActivityProgressScreen,ActivitySummaryScreen}.tsx`, `src/i18n/LanguageContext.tsx`.
- `tests/activity-lifecycle.web.cjs`, `tests/trip-social.web.cjs`, `package.json`, `docs/ACTIVITY_CHAT_AND_MANAGEMENT.md`, `docs/DECISIONS.md`.

### Verification

- `npm run typecheck`, `npm run lint`: Passed. `npx expo-doctor`: 21/21 checks passed. Expo web export: Passed.
- `npm run test:lifecycle:web`: Passed with temporary MongoDB and host/member/joiner browser sessions: two initial account members, approval/chat, plan save, schedule confirm/cancel/reload/reset, start/cancel, attendance warning/persistence, completion and real rating. Checked 360/390/768/1440 px layouts and composer visibility; no browser runtime errors.
- `npm run test:trip:web`: Passed after updating the schedule assertion to the new timeline; includes plan/Excel, shared chat/media, attachments and draft regressions. `npm run test:community:web`: Passed, including persisted ratings and host reviews.
- Reviewed mobile screenshots for chat timeline, host management, attendance and summary. `git diff --check`: Passed. Local frontend and API health returned HTTP 200.

### Remaining work

- Physical iOS/Android device verification. The full web smoke suite has a previously observed unrelated map iframe timeout; targeted lifecycle and related browser suites passed.

## 2026-10-16 - Account drafts, companion typing, inline chat tools and member portraits

### Summary

- Fix companion input sizing and apply per-person edits against current state. Add explicit create-draft saving/resume at the same editor step, with photos/Excel, account isolation, retry/conflict feedback, confirmed discard and publication cleanup.
- Keep the chat composer visible above an inline attachment panel that replaces the keyboard; default to a single compact input row, put the plus on the right and remove attachment-panel headers/limit copy. Preserve typed text and file/location flows.
- Replace the fixed participant portrait stack with current profile avatars and neutral silhouettes for missing/failed images/reserved seats. Add five full demo friends to the requested account through the backend script.

### Files changed

- `src/screens/{CreateActivityScreen,ChatScreen}.tsx`, `src/components/{CompanionCards,CreateGroupFields,ChatContent,ProfileAvatar}.tsx`, `src/components/home/HomeComponents.tsx`.
- `src/services/{activityDraftService,api,activityApi}.ts`, `src/data/activities.ts`, `tests/{trip-social.web,mapbox-maps.web}.cjs`, `docs/DRAFTS_AND_CHAT_COMPOSER.md`.

### Verification

- BE full suite: 93 passed; final focused draft/friend/member-avatar checks passed after additional validation. Large draft round trip exceeded the BSON document limit and used GridFS successfully.
- Trip UI integration passed real keyboard typing, save/resume after route changes/reload, media/Excel, incomplete drafts, confirmed/cancelled discard and publication cleanup, compact composer geometry, retained input above icons, chat/media and profile/fallback home avatars; no browser runtime errors.
- Web smoke and FE/BE service integration passed. Maps UI integration passed unchanged lookup/map/filter/chat-location flows with provider doubles. Typecheck/lint passed; Expo Doctor 21/21. Web and Android/iOS bundle exports passed.
- Configured database verified: five new demo profiles, accepted friendships and different avatar URLs for `pminh2004@gmail.com`; all five portrait URLs returned HTTP 200.

### Remaining work

- Physical-device keyboard/attachment-panel and WebView testing. One explicitly saved unfinished create draft per account; not background autosave or multiple-draft management. Production should reconcile GridFS orphans after interrupted writes.

## 2026-10-16 - Use VIETMAP autocomplete with Mapbox maps/routes

### Summary

- Switch configured address/POI lookup to VIETMAP Autocomplete v4/Place v4 while preserving Mapbox map rendering and Directions. Apply to inline activity address suggestions, modal lookup in forms/filters and chat sharing.
- Show VIETMAP lookup attribution and generic search labels; map/route attribution remains Mapbox. Preserve existing debounce, stale-response protection, coordinate clearing on manual edits and manual pin selection.
- Configure the supplied Services key only in ignored BE `.env`; expose search-provider metadata without its key. Update hybrid setup instructions, fallback behavior and release notes.

### Files changed

- `src/services/mapsService.ts`, `src/components/{PlacePicker,AddressAutocomplete,MapAttribution,MapAttribution.web}.tsx`.
- `tests/{mapbox-maps.web.cjs,mapbox-live.web.cjs}`, `.env.example`, README, Maps setup/release docs and `docs/DECISIONS.md`.

### Verification

- Supplied VIETMAP key: real Autocomplete v4 and Place v4 returned HTTP 200, including current ward/province names and valid coordinates. `npm run test:maps:live`: passed hybrid lookup, key exclusion from public config, Mapbox driving/walking and real SDK/tiles/radius/pin/route/attribution checks.
- `npm run test:maps:web`: passed FE/BE/MongoDB integration with provider doubles, including VIETMAP attribution, current ward auto-fill, inline race/error/empty states, activity and chat persistence, Mapbox modes and responsive layouts. Asserted no Mapbox Geocoding calls.
- `npm run test:integration`: passed. BE `npm test`: 91 tests passed, including provider secrecy, ownership/session binding, opaque ref_id round-trip, retryable errors and independent VIETMAP/Mapbox configuration.
- `npm run typecheck`, `npm run lint`: passed without warnings after import cleanup. `npx expo-doctor`: 21/21. Web and Android/iOS bundle exports passed.

### Remaining work

- Physical-device WebView/keyboard/GPS and deployed domain/token verification. Provider availability, quota and search coverage depend on the respective accounts/services.

## 2026-10-16 - Suggest addresses directly while typing

### Summary

- Add inline Mapbox address suggestions under the activity Address input for both creation and editing, without opening a separate picker. Select a result to fill the address, matching region fields and coordinates.
- Debounce typing by 450 ms, suppress short queries, ignore late results, and show loading, empty, retry and dismiss states. Scroll suggestions into view and bound the results list so it remains usable on small screens. Keep manual entry available; editing an address clears its old coordinates to prevent publishing a mismatched pin.
- Avoid searches for externally filled/confirmed addresses; keep existing map picker, GPS and chat flows.

### Files changed

- `src/components/AddressAutocomplete.tsx`, `src/components/FormField.tsx`, `src/screens/CreateActivityScreen.tsx`.
- `tests/mapbox-maps.web.cjs`, `docs/MAPBOX_SETUP.md`.

### Verification

- `npm run typecheck`, `npm run lint`, `npx expo-doctor`: passed; doctor 21/21. Web export passed.
- `npm run test:maps:web`: passed actual FE/BE/MongoDB with Mapbox doubles. Covers inline debounce/selection, old-coordinate removal, empty results, denial/retry and out-of-order responses, plus activity publication, map modes, filter and chat regressions. No browser runtime errors.
- New UI uses the existing Maps endpoints; no provider/config/backend changes or extra live provider requests were needed in this task.

### Remaining work

- Physical-device keyboard/tap/GPS verification. Address search remains address geocoding, not a POI directory.

## 2026-10-16 - Switch maps to Mapbox and verify the supplied token live

### Summary

- Replace Google map dependencies with Mapbox GL JS, permanent address geocoding and driving/walking Directions in activity creation, Match, filters, details and chat locations. Rename provider-specific UI/types to reusable names; keep public attribution and an OSM external link/fallback.
- Configure the supplied public token only in ignored backend `.env`. Verify real map style/tiles and APIs; no real token is written into source/tests/docs. Preserve unrelated profile/chat work and Google OAuth settings.
- Confirm activity address/province and manually adjusted coordinates persist after publishing; shared chat locations remain durable. Use permanent address results rather than temporary Search Box data; document address-only search and device/deployment limits.

### Files changed

- `src/services/mapsService.ts`, `src/components/{PlacePicker,MapAttribution,RouteMap,LocationField,ActivityMap}.tsx`, `src/components/MapAttribution.web.tsx`, chat and form callers.
- `tests/{mapbox-maps.web.cjs,mapbox-live.web.cjs,fixtures/mapbox-maps.js}`, `package.json`, `.env.example`, README and map/release documentation. Supersede previous uncommitted Google map fixture/UI files.

### Verification

- Live provider: map style, permanent Geocoding, DRIVE and WALK endpoints returned 200 with the supplied token. Opt-in `npm run test:maps:live` passed real GL JS rendering/tiles, click pin, radius, route overlay/clear, logo and attribution at 390/1000px; screenshots in the temporary test artifact folder.
- `npm run test:maps:web`: passed actual FE + BE + MongoDB with provider doubles, including activity publication/persisted coordinates, GPS/modes, errors/retry, chat persistence and 390/768/1440px layouts.
- `npm run test:web`, `npm run test:trip:web`, `npm run test:integration`: passed existing auth/profile, creation, lifecycle, companion, chat, attachment and OSM/GPS regressions.
- `npm run typecheck`, `npm run lint`, `npx expo-doctor`: passed; doctor 21/21. Expo web and Android/iOS bundle exports passed. Backend full suite passed 88 tests; focused Maps suite passed 3 tests after final malformed-response/cache/fallback checks.

### Remaining work

- Test WebView/GPS on physical Android/iOS and deployed domains. Mapbox request/map-load usage may be billable; permanent geocoding and persisted POI search have different eligibility/rights. Current search is addresses, not a saved POI directory.

## 2026-10-16 - Google Maps, Places and Routes integration

### Summary

- Add a Google Maps JavaScript map document using the existing iframe/WebView bridge, Advanced Markers, radius circles and route polyline messages. Preserve OSM when not configured and scope provider CSP changes to the map document.
- Add debounced Vietnam place search/confirmation with a shared Autocomplete/Details session, provider attribution and address/province matching for activity/filter forms. Allow selecting a place to share in chat and opening chat locations in an in-app map.
- Connect explicit GPS-based driving/walking route calculation, distance/time estimates and external Google Maps directions. Clear stale route overlays on a new attempt; include Google's required walking-route notice. Keep Match geographic radius/distance behavior.
- Protect server-side provider calls with authentication, strict contracts, fixed URLs, minimal field masks, rate/time limits and sanitized errors. Add two-key setup instructions without modifying user keys/billing.

### Files changed

- New `src/services/mapsService.ts`, `src/components/{GooglePlacePicker,GoogleAttribution,GoogleAttribution.web,RouteMap}.tsx`.
- Existing map components/types, location fields, create/filter/detail/Match/chat screens and components, package script and FE env example/README.
- `tests/google-maps.web.cjs`, test-only SDK fixture, `docs/GOOGLE_MAPS_SETUP.md`, release-gap/decision/log docs and the corresponding BE maps API/document/config/tests.

### Verification

- Typecheck/lint passed; Expo Doctor 21/21 passed. Web and Android/iOS bundle exports passed.
- `npm run test:maps:web`: passed with actual FE/BE/MongoDB and stubbed Google SDK/API; checks picker/session/auto-fill, pin/polyline bridge, modes/GPS, no-route/denial/retry, chat and 390/768/1440px layouts. No browser runtime errors.
- Existing `npm run test:web`, `npm run test:trip:web`, `npm run test:integration`: passed, including OSM fallback and prior profile/chat/activity behavior.
- BE full `npm test`: 88 passed; focused Maps tests passed after bounded provider validation changes.
- `git diff --check`: passed.

### Remaining work

- BE key-presence check found both Maps keys unset. User must enable billing/APIs, create/restrict keys, put them in BE `.env`, restart BE and reload app, following `GOOGLE_MAPS_SETUP.md`.
- Live Google calls, origin/IP restrictions and physical-device WebView/GPS behavior are not verified by provider doubles. Production terms/privacy, retention policy, custom map styling/ID and provider quotas remain setup/release work.
- Existing deferred OAuth/business website and other non-map release gaps remain unchanged.

## 2026-10-15 - Limit profile actions to the account profile page

### Summary

- Keep Edit Profile and Preview Profile in the avatar section of the account profile page containing Settings.
- Revert the added host-avatar prop/mapping in activity creation preview per the user's clarification. Preserve the other chat, companion, Match and profile improvements.
- Remove the browser assertion that required the reverted preview avatar; retain the profile-hero layout assertions.

### Files changed

- `src/components/ActivityDraftPreview.tsx`, `src/screens/CreateActivityScreen.tsx`, `tests/trip-social.web.cjs`, `docs/CHAT_AND_RELEASE_GAPS.md` and this log.

### Verification

- `npm run typecheck`, `npm run lint`: passed. `npx expo-doctor`: 21/21 passed.
- Web export and `npm run test:trip:web`: passed, including profile-hero actions and activity preview; no browser runtime errors.
- `git diff --check`: passed.
- Activity draft preview component restored to its pre-task content.

### Remaining work

- Existing release gaps remain documented in `CHAT_AND_RELEASE_GAPS.md`.

## 2026-10-15 - Private chat media, companion cards and profile/Match refinements

### Summary

- Move edit/preview actions into the avatar hero. Show the current host avatar in the creation preview and real Match/detail responses, including legacy avatar fallback.
- Add photo/video/camera/file/GPS attachment selection, removable draft items, content-aware send retries, image/video viewers, authenticated downloads and a paged per-conversation media/file/link/location library. Preserve immediate early group chat and existing access checks.
- Add named companion cards in creation and Members, with host editing, persisted private name/note fields, version protection and atomic conversion of reserved places to account membership. Show which named places an add-friends action will consume. Remove the duplicate member action from the group management tab.
- Build additional diffuse lighting, lavender/blue color fields and curved layers behind Match while preserving the existing 5% card reduction.
- Install expo-video using Expo CLI, enable explicit photo-camera permission, and align Expo to the SDK 57.0.30 patch required by Expo Doctor. Add release-gap recommendations and API documentation without enabling deferred providers.

### Files changed

- New `src/components/{ChatContent,CompanionCards}.tsx`, `src/services/chatContent.ts`, and corresponding BE chat/companion APIs, persistence, indexes and tests.
- Chat/profile/activity screens, `AddActivityFriends`, creation fields/preview, Match primitives/background, `ScreenHeader`, service/domain types, Expo config and package/lock.
- `tests/trip-social.web.cjs`, local CC0 MDN video fixture/source attribution, `docs/CHAT_AND_RELEASE_GAPS.md`, account notes and decision log.

### Verification

- `npm run typecheck`, `npm run lint`: passed. `npx expo-doctor`: 21/21 passed.
- `npm run test:integration`: passed against real FE services and temporary MongoDB-backed BE.
- `npm run test:trip:web`: passed two-account creation/preview, companion save/conversion, early group/direct chat, image/video/file/GPS messages, library filters/download, reload and 390/768/1440px layouts; no browser runtime errors.
- `npm run test:web`, `npm run test:community:web`: passed existing authentication/profile/Match/map/lifecycle and community/privacy/notification flows.
- `node --test tests/native-session.test.cjs`: 4 passed. Web and Android/iOS exports passed; no native folders were generated.
- BE full `npm test`: 86 passed, including content validation, privacy, byte ranges, retries, member revocation and named companions.
- `git diff --check`: passed.

### Remaining work

- Native binaries must be rebuilt for expo-video/camera configuration. No physical device was attached; camera/GPS/keyboard and real-device playback QA remain.
- Media is bounded to 10 MB/file and 4/message. Private object storage/thumbnails/transcoding, durable offline sends, voice recording/calls and live location are follow-ups, not included capabilities.
- Google Maps Platform setup, push while the app is closed, Excel row import and other priorities are detailed in `CHAT_AND_RELEASE_GAPS.md`. Google Login provider setup and the separate business website remain deferred as instructed.

## 2026-10-15 - Package shared workspace launcher for Git publication

### Summary

- Preserve root-level dev:all tooling in FE because the shared parent directory is not a Git repository. Keep FE and BE repositories independent.

### Files changed

- `tooling/README.md`, `tooling/workspace-root/` (root package/lock, ignore file, README and root development log), and this entry.

### Verification

- Launcher package/lock parse and version agreement checked; copied files match the workspace originals.
- FE/BE `git diff --check`: passed. Existing functional validation is recorded in the preceding task entries; no application source changed for publication packaging.

### Remaining work

- Separate business website remains deferred per user instruction.

## 2026-10-15 - Connected daily account, community and safety flows

### Summary

- Persist native sessions in SDK-compatible SecureStore with async startup/retry, serialized writes/deletion, corrupt-data recovery and expired-session clearing. Persist language selection locally on web/native.
- Connect password change to BE with empty fields, validation and sign-out after all sessions are revoked.
- Replace rating, notification, blocked-account and settings prototypes with actual account-scoped APIs. Ratings require completed activity membership and present/late attendance, persist once and update real host reputation.
- Add report submission/history plus a BE admin-only moderation API. Blocking is enforced bilaterally for direct chat/invitations/search/discovery and preserves existing groups.
- Save direct-message, invitation, search-visibility and in-app notification preferences on BE. Give settings subpages URL/reload/history support. Remove fake security/Plus/theme controls and dead safety menu actions.
- Consume authenticated SSE chat events with reconnect/poll fallback and queued refresh to avoid missed updates. Replace always-on unread dots and invented profile statistics/verification icons with actual data.

### Files changed

- `App.tsx`, `app.config.js`, package/lock and `src/services/{api,googleLogin,communityService,chatEvents,activityApi,profileService}.ts`.
- `src/screens/{SettingsScreen,NotificationsScreen,RatingScreen,MemberProfileScreen,MainApp,ChatScreen,ActivityProgressScreen,MatchScreen}.tsx`.
- `src/components/{BlockUserButton,UnreadDot,BottomNav,MemberProfileModal}.tsx`, home/Match components and language context.
- `tests/{community.web,native-session.test}.cjs`; supporting BE community module, event hooks, indexes and authorization tests.
- `docs/ACCOUNT_COMPLETION.md`, README, workflow/decision logs and matching BE docs.

### Verification

- BE full `npm test`: 81 tests passed; final focused activity/community/trip tests: 18 passed after notification hook/read-state updates.
- Native session tests: 4 passed (restore, write/delete ordering, corrupt data, failure/retry and expired tokens), with a mocked secure-storage adapter.
- FE real-service integration passed. Existing full web regression and two-account trip/chat regression passed.
- New two-account community browser flow passed settings persistence, real notifications/deep links/approval, rating persistence, report history, bilateral block/unblock and password change/new login; no browser runtime errors. Settings URL/history assertions are included.
- TypeScript and lint passed. Expo Doctor: 21/21. Web/Android/iOS bundle exports passed.
- `git diff --check`: passed; no unrelated work reverted, no live account roles changed.

### Remaining work

- OS push delivery, physical-device QA and separate business website remain outside these daily-account flows. Google provider configuration remains deferred per user instruction.
- Optional chat media, Excel row import, identity-document verification, dark theme and paid Plus require separate feature/provider work; unsupported prototype controls are not presented as working features.
- Notifications are secondary writes with logged failure isolation; a durable outbox/worker is a future production reliability improvement.

## 2026-10-15 - Personal publishing, searchable categories and group chat workspace

### Summary

- Remove consumer business publishing and force personal payloads; enforce rejection independently in BE.
- Expand FE/BE category choices to 56; add searchable selection and six popular shortcuts.
- Add relative registration deadline presets (6/12/24 hours) and custom selection, recalculated from start time. Move validation/API errors beside the fixed Continue/Publish footer.
- Replace host management button stacks with an activity selector, status/capacity/request overview, schedule confirmation, action rows, request decisions and useful empty states.
- Open real chat immediately inside the group; keep Chat/Plan/Members tabs above it and show host-only Management. Reuse the same management panel across standalone/group routes.
- Redesign inbox with search, unread/group/direct filters, actual avatars/unread counts/schedule metadata. Refine chat bubbles, day separators, sender names, retry and fixed composer; keep persisted messaging/pagination and membership enforcement.

### Files changed

- New `src/components/ActivityManagementPanel.tsx` and `RegistrationDeadlineField.tsx`.
- `src/screens/CreateActivityScreen.tsx`, `GroupScreen.tsx`, `MessagesScreen.tsx`, `ChatScreen.tsx`, `ManageActivitiesScreen.tsx`, `MembershipViews.tsx`, `MainApp.tsx`, `ActivityProgressScreen.tsx`.
- `src/components/ActivityPlanPanel.tsx`, `src/data/activityOptions.ts`, activity/chat services, FE integration/browser tests.
- `docs/ACTIVITY_CHAT_AND_MANAGEMENT.md`, existing workflow docs, README and decision log; matching BE routes/contracts/tests documented in BE.

### Verification

- BE `npm test`: 75 tests passed, including consumer business denial, host/version checks, confirmation invalidation, early chat and inbox ordering.
- FE `npm run test:integration`: passed with actual BE/MongoDB, including relative deadline offsets/recalculation.
- `npm run test:web`: passed edit/start/attendance/complete/delete and existing auth/profile/Match regressions.
- `npm run test:trip:web`: passed two-session creation/category search, nearby validation error, relative deadline persistence, host approval/confirmation, member role tabs, early persistent chat, friends, shared plans and Excel download. Screenshots checked at 390/768/1440px.
- `npm run typecheck`, `npm run lint`: passed. `npx expo-doctor`: 21/21 passed.
- Web, Android and iOS bundle exports passed. `git diff --check`: passed.

### Remaining work

- Physical-device keyboard and safe-area behavior still needs iOS/Android device testing. Text messaging is supported; no chat file/media uploads were added.
- Business publishing remains the responsibility of the separate business website; this consumer API does not grant website access based on request headers.

## 2026-10-15 - Resolve development API from the current Expo host

### Summary

- Fix the stale LAN IP in local API configuration (old 10.87.28.73, current 192.168.2.237).
- With no explicit API URL, use the Expo host on native and browser host on web during development, with API port 3000. Keep explicit URLs and production same-origin web behavior.
- Add expo-constants as a direct SDK-compatible dependency.

### Files changed

- `src/services/api.ts`, `src/services/apiUrl.ts`, `tests/api-url.test.cjs`.
- `.env.local` (ignored), `.env.example`, `package.json`, `package-lock.json`, `README.md`, and development/decision logs.

### Verification

- API URL regression tests: 3 passed (LAN changes, web development/production, overrides and emulator fallback).
- `npm run typecheck`, `npm run lint`: passed.
- `npx expo-doctor`: 21/21 checks passed.
- Backend LAN `/api/health` and browser fetch from localhost:8081: HTTP 200, status ok.
- Fresh Metro web bundle on temporary port 8091: passed. Browser API requests from that extra port were blocked by the existing CORS allowlist, as expected; port 8081 was verified instead.
- Automated login interaction was not completed (selector/navigation timeouts); no successful login claimed.

### Remaining work

- Reload/restart the existing Expo session to replace its embedded old environment URL. A physical-device connection was not available to verify.
- Remote APIs, nonstandard API ports and Expo tunnels require an explicit URL; extra web ports require a matching BE CORS_ORIGIN.

## 2026-10-15 - Four-step activity creation, trip planner and persistent friends/chat

### Summary

- Simplify creation to four steps with a shared date-range calendar, separate
  hour/minute wheels, profile-default city, searchable province/ward and optional
  district landmark wheels. Reuse the wheel fields in filters and group preferences.
- Add simple capacity steppers, offline companion reservations and selection of
  accepted GoMate friends. Remove the free-form join-requirements input; add age
  ranges checked on BE. Merge estimated costs and cost notes into group setup.
- Build a structured trip editor with up to 60 dated steps, a starter template,
  HTTPS Sheets/plan links and an Excel attachment up to 3 MB. Host edits shared
  plans from the activity/chat area with version checks; others view/download.
- Preview the real Match card with media, schedule, cost and itinerary. Reset
  scroll when changing steps, show the end timestamp and fix zero-width thumbnails.
- Add friend search/requests/recipient decisions/removal, member-profile friend
  actions, direct chat and early activity chat. Replace sample messages and group
  plans/expenses with real API data; persist messages, read markers and retry IDs.
- Count offline companions without granting chat identities. Allow hosts to add
  accepted friends and convert reserved seats without double counting. Read current
  membership/reservation data when returning to member management.

### Files changed

- `src/screens/{CreateActivityScreen,FilterScreen,GroupScreen,ChatScreen,MessagesScreen,FriendsScreen,MainApp,MembershipViews,ActivityDetailScreen}.tsx`
- `src/components/{DateTimeField,SelectionField,NumberStepper,ActivityLocationFields,CreateGroupFields,ActivityChoices,ActivityDraftPreview,TripPlanEditor,TripPlanView,ActivityPlanPanel,AddActivityFriends,FriendRequestButton,MemberProfileModal}.tsx`
- `src/components/match/MatchPrimitives.tsx`, `src/data/{regions.json,legacyDistricts.json,regionOptions.ts,activities.ts}`
- `src/services/{planService,chatService,friendService,activityService,activityApi,filterService}.ts`
- `app.json`, `package.json`, `package-lock.json`, `tests/{trip-social.web,web.smoke}.cjs`
- `docs/ACTIVITY_CREATION_AND_FRIENDS.md`, `docs/DECISIONS.md`, `README.md`
- BE: activity-plan validation, capacity/membership and friend repositories/routes,
  age checks, chat metadata, public field projections and friend indexes;
  `tests/trip-social.test.js`.

### Verification

- `npm run typecheck`, `npm run lint`: Passed.
- `npx expo-doctor`: Passed, 21/21 checks.
- Web export with `EXPO_PUBLIC_API_BASE_URL=/api`: Passed.
- `npx expo export --platform all` to a temporary folder: Passed for web/Android/iOS;
  no native project directories generated.
- BE `npm test`: Passed, 74 tests including six new trip/social tests.
- FE `npm run test:integration`: Passed against real BE services.
- `npm run test:web`: Passed after updating the four-step edit flow; includes
  prior Match, GPS, lifecycle, auth, profile and Google callback regressions.
- `npm run test:trip:web`: Passed through two isolated account sessions: recipient
  acceptance, date/time/place wheels, profile city, reserved/friend occupancy, age,
  cost notes, Excel, Match preview at 390/768/1440px, cross-user persisted group and
  direct chat, reserved-seat conversion, host-only plan editing and file download.
  Includes thumbnail dimensions and no browser runtime errors.
- `git diff --check`: Passed.

### Remaining work

- Physical Android/iOS picker, keyboard and external Excel app review was not run.
- Excel is an attachment, not an automatic row import; online plans are HTTPS links
  whose sharing permissions are managed by their owners. Native rebuild is required
  for the newly added document-picker/sharing capabilities.
- Districts are explicitly optional legacy landmarks; current wards are selected
  at province level from the bundled API snapshot.

## 2026-10-15 - Match P1/P2, location, favorites and profile media

### Summary

- Add personal/business activity creation and filtering, recommended/nearest/
  soonest ordering, foreground GPS and interactive map point selection. Connect
  real coordinates to BE distance/radius queries; no deposit filter is present.
- Persist filters and favorites per account. Recommend activities using interests
  and bounded category feedback before paging. Restore saved nearest/radius
  preferences through a location prompt without storing precise GPS coordinates.
- Add profile-cover upload/replacement/removal and full-screen album viewing;
  preserve multiple uploads, reorder and confirmed deletion. Show covers in the
  profile and preview; normalize and clean assets with optimistic concurrency.
- Connect the Google GIS/native SDK token flow to BE sessions, leaving provider
  setup disabled as requested. Add optional native config and a public client-ID
  endpoint; do not create or modify provider credentials.
- Fix wheel selection being overwritten by stale web scroll events, restore the
  requested gomate_user placeholder, handle older filter objects without the new
  organizer field, and show actual activity photos instead of repeated placeholders.
  Disable joining closed/full activities and resolve own request state in favorites.

### Files changed

- `src/screens/{MainApp,MatchScreen,MatchHubScreen,FilterScreen,CreateActivityScreen,ActivityDetailScreen,FavoriteActivitiesScreen,ProfileViews,AuthScreen}.tsx`
- `src/components/{ActivityMap,ActivityMap.web,LocationField,GoogleLoginButton,GoogleLoginButton.web,ProfileCoverEditor,ProfilePhotoEditor,ProfilePickers,GradientButton}.tsx`
- `src/components/ActivityMap.types.ts`, `src/components/match/MatchPrimitives.tsx`
- `src/services/{matchService,locationService,googleLogin,activityApi,activityService,filterService,profileService}.ts`, `src/data/activities.ts`
- `app.json`, `app.config.js`, `.env.example`, `package.json`, `package-lock.json`
- `tests/web.smoke.cjs`, `docs/MATCH_FEATURES.md`, `docs/DECISIONS.md`, `README.md`
- BE: activity/profile/auth repositories and routes, bounded Match filter validator,
  map document/assets routes, Leaflet dependency and `tests/match-preferences.test.js`.

### Verification

- `npm run typecheck` and `npm run lint`: Passed.
- `npx expo-doctor`: Passed, 21/21 checks.
- Web export with `EXPO_PUBLIC_API_BASE_URL=/api`: Passed.
- Android export to a temporary folder: Passed; no native directories generated.
- BE `npm test`: Passed, 68 tests; focused Match suite passed again after stricter
  filter validation, nearest-location requirement and map embedding changes.
- FE `npm run test:integration`: Passed after fixing legacy filter compatibility.
- `node --test tests/profile-date.test.cjs`: Passed, 2 tests.
- Browser smoke: Passed through favorites persistence, organizer filters, simulated
  GPS, map clicks, radius, profile cover/album, wheel regression and simulated Google
  callback through real BE sessions. Final smoke also passed join/cancel from
  favorites, restored-radius location prompts, and no browser runtime errors.
- `git diff --check`: Passed.

### Remaining work

- Real Google provider setup is deferred. Browser Google tests substitute the SDK
  response; real provider credentials and physical-device sign-in were not tested.
- Physical GPS, native device rendering and iOS builds were not run. OSM tiles
  require internet; geographical searches omit activities without pinned points.

## 2026-10-15 - Soft abstract lavender Match background and smaller card

### Summary

- Replace the flat Match backdrop with a three-stop gradient (#F5F3FF,
  #EAE7FF, #F9F9FF), translucent pastel circles and large curved accents.
  Feather the shapes on native and add blur on web; keep the backdrop behind
  content and outside pointer handling in every Match state.
- Scale only the Match card to 95%, preserving swipe transforms and action
  button sizes. Compensate for the scaled card's unused layout height.

### Files changed

- `src/components/match/MatchBackground.tsx`
- `src/screens/MatchScreen.tsx`

### Verification

- `npm run typecheck`: Passed.
- `npm run lint`: Passed.
- `npx expo-doctor`: Passed, 21/21 checks.
- `EXPO_PUBLIC_API_BASE_URL=/api npx expo export --platform web`: Passed.
- Temporary focused browser review: Passed at 390, 768 and 1440px without
  horizontal overflow; captured screenshots, dragged a card to expose the
  backdrop, checked skip/undo and found no browser runtime errors.
- `npm run test:web`: Failed later at the language-picker English selection
  assertion; Match checks passed before that unrelated step.

### Remaining work

- Native device visual review was not run; browser review covered web only.
- Investigate the full-app language-picker smoke failure separately.

## 2026-10-15 - Match lavender background and floating activity card

### Summary

- Add a very pale lavender gradient scoped to Match, including empty/loading
  states. Keep the existing primary palette and all button styles and handlers.
- Set the card's horizontal inset to 16px and separate its shadow from the
  clipped content. Round only the top corners; retain the full scrolling post
  with square bottom corners and the additional photos at the end.
- Place category and member count directly below the main photo, followed by
  title and basic information. Consolidate host information and its existing
  verification icon in the host detail section without removing post content.

### Files changed

- `src/screens/MatchScreen.tsx`
- `src/components/match/MatchPrimitives.tsx`

### Verification

- `npm run typecheck`: Passed.
- `npm run lint`: Passed.
- `npx expo-doctor`: Passed, 21/21 checks.
- `EXPO_PUBLIC_API_BASE_URL=/api npx expo export --platform web`: Passed.
- `npm run test:web`: Passed with the cached MongoDB binary supplied through
  `MONGOMS_SYSTEM_BINARY`; includes Match skip/undo and no browser runtime errors.
  The initial attempt was stopped while downloading an already cached binary.
- `git diff --check` for the changed Match files: Passed.

### Remaining work

- Native device visual review was not run; validation used the web build/browser.

## 2026-10-15 - GoMate companion profiles, wheel pickers and single-post Match undo

### Summary

- Adapt the supplied matching-profile references to GoMate: basic information,
  photo gallery, introduction, interests, companion goals, availability, two short
  activity prompts, and optional work/education. Remove dedicated lifestyle/music
  sections from the profile editor and provide edit/preview tabs using current drafts.
- Split incomplete-profile onboarding into persisted basic information, then the
  companion profile. Bio and at least one interest complete the second step;
  work/education, prompts and photos remain optional.
- Add day/month/year wheels and masked `DD-MM-YYYY` typing, including separators
  after complete day/month, deletion handling, leap years and future-date checks.
  Preserve ISO birth dates at the API boundary. Rename the username label to
  `Nickname (không bắt buộc)` and retain the `gomate_user` placeholder.
- Add 174 searchable interests, accent-insensitive matching and custom interests;
  retain the 12-interest limit. Select province-level areas only, with the catalogue
  checked against https://chinhphu.vn/cac-tinh-thanh-pho-68349 on 2026-10-15.
- Add a language wheel with Vietnamese selected by default, multiple selection,
  duplicate prevention and at least one remaining language (up to 12).
- Add six profile photos, each up to 10 MiB, with owner-only upload/reorder/delete,
  optimistic concurrency, processed images and failed-upload cleanup. Profile
  context updates photos without discarding unsaved form text. Await avatar upload
  before releasing the completion gate so failures stay visible.
- Use the live account avatar in Home/Match headers; tapping it opens the profile.
  Move settings into the seven requested profile menu rows; show actual account
  fields in Settings. Verification reports the persisted email status; reviews read
  stored scores with an honest empty state. Preview/member modals use public profile
  fields and ordered photos, with complete-years age instead of the exact birth date.
- Remove the Match undo confirmation and per-session allowance. Undo returns only
  the immediately skipped post, clears its slot on use, and becomes available after
  the next skip. Accepting a post clears the previous skip slot. Add web selection
  semantics alongside native accessibility state for wheels, tabs and chips.

### Files changed

- New FE `src/components/ProfilePickers.tsx`, `ProfilePhotoEditor.tsx`,
  `UserAvatar.tsx`, `src/data/profileOptions.ts`, `src/services/profileDate.ts`,
  `src/screens/ProfileAccountScreens.tsx`, and `tests/profile-date.test.cjs`.
- FE profile/MainApp/Home/Match/Settings screens, Home header and public profile
  modal; `ActivityChoices.tsx`, `BottomNav.tsx`, `MatchSheets.tsx`, translations;
  profile service/context and `useRemote.ts`; extended `tests/web.smoke.cjs`.
- BE profile routes, auth repository methods and `tests/profile.test.js`.
- Both READMEs and `docs/DECISIONS.md`. Earlier P0 edits and the existing BE
  package-lock change remain in the working tree.

### Verification

- `npm run typecheck`: Passed.
- `npm run lint`: Passed.
- `node --test tests/profile-date.test.cjs`: Passed, 2 tests for incremental typing,
  backspace, ISO/display conversion and invalid/leap/future dates.
- FE `npm run test:integration`: Passed against actual BE/MongoDB.
- BE `npm test`: Passed, 61 tests. Subsequent targeted
  `node --test tests/profile.test.js`: Passed, 11 tests including photo capacity
  and oversized image rejection added during review.
- `npx expo-doctor`: Passed, 21/21 checks.
- `EXPO_PUBLIC_API_BASE_URL=/api npx expo export --platform web --clear`: Passed.
- `npm run test:web`: Passed in headless Chrome with real BE/MongoDB and test
  mail/image storage: seven menu rows, account identity, immediate one-post undo
  and reset, date typing and actual year scrolling, leap-day clamping, region
  search, actual language scrolling/multiple selection/minimum one, interest
  search without accents, two-stage registration, profile photo upload/order/delete,
  live avatar propagation, draft preview and persisted profile after reload.
  Previous P0 activity/auth smoke coverage also passed; no runtime errors.
- Screenshots of birthday/language wheels and profile previews/editors at
  390/768/1440 px were reviewed. `git diff --check` passed in both repositories.

### Remaining work

- Physical iPhone/Android interaction and live SMTP/Cloudinary delivery were not
  exercised. The cross-platform wheels were verified in Chrome, including actual
  scroll events. Profile verification currently covers email, not identity documents.
- The reviews page reads existing `activity_ratings`; the existing activity rating
  submission screen remains a separate prototype and does not create reviews yet.

## 2026-10-15 - Complete P0 web authentication, profiles and activity management

### Summary

- Expand bounded web pages for desktop/tablet, keep readable auth forms, and wrap
  upcoming activity cards into columns. Fix clipped email descenders with a padded
  input using the font's normal line height and accessible input labels.
- Add hash URLs and per-user browser history snapshots for tabs/screens; restore
  Back/Forward and reload, hydrate activity links from BE, and recover pending
  verification emails. Web sessions persist in localStorage, use remembered BE
  sessions, and clear on logout/401; native session behavior remains in memory.
- Complete reset-password OTP/new-password validation, resend cooldown and feedback.
  Replace dismissible profile reminders with a completion gate. Move birth date
  and gender into basic information; advanced religion/alcohol remain optional.
- Reuse the creation wizard for host edits; support capacity, optional estimated
  cost, multiple photos (six, 10 MiB each), gallery replacement/clearing and deletion
  confirmation. Remove prepayment/deposit/deadline requirements from creation.
- Connect start, attendance, updates and completion to BE; persist the audit trail
  and use real roster/update counts in summaries. Confirm completion and stop
  attendance edits after completion.
- Upgrade Expo to SDK 57 patch ~57.0.29 after Doctor detected an installed patch
  mismatch. Add Playwright and a repeatable browser smoke command.

### Files changed

- FE `App.tsx`, `src/theme.ts`, `src/services/webNavigation.ts`, `api.ts`,
  `activityApi.ts`, `activityService.ts`, `profileService.ts`, and activity types.
- FE auth/profile/create/manage/group/progress/summary/detail/home screens;
  shared `FormField.tsx` and `BottomNav.tsx`.
- BE activity validation/routes/repository and profile completion contract.
- FE `tests/backend.integration.cjs`, new `tests/web.smoke.cjs`; BE new
  `tests/activity-gallery.test.js` and updated `tests/profile.test.js`.
- FE package manifest/lock, both READMEs, and `docs/DECISIONS.md`.
  The pre-existing BE package-lock modification was left as found.

### Verification

- `npm run typecheck`: Passed.
- `npm run lint`: Passed.
- `npx expo-doctor`: Passed, 21/21 checks.
- BE `npm test`: Passed, 58 tests including exact 10 MiB acceptance, oversize
  rejection, ordered gallery persistence, replacement/clear/delete cleanup,
  rollback of partial uploads, lifecycle permissions and profile completion.
- FE `npm run test:integration`: Passed against actual BE/MongoDB; includes
  web session restoration, 401 cleanup, no financial configuration requirement,
  cleared registration deadline, lifecycle, attendance and audit adapters.
- `EXPO_PUBLIC_API_BASE_URL=/api npx expo export --platform web --clear`: Passed.
  Clearing Metro was necessary to avoid reusing the prior LAN API build.
- `npm run test:web`: Passed in headless Chrome with an isolated BE/MongoDB;
  login/reload/Back/Forward, 390/768/1440 px overflow checks, actual multi-file
  picker, gallery/edit/delete/start/attendance/reload/complete, reset OTP,
  verification reload, required profile gate and basic/advanced profile save.
  No browser runtime errors. Email g/q screenshot and responsive screenshots
  were visually inspected; artifacts are printed in the temporary test directory.
- `git diff --check` in both repositories: Passed.
- Tests reused the cached MongoDB executable through `MONGOMS_SYSTEM_BINARY`.
  The initial integration attempt was stopped while it downloaded a duplicate binary.

### Remaining work

- No remaining implementation items from this P0 list. Native device validation
  and live SMTP/Cloudinary delivery were not run; automated tests substitute email
  and image storage while using the actual API and MongoDB.

## 2026-10-13 - Configure LAN API access for Expo Go

### Summary

- Replaced the local FE localhost API URL with the PC Wi-Fi address
  `http://10.87.28.73:3000/api`; localhost on a phone addresses the phone itself.
- Set BE `HOST=0.0.0.0` and added the LAN Expo web origin to the CORS allowlist.

### Files changed

- FE `.env.local` and BE `.env` (ignored local configuration).
- `docs/DEVELOPMENT_LOG.md`.

### Verification

- LAN `/api/health`: HTTP 200, `status: ok`, with matching LAN Expo CORS origin.
- FE typecheck and lint: Passed.
- Expo Doctor: 20/21 passed; existing installed Expo 57.0.25 versus expected
  ~57.0.28 mismatch remains.
- Running Expo bundle still has the old URL; Expo restart required.

### Remaining work

- Restart Expo and scan its QR again. Confirm phone access to the LAN health URL;
  phone connectivity/firewall cannot be verified from this PC.
- Update the local URL if the PC Wi-Fi IP changes.

## 2026-10-13 - Restore local Expo web API connectivity

### Summary

- Confirmed the API was healthy, but Expo web defaulted to `/api` on port 8081
  without a local environment file; that URL returned Expo HTML instead of API JSON.
- Set the local FE API URL to `http://localhost:3000/api` and allowed Expo localhost
  origins in the BE environment. Restarted Expo to load the environment.

### Files changed

- FE `.env.local` and BE `.env` (local ignored configuration).
- `docs/DEVELOPMENT_LOG.md`.

### Verification

- API health: HTTP 200 with `status: ok` and matching Expo CORS origin.
- Login OPTIONS: HTTP 204 with matching CORS origin; empty login POST: HTTP 400
  with API validation JSON and matching CORS origin.
- FE `npm.cmd run typecheck` and `npm.cmd run lint`: Passed.
- `npx.cmd expo-doctor`: 20/21 passed; installed Expo 57.0.25 differs from
  the declared/expected ~57.0.28. Dependencies left unchanged in this configuration fix.

### Remaining work

- Browser reload required. Physical devices need a LAN API URL and a BE LAN bind.
- Existing Expo patch mismatch remains.

## 2026-10-13 - Add remote demo photos, ten members and populated activity groups

### Summary

- Curated/verified external photos for all 20 activities; replaced API activity local
  fallback images with remote URLs. Added stock avatars/covers to all demo profiles.
- Added ten complete fictional users (14 total) with names, birth dates, locations,
  bios, interests, languages, occupations and voluntary preferences.
- Enriched existing demo records: 59 approved memberships and 20 pending requests;
  each group has 3–5 people including host. Reruns preserve decisions/removals.
- Added profile cover rendering, real member avatars and public-profile modal.
  Public profile excludes private fields. Restricted CSP now allows chosen image hosts.

### Files changed

- BE `src/database/{demo-media,demo-data,seed-demo}.js`, `src/app.js`, profile/activity routes.
- BE profile, join-request and demo tests; demo/profile docs.
- FE `src/services/{activityApi,profileService}.ts`, `ProfileViews.tsx`, `MembershipViews.tsx`.
- FE `src/components/MemberProfileModal.tsx`, README and decision/development logs.

### Verification

- BE `npm test`: Passed 57/57, including media/roster consistency, no duplicate
  membership, preference compatibility, public-profile privacy and seed rerun after leave.
- FE typecheck/lint/integration: Passed; Expo Doctor passed 21/21.
- Expo web export: Passed; diff checks passed in both repositories.
- HTTP image checks: Selected Unsplash URLs and all 14 distinct avatar URLs return
  200/image MIME. Contact sheet visually reviewed; badminton, picnic and TP.HCM
  photos corrected to match the respective topics.
- Actual DB verification: 14 complete profiles, 20 remote activity images,
  59 approved memberships, 20 pending, consistent counts and group sizes 3/4/5.
- Browser: member1 login, profile cover/avatar loaded remotely; joined group showed
  real member avatars; clicking Hoàng Nam opened real profile with loaded remote cover/avatar.

### Remaining work

- External providers/network can affect image availability; no offline local image fallback.
- Physical-device QA not run. Broader prototype features remain as previously recorded.

## 2026-10-13 - Complete signup, scheduling, activity creation and profiles; seed TP.HCM demo

### Summary

- Relaxed all password creation/reset/change checks to 6–128 characters; verification
  issues a session and FE enters the app immediately. Removed the third OTP box highlight.
- Added shared calendar and time selectors, retaining morning/afternoon/evening and
  offering 15-minute slots plus manual exact time. Match submits precise date/time filters.
- Added minimum/maximum group size and collapsed advanced requirements for gender,
  language, religion, alcohol and dress code; persisted and validated across FE/BE.
- Added per-step creation validation, free activity handling, synchronized category
  contracts and requirement summaries. BE checks profile requirements on join.
- Replaced own-profile mock screens with real profile fetching, saving and avatar
  upload; added completion state and an optional reminder when entering the app.
- Seeded 20 fictional upcoming TP.HCM activities and four demo accounts into the
  configured database. Reruns are insert-only and preserve existing records.

### Files changed

- `App.tsx`, auth/verification, MainApp, Filter/Create/ActivityDetail and profile screens.
- `src/components/{DateTimeField,ActivityChoices,CreateGroupFields}.tsx`, home/match UI.
- `src/services/{api,activityApi,activityService,filterService,profileService}.ts`, `ProfileContext.tsx`.
- `tests/backend.integration.cjs`, README, development/decision logs.
- BE: auth/profile/activity routes and validation, activity repository, preference helpers,
  demo seeder, package script, API docs/Postman and auth/profile/demo test suites.

### Verification

- FE `npm run typecheck`, `npm run lint`: Passed.
- `npx expo-doctor`: Passed 21/21 checks.
- BE `npm test`: Passed 57/57 tests, including six-character passwords, auto-login,
  completion, voluntary preferences, precise Vietnam date/time filters and idempotent seeding.
- FE `npm run test:integration`: Passed actual service-to-Express/MongoDB flow,
  including short-password signup, automatic verification login, profile save and restricted joins.
- Expo web export: Passed.
- Playwright: real demo login showed completion reminder; saving profile persisted
  complete state. Chose calendar date/time, created a 3–8-member activity with gender,
  language and dress code (201); removed test activity afterward (204).
  Date 14/10/2026 and 09:00–09:15 Match filter returned the expected one demo activity (200).
- Actual `npm run db:seed-demo`: Created 20 activities. Browser test reset the demo
  participant's basic fields afterward so the completion reminder remains demoable.
- `git diff --check`: Passed both repositories.

### Remaining work

- Physical-device QA and live Cloudinary upload QA not run; avatar provider behavior
  covered by BE tests. One cover image supported. Payment transactions, chat/messages,
  general notifications, ratings and activity progress UI remain outside this task.
- Persistent FE sessions, GPS-based distance filtering and Google/Apple UI remain unimplemented.
- Existing upstream dependency audit advisories remain as recorded in the preceding entry.

## 2026-10-13 - Connect activity requests and group membership to BE

### Summary

- Replaced mock login with email authentication/verification and password recovery.
  Added Bearer API client, timeout, 401 handling and Expo environment configuration.
- Connected Home/Match, creation, pending/joined/hosted lists, host decisions,
  members, cancellation, leaving and removal with error states and refresh.
- Updated BE CORS for Expo and validated/persisted creation funding and deadlines.
  Cleaned duplicate MongoDB configuration locally, preserving the effective URI.
- Updated Expo to 57.0.28 and applied compatible npm audit fixes.

### Files changed

- `.env.example`, `package.json`, `package-lock.json`, `App.tsx`, `README.md`.
- `src/services/{api,activityApi,activityService,useRemote}.ts`.
- `src/components/RemoteState.tsx`, `src/data/activities.ts`.
- Auth/VerifyEmail, MainApp, Home/Match, Create/ActivityDetail, membership/list/group screens.
- `tests/backend.integration.cjs`, `docs/DECISIONS.md`.
- BE: config/env, activity validation/routes/repository, README and funding/CORS tests.

### Verification

- `npm run typecheck`, `npm run lint`: Passed.
- `npx expo-doctor`: Passed 21/21 checks.
- BE `npm test`: Passed 53/53 tests.
- `npm run test:integration`: Passed; actual FE service code exercised against
  Express/MongoDB for every requested endpoint, paging, identity and session expiry.
- `npx expo export --platform web --output-dir dist`: Passed with same-origin `/api`.
- Playwright browser: exported app rendered; invalid login called real BE and
  displayed the 401 error without entering the application.
- `git diff --check`: Passed for both repositories.
- `npm audit fix`: Applied compatible fix; audit still reports 22 transitive
  advisories (7 moderate, 15 high). Suggested forced fixes downgrade Expo/RN.

### Remaining work

- Profile/chat/messages/notifications, progress/expenses/ratings remain prototype;
  Google/Apple UI, persistent login and financial transactions remain unimplemented.
- Cover only supports one image; no physical-device validation. Browser smoke
  tested login failure; authenticated membership flow verified through service integration.
- Resolve remaining upstream dependency advisories without downgrading SDK 57.

## 2026-09-29 - Allow unrestricted Create Activity mockup navigation

### Summary

- Removed all field validation that blocked advancing or publishing in the
  Create Activity flow so every UI step can be reviewed with empty mock data.
- Kept only operational image-picker feedback such as permission denial and the
  six-image limit.

### Files changed

- `src/screens/CreateActivityScreen.tsx`
- `docs/DECISIONS.md`
- `docs/DEVELOPMENT_LOG.md`

### Verification

- `npm run typecheck`: Passed.
- `npm run lint`: Passed with no warnings.

### Remaining work

- Restore production form and financial validation before connecting the flow
  to a real creation API.

## 2026-09-29 - Expand Match confirmation, filters, and activity creation

### Summary

- Replaced the dedicated post-Match success route with an in-place bottom
  confirmation; interested swipes now send the request and advance the deck.
- Rebuilt Match filters with shared expanded categories, province/city and
  district selection, draggable distance and cost controls, availability, and
  minimum group-capacity filtering. Applied every new field to discovery data.
- Expanded Create Activity to five steps with up to six square-cropped photos,
  preset or custom categories, detailed scheduling and location fields, group
  setup, and a review step with direct financial editing.
- Added the Activity Fund configuration requested by the product brief: full
  prepayment or deposit, mode-specific values and deadlines, host treasury,
  approval threshold/rule, expected-fund summary, validation, and local draft
  persistence while the backend API is unavailable.
- Removed the obsolete Match success screen and documented the resulting
  product and data-model decisions.

### Files changed

- `src/data/activityOptions.ts`
- `src/screens/CreateActivityScreen.tsx`
- `src/screens/FilterScreen.tsx`
- `src/screens/MainApp.tsx`
- `src/screens/MatchScreen.tsx`
- `src/screens/MatchSuccessScreen.tsx` (removed)
- `src/services/activityService.ts`
- `docs/DECISIONS.md`
- `docs/DEVELOPMENT_LOG.md`

### Verification

- `npm run typecheck`: Passed.
- `npm run lint`: Passed with no warnings.
- `npx expo-doctor`: Passed all 21 checks.
- `npx expo export --platform android --output-dir .tmp-create-filter-export`:
  Passed; generated the Android bundle successfully and the temporary output
  was removed afterward.

### Remaining work

- Connect activity creation, join requests, uploaded photos, and financial
  configuration to backend persistence when the corresponding APIs exist.
- Implement the later Fund lifecycle (contributions, payments, approvals,
  disbursement, reconciliation, refunds, settlement, disputes, and history).
- Validate slider feel, image cropping, and long location/category layouts on
  representative physical Android and iOS devices.

## 2026-09-29 - Improve Match swipe reliability on mobile

### Summary

- Moved the horizontal pan responder above the card's vertical `ScrollView` so
  horizontal intent is captured before native scrolling can claim the gesture.
- Reduced the initial direction-lock distance and allowed slightly diagonal
  swipes while preserving normal vertical detail scrolling.
- Added velocity-aware flick detection, a responsive completion threshold, and
  an animation guard to make short fast swipes reliable without double actions.

### Files changed

- `src/screens/MatchScreen.tsx`
- `docs/DEVELOPMENT_LOG.md`

### Verification

- `npm run typecheck`: Passed.
- `npm run lint`: Passed with no warnings.
- `npx expo-doctor`: Passed all 21 checks.
- `npx expo export --platform android --output-dir .tmp-match-swipe-smooth-export`:
  Passed; generated the Android bundle successfully.

### Remaining work

- Confirm the gesture feel on representative physical Android and iOS devices.

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

