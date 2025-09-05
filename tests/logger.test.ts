import { describe, expect, it, vi } from 'vitest'
import { createLogger, shouldLogAtLevel } from '../src/logger.js'

describe('Logger', () => {
  describe('shouldLogAtLevel', () => {
    it('should return false when currentLevel is undefined', () => {
      expect(shouldLogAtLevel(undefined, 'info')).toBe(false)
      expect(shouldLogAtLevel(undefined, 'debug')).toBe(false)
      expect(shouldLogAtLevel(undefined, 'warn')).toBe(false)
      expect(shouldLogAtLevel(undefined, 'error')).toBe(false)
    })

    it('should respect log level hierarchy - debug allows all levels', () => {
      expect(shouldLogAtLevel('debug', 'debug')).toBe(true)
      expect(shouldLogAtLevel('debug', 'info')).toBe(true)
      expect(shouldLogAtLevel('debug', 'warn')).toBe(true)
      expect(shouldLogAtLevel('debug', 'error')).toBe(true)
    })

    it('should respect log level hierarchy - info blocks debug', () => {
      expect(shouldLogAtLevel('info', 'debug')).toBe(false)
      expect(shouldLogAtLevel('info', 'info')).toBe(true)
      expect(shouldLogAtLevel('info', 'warn')).toBe(true)
      expect(shouldLogAtLevel('info', 'error')).toBe(true)
    })

    it('should respect log level hierarchy - warn blocks debug and info', () => {
      expect(shouldLogAtLevel('warn', 'debug')).toBe(false)
      expect(shouldLogAtLevel('warn', 'info')).toBe(false)
      expect(shouldLogAtLevel('warn', 'warn')).toBe(true)
      expect(shouldLogAtLevel('warn', 'error')).toBe(true)
    })

    it('should respect log level hierarchy - error blocks all except error', () => {
      expect(shouldLogAtLevel('error', 'debug')).toBe(false)
      expect(shouldLogAtLevel('error', 'info')).toBe(false)
      expect(shouldLogAtLevel('error', 'warn')).toBe(false)
      expect(shouldLogAtLevel('error', 'error')).toBe(true)
    })
  })

  describe('Logger class', () => {
    it('should not log when level is blocked by logger configuration', () => {
      const logger = createLogger('error') // Very restrictive level
      const spy = vi.spyOn(console, 'log').mockImplementation(() => {})

      // info < error, so this should be blocked
      logger.info('This should not be logged')

      expect(spy).not.toHaveBeenCalled()
      spy.mockRestore()
    })

    it('should log when level is allowed by logger configuration', () => {
      const logger = createLogger('debug') // Very permissive level
      const spy = vi.spyOn(console, 'log').mockImplementation(() => {})

      logger.info('This should be logged')

      expect(spy).toHaveBeenCalledWith('This should be logged')
      spy.mockRestore()
    })
  })
})
