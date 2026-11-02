# GoMate documentation

This directory is the shared project memory for the web and mobile apps.

## Files

- `BACKEND_GAPS.md`: comparison of the mobile UI with the local backend,
  missing features, integration mismatches and proposed implementation order.

- `DEVELOPMENT_LOG.md`: chronological record of completed coding work, newest
  entry first.
- `DECISIONS.md`: important technical and product decisions whose context should
  survive beyond one coding task.
- `templates/development-log-entry.md`: copyable format for a development-log
  entry.

## Working agreement

Every task that changes code, configuration, dependencies, tests, or tooling
must finish with an update to `DEVELOPMENT_LOG.md`. Record only checks that were
actually run, and explicitly note any checks that were skipped. See
`../AGENTS.md` for the complete repository rules.

