# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [v1.1.0] - 2025-09-05

### Added
- enhance retry publish workflow with temporary branch management and update release-it configuration
- add workflows for hotfix, republish, and retry publish with associated scripts
- add script to auto-populate [Unreleased] section in CHANGELOG.md

### Fixed
- update type assertions in tests for better compatibility with Vitest
- update comment to specify the ignore next line for v8 in findConfigLoader function
- improve fetchCache assignment logic for better handling of transform modes
- enable commit in republish workflow to update CHANGELOG.md
- add repository field to package.json for better project visibility
- because of release-it#834 issue, retry by creating a temporary branch to avoid detached HEAD issues

### Changed
- update build scripts for improved sourcemap handling and add production coverage test
- update CHANGELOG.md with enhancements and fixes for v1.0.0 release
- comment out typecheck:tests step in republish workflow
- simplify retry publish workflow by removing temporary branch management
- comment out typecheck:tests step in CI workflow
- add initial changelog file following semantic versioning
- enhance version handling in update-changelog script
- add tsx as a dependency and update package manager version
- comment out Codecov actions in CI workflow
- update CI workflow and scripts for improved coverage reporting

## [v1.0.0] - 2025-09-05

### Added
- enhance retry publish workflow with temporary branch management and update release-it configuration
- add workflows for hotfix, republish, and retry publish with associated scripts
- add script to auto-populate [Unreleased] section in CHANGELOG.md

### Fixed
- add repository field to package.json for better project visibility
- because of release-it#834 issue, retry by creating a temporary branch to avoid detached HEAD issues

### Changed
- comment out typecheck:tests step in republish workflow
- simplify retry publish workflow by removing temporary branch management
- comment out typecheck:tests step in CI workflow
- add initial changelog file following semantic versioning
- enhance version handling in update-changelog script
- add tsx as a dependency and update package manager version
- comment out Codecov actions in CI workflow
- update CI workflow and scripts for improved coverage reporting


[Unreleased]: git+https://github.com/oorabona/vitest-monocart-coverage.git/compare/v1.1.0...HEAD
[v1.0.0]: https://github.com/oorabona/vitest-monocart-coverage/releases/tag/v1.0.0
[v1.1.0]: git+https://github.com/oorabona/vitest-monocart-coverage.git/releases/tag/v1.1.0