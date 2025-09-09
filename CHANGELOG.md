# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added
- streamline hotfix and republish scripts by consolidating changelog population logic ([cd56ab8](https://github.com/oorabona/vitest-monocart-coverage/commit/cd56ab8))
- enhance changelog script to include GitHub commit links ([a440cdf](https://github.com/oorabona/vitest-monocart-coverage/commit/a440cdf))
- implement script to populate [Unreleased] section in changelog with commits since last tag ([3dacbea](https://github.com/oorabona/vitest-monocart-coverage/commit/3dacbea))
- enhance changelog population script to support multiple conventional commit prefixes ([87a5f3b](https://github.com/oorabona/vitest-monocart-coverage/commit/87a5f3b))
- enhance logger functionality with module support and logging levels ([410aa2e](https://github.com/oorabona/vitest-monocart-coverage/commit/410aa2e))
- extend provider configuration with browser support ([410aa2e](https://github.com/oorabona/vitest-monocart-coverage/commit/410aa2e))
- implement MonocartBrowserProvider for browser coverage integration and add CSS option validation ([bafc4f3](https://github.com/oorabona/vitest-monocart-coverage/commit/bafc4f3))

### Fixed
- improve commit description cleanup and regex for conventional commits ([9235772](https://github.com/oorabona/vitest-monocart-coverage/commit/9235772))
- remove vite-ignore comments for dynamic imports and update test patterns in config files ([44ad329](https://github.com/oorabona/vitest-monocart-coverage/commit/44ad329))
- improve error handling and logging in provider tests ([410aa2e](https://github.com/oorabona/vitest-monocart-coverage/commit/410aa2e))
- update MonocartReporter to expose config as public and adjust default CSS option in tests ([b4c01f4](https://github.com/oorabona/vitest-monocart-coverage/commit/b4c01f4))

### Changed
- remove outdated changelog scripts and implement a simplified unreleased population script ([782d325](https://github.com/oorabona/vitest-monocart-coverage/commit/782d325))
- Merge remote-tracking branch 'refs/remotes/origin/main' ([d6d76e7](https://github.com/oorabona/vitest-monocart-coverage/commit/d6d76e7))
- add comprehensive tests for reporter functionality ([410aa2e](https://github.com/oorabona/vitest-monocart-coverage/commit/410aa2e))
- update TypeScript configuration for browser compatibility ([410aa2e](https://github.com/oorabona/vitest-monocart-coverage/commit/410aa2e))
- refactor build configuration for multiple targets ([410aa2e](https://github.com/oorabona/vitest-monocart-coverage/commit/410aa2e))
- add Vitest configuration for browser testing ([410aa2e](https://github.com/oorabona/vitest-monocart-coverage/commit/410aa2e))
- update self-coverage configurations for improved reporting ([410aa2e](https://github.com/oorabona/vitest-monocart-coverage/commit/410aa2e))

## [v1.1.0] - 2025-09-05

### Added
- enhance retry publish workflow with temporary branch management and update release-it configuration
- add workflows for hotfix, republish, and retry publish with associated scripts
- add script to auto-populate [Unreleased] section in CHANGELOG.md ([6abfc9a](https://github.com/oorabona/vitest-monocart-coverage/commit/6abfc9a44e51762e8396a22648d19cae19e31d9b))

### Fixed
- update type assertions in tests for better compatibility with Vitest
- update comment to specify the ignore next line for v8 in findConfigLoader function
- improve fetchCache assignment logic for better handling of transform modes
- enable commit in republish workflow to update CHANGELOG.md ([bcfa051](https://github.com/oorabona/vitest-monocart-coverage/commit/bcfa051213ac5131c206e546bf53f765fd9f4b66))
- because of release-it#834 issue, had to rework the republish to directly call npm instead

### Changed
- update build scripts for improved sourcemap handling and add production coverage test ([ba2fa8e](https://github.com/oorabona/vitest-monocart-coverage/commit/ba2fa8ec03e7897fe02965f71c06c94b3d83dfba))
- update CHANGELOG.md with enhancements and fixes for v1.0.0 release
- comment out typecheck:tests step in republish workflow ([985c269](https://github.com/oorabona/vitest-monocart-coverage/commit/985c2695037cd429bf0bdb406bf935609106883e))
- simplify retry publish workflow by removing temporary branch management
- comment out typecheck:tests step in CI workflow
- add initial changelog file following semantic versioning ([1a18ec9](https://github.com/oorabona/vitest-monocart-coverage/commit/1a18ec94e3174ea8519a168cd74ad495b52e50af))
- enhance version handling in update-changelog script
- add tsx as a dependency and update package manager version ([cce79e5](https://github.com/oorabona/vitest-monocart-coverage/commit/cce79e5e9586b62901bf254753911ac3d5928343))
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


[Unreleased]: https://github.com/oorabona/vitest-monocart-coverage/compare/v1.2.0...HEAD
[v1.0.0]: https://github.com/oorabona/vitest-monocart-coverage/releases/tag/v1.0.0
[v1.1.0]: git+https://github.com/oorabona/vitest-monocart-coverage.git/releases/tag/v1.1.0
[v1.2.0]: https://github.com/oorabona/vitest-monocart-coverage/releases/tag/v1.2.0
