# Shared workspace web launcher

`workspace-root/` versions the files installed in the parent of the separate GoMate-FE and GoMate-BE repositories. Copy its contents, including `scripts/`, to that parent after reviewing existing files.

Run `npm run dev:all` in the parent. It exports current web source with same-origin `/api`, then starts the backend on port 3000. Open http://localhost:3000/portal. No Metro server is started. After frontend edits, run `npm run build:web` and refresh. Native Expo development remains available through the FE scripts.

Install both projects' dependencies and configure BE MongoDB first. Do not run the launcher inside this template directory.
