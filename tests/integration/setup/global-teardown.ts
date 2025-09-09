import type { FullConfig } from '@playwright/test'

async function globalTeardown(_config: FullConfig) {
  console.log('🧹 Cleaning up after Playwright integration tests...')

  // Any global cleanup logic can go here
  // For example, cleaning up test databases, stopping services, etc.
}

export default globalTeardown
