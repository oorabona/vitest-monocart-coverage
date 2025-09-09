# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added
- enhance changelog population script to support multiple conventional commit prefixes (87a5f3b)
- enhance logger functionality with module support and logging levels (
410aa2)
- extend provider configuration with browser support (
410aa2)
- implement MonocartBrowserProvider for browser coverage integration and add CSS option validation (
bafc4f)

### Fixed
- improve error handling and logging in provider tests (
410aa2)
- update MonocartReporter to expose config as public and adjust default CSS option in tests (
b4c01f)

### Changed
- remove outdated changelog scripts and implement a simplified unreleased population script (
782d32)
- Merge remote-tracking branch 'refs/remotes/origin/main' (
d6d76e)
- add comprehensive tests for reporter functionality (
410aa2)
- update TypeScript configuration for browser compatibility (
410aa2)
- refactor build configuration for multiple targets (
410aa2)
- add Vitest configuration for browser testing (
410aa2)
- update self-coverage configurations for improved reporting (
410aa2)

## [v1.2.0] - 2025-09-06

### Added
- enhance changelog population logic to merge manual and git-generated sections ([3cb4984](https://github.com/oorabona/vitest-monocart-coverage/commit/3cb49841a6c453a12bbe48fa956378a0088e5096))
- enhance changelog population logic and improve commit parsing with SHA links ([924620e](https://github.com/oorabona/vitest-monocart-coverage/commit/924620e0f5f1e6539352c683d711a717519467be))

### Fixed
- update package.json scripts for improved build configurations and refine tsup sourcemap handling ([858be7f](https://github.com/oorabona/vitest-monocart-coverage/commit/858be7f921065dfc48418141383da6bb8bf87b07))
- Test coverage extraction issues in exception handling paths (lines 189, 209 in config.ts)
- Transform cache access logic for different transformMode values and vitenode fallback scenarios
- update package.json scripts for improved build configurations and refine tsup sourcemap handling ([cbbd93e](https://github.com/oorabona/vitest-monocart-coverage/commit/cbbd93ea145f5996f5e45b8ec5207662f430b6ca))
- align version handling in MonocartCoverageProvider with Vitest to prevent mixed version warnings ([43cee8e](git+https://github.com/oorabona/vitest-monocart-coverage.git/commit/43cee8e48f07e90e273e402360c36c6217fb4483))
- disable git commit in changelog-only configuration ([38119cb](git+https://github.com/oorabona/vitest-monocart-coverage.git/commit/38119cb213d1b13ca127c6d8157f1d3c03db9230))
- update release-it configuration to enable changelog updates during release process ([1c325c2](https://github.com/oorabona/vitest-monocart-coverage/commit/1c325c266475b783f268c0634bf9d43f395b8051))
- update CHANGELOG.md with recent additions, fixes, and changes for improved documentation ([0f1c08e](https://github.com/oorabona/vitest-monocart-coverage/commit/0f1c08efd0ca5af58e3465afc6f9a6e356ebf129))

### Changed
- enhance README with additional badges and documentation links ([f992b05](https://github.com/oorabona/vitest-monocart-coverage/commit/f992b05cbbe97147c1e16c058df70d9c0b986721))
- add coverage provider comparison between Monocart and V8 default ([af5a8c6](https://github.com/oorabona/vitest-monocart-coverage/commit/af5a8c63c6b92fd2954727746d04b24137c966c6))
- Optimized build system with conditional source maps (dev-only vs production)
- Package size reduced from ~6MB to 362KB (94% reduction) by excluding source maps from npm distribution
- Improved tsup configuration with NODE_ENV-based sourcemap generation
- Updated package.json files array to exclude .map files from npm package
- enhance README with additional badges and documentation links
- add coverage provider comparison between Monocart and V8 default
- clarify architectural role of the coverage provider in README.md ([db90f10](git+https://github.com/oorabona/vitest-monocart-coverage.git/commit/db90f1021b93615fd353074cf62ac48a155e8e6a))
- update CHANGELOG.md with recent additions, fixes, and changes for improved documentation ([afd7940](git+https://github.com/oorabona/vitest-monocart-coverage.git/commit/afd7940a129ca52fb4cc9d1837a391bdcd0aaa27))

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
