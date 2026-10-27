# GoMate repository instructions

These instructions apply to the Expo/React Native application at the repository
root.

## Keep the project documentation current

After every task that changes source code, configuration, dependencies, tests,
or developer tooling, update `docs/DEVELOPMENT_LOG.md` before considering the
task complete.

Each log entry must include:

- the date and a short task title;
- a concise summary of what changed and why;
- the important files that were added, changed, or removed;
- verification that was run and its result (or a clear reason it was not run);
- remaining work, known limitations, or `None`.

Keep the newest entry at the top. Combine tightly related edits made during one
task into one entry. Do not claim a test passed unless it was actually run.
Documentation-only changes should be logged when they change the team's working
process, but trivial typo-only documentation edits do not require a new entry.

When a change introduces or reverses an important architectural, dependency,
security, data-model, or product decision, also add an entry to
`docs/DECISIONS.md`.

Use `docs/templates/development-log-entry.md` as the format for new development
log entries. Keep documentation concise and useful to the next developer.

## Repository layout

- `App.tsx`: application entry UI and screen flow.
- `src/screens/`: mobile screens.
- `src/components/`: reusable React Native components.
- `src/assets/`: application imagery and brand assets.
- `docs/`: shared project documentation and development history.

## Expo workflow

- Read the installed `expo` major version from `package.json` before using Expo
  APIs and consult the matching official documentation.
- Use `npx expo install <package>` for Expo or React Native dependencies so the
  installed version matches the SDK.
- Do not create or edit native `ios/` or `android/` directories by hand.
- Run `npm run typecheck`, `npm run lint`, and `npx expo-doctor` before declaring
  an implementation task complete.

## Completion checklist

Before reporting a coding task complete:

1. Run the checks appropriate to the area changed.
2. Review the diff for unrelated or generated changes.
3. Update `docs/DEVELOPMENT_LOG.md`.
4. Update `docs/DECISIONS.md` when the task includes a significant decision.

