# GoMate Portal Module

The visual module was merged from `origin/htan-ui-web`. Its original `GoMatePortal.jsx` and preview remain a standalone design reference. The application renders `ConnectedPortal.jsx` at `/portal`, using the same visual foundations with real authentication, business applications, moderation and publication APIs. `/demo` provides normal-login demo accounts and walkthroughs; see [the demo guide](../../docs/DEMO_GUIDE.md).

The original preview's mock credentials/data are not used by the live portal. Native builds resolve a platform fallback and do not import DOM/CSS modules. The live portal reads the authenticated user's role from `/api/portal/me`, not a role selector.

## Current live behavior (2026-11-01)

Business owners create active employee login accounts directly using a new email/password and optional group assignments. Employee consent and admin employee review have been removed; global roles remain user/admin and effective business-staff access is limited to assigned groups. Only admin reviews business applications/posts. Existing approved/consented assignments continue working; a pending assignment becomes active when explicitly saved by its business.

Action feedback uses PortalNotifications: fixed top-right notices, dismissible and automatically cleared after 6 seconds (success) or 10 seconds (error). The notification provider is shared by authentication and the connected workspace; do not add duplicate result banners for actions wrapped by its run helper.

Pass the operation description as the first argument to the workspace `run(operation, action)` helper. `portalActionError` combines it with the API reason, translates known errors, and distinguishes wrong credentials from session expiry. Group operations include the group name; do not replace failures with a generic success or error banner.

Run the backend test suite and FE typecheck/lint/Expo Doctor, then export web with EXPO_PUBLIC_API_BASE_URL=/api and run tests/business-campaign-controls.web.cjs from the BE directory for integrated account/notification checks.

## Use

Render the default export from an existing screen or app entry when you are ready to connect it:

```jsx
import GoMatePortal from './gomate-portal';

export default function PortalScreen() {
  return <GoMatePortal />;
}
```

The module uses a small history-based router so it works with the current dependency set:

- `/login` - unified role login
- `/register` - business verification registration
- `/business` - business dashboard and post studio
- `/staff` - legacy design reference only; business employees use their assigned-group workspace in the live portal
- `/admin` - global metrics, business review, and users/subscriptions

Demo accounts are prefilled by the role selector:

- Business: `business@gomate.app` / `business123`
- Staff: `staff@gomate.app` / `staff123`
- Admin: `admin@gomate.app` / `admin123`
