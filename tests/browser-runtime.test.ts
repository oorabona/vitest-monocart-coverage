import { describe, expect, it } from 'vitest'
import { filterResult, normalizeUrl, shouldIncludeUrl } from '../src/browser-runtime.js'

describe('Browser Runtime URL Filtering', () => {
  const origin = 'http://localhost:3000'

  describe('shouldIncludeUrl', () => {
    it('should include URLs from same origin', () => {
      expect(shouldIncludeUrl('http://localhost:3000/src/file.js', origin)).toBe(true)
    })

    it('should exclude URLs from different origins', () => {
      expect(shouldIncludeUrl('https://external-site.com/script.js', origin)).toBe(false)
    })

    it('should exclude node_modules URLs', () => {
      expect(shouldIncludeUrl('http://localhost:3000/node_modules/package/file.js', origin)).toBe(
        false,
      )
    })

    it('should exclude __vitest_ URLs', () => {
      expect(shouldIncludeUrl('http://localhost:3000/__vitest_/runner.js', origin)).toBe(false)
    })

    it('should exclude @vite/ URLs', () => {
      expect(shouldIncludeUrl('http://localhost:3000/@vite/client.js', origin)).toBe(false)
    })

    it('should include regular source files', () => {
      expect(shouldIncludeUrl('http://localhost:3000/src/component.js', origin)).toBe(true)
    })

    it('should include @fs/ URLs (they get normalized later)', () => {
      expect(shouldIncludeUrl('http://localhost:3000/@fs/absolute/path/file.js', origin)).toBe(true)
    })
  })

  describe('normalizeUrl', () => {
    it('should remove origin and decode URL', () => {
      expect(normalizeUrl('http://localhost:3000/src/file.js', origin)).toBe('src/file.js')
    })

    it('should handle @fs/ prefix by removing it', () => {
      expect(normalizeUrl('http://localhost:3000/@fs/absolute/path/file.js', origin)).toBe(
        'absolute/path/file.js',
      )
    })

    it('should decode URI components', () => {
      expect(normalizeUrl('http://localhost:3000/src/file%20name.js', origin)).toBe(
        'src/file name.js',
      )
    })

    it('should handle URLs without @fs/ prefix', () => {
      expect(normalizeUrl('http://localhost:3000/src/normal.js', origin)).toBe('src/normal.js')
    })
  })

  describe('filterResult (integration test - uses actual window.location)', () => {
    // Ces tests utilisent la vraie URL du browser, on teste avec des URLs relatives à l'origin actuel

    it('should filter and normalize entry from current origin', () => {
      const currentOrigin = window.location.origin
      const entry = {
        url: `${currentOrigin}/src/file.js`,
      }

      const result = filterResult(entry)

      expect(result).toBe(true)
      expect(entry.url).toBe('src/file.js')
    })

    it('should filter out external URLs', () => {
      const entry = {
        url: 'https://external-site.com/script.js',
      }

      const result = filterResult(entry)

      expect(result).toBe(false)
    })

    it('should filter out and normalize @fs URLs from current origin', () => {
      const currentOrigin = window.location.origin
      const entry = {
        url: `${currentOrigin}/@fs/absolute/path/file.js`,
      }

      const result = filterResult(entry)

      expect(result).toBe(true)
      expect(entry.url).toBe('absolute/path/file.js')
    })

    it('should filter out node_modules URLs from current origin', () => {
      const currentOrigin = window.location.origin
      const entry = {
        url: `${currentOrigin}/node_modules/package/file.js`,
      }

      const result = filterResult(entry)

      expect(result).toBe(false)
    })
  })
})
