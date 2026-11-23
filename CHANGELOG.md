# Changelog

All notable changes are documented here. Format follows Keep a Changelog; versions follow semver.

This file is the source of truth for GitHub Release bodies (see `.github/workflows/publish.yml`).

## [Unreleased]

### Added
- Initial documentation scheme: requirements, architecture, contracts (v0.2), agent collaboration, GitHub workflow.
- 5 doc/contract gates (`tools/check-*.mjs`), all passing.
- App native UI architecture (9 pages).
- CI (verify only) + Publish (tag only) workflows split (ADR-0006).

### Changed
- Branch policy: all pushes via PR + merge; no direct push to main (ADR-0006).

## [v0.1.0] - 2026-11-23

- Initial repository setup (docs, discipline layer, deepseek-harness submodule).
