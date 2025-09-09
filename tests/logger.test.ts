import { describe, expect, it, vi } from 'vitest'
import { createLogger, createModuleLogger, LoggerFactory, shouldLogAtLevel } from '../src/logger.js'

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

    it('should log without module prefix when moduleName is not provided', () => {
      const logger = createLogger('info') // No module name
      const spy = vi.spyOn(console, 'log').mockImplementation(() => {})

      logger.info('Message without prefix')

      expect(spy).toHaveBeenCalledWith('Message without prefix')
      spy.mockRestore()
    })
  })

  describe('createModuleLogger', () => {
    it('should create module logger with extracted name from file path', () => {
      const logger = createModuleLogger('info', '/path/to/module.ts')
      const spy = vi.spyOn(console, 'log').mockImplementation(() => {})

      logger.info('test message')

      expect(spy).toHaveBeenCalledWith('[module] test message')
      spy.mockRestore()
    })

    it('should handle javascript extension', () => {
      const logger = createModuleLogger('debug', '/path/to/file.js')
      const spy = vi.spyOn(console, 'log').mockImplementation(() => {})

      logger.info('test message')

      expect(spy).toHaveBeenCalledWith('[file] test message')
      spy.mockRestore()
    })

    it('should handle path without extension', () => {
      const logger = createModuleLogger('warn', '/path/to/noextension')
      const spy = vi.spyOn(console, 'warn').mockImplementation(() => {})

      logger.warn('test message')

      expect(spy).toHaveBeenCalledWith('[noextension] test message')
      spy.mockRestore()
    })

    it('should handle undefined or empty path', () => {
      const logger = createModuleLogger('error')
      const spy = vi.spyOn(console, 'error').mockImplementation(() => {})

      logger.error('test message')

      expect(spy).toHaveBeenCalledWith('[unknown] test message')
      spy.mockRestore()
    })

    it('should handle file path with no directory', () => {
      const logger = createModuleLogger('info', 'standalone.ts')
      const spy = vi.spyOn(console, 'log').mockImplementation(() => {})

      logger.info('test message')

      expect(spy).toHaveBeenCalledWith('[standalone] test message')
      spy.mockRestore()
    })

    it('should handle edge case with only extension', () => {
      const logger = createModuleLogger('info', '.ts')
      const spy = vi.spyOn(console, 'log').mockImplementation(() => {})

      logger.info('test message')

      // When moduleName is empty string, no prefix is added
      expect(spy).toHaveBeenCalledWith('test message')
      spy.mockRestore()
    })
  })

  describe('LoggerFactory', () => {
    it('should update log level for all existing loggers when setLevel is called', () => {
      const factory = new LoggerFactory()

      // Create a logger with default level
      const logger = factory.getModuleLogger('test.ts')
      const spy = vi.spyOn(console, 'log').mockImplementation(() => {})

      // Initially, debug should not be logged (default is 'info')
      logger.debug('debug message')
      expect(spy).not.toHaveBeenCalled()

      // Change global level to debug
      factory.setLevel('debug')

      // Now debug should be logged
      logger.debug('debug message after setLevel')
      expect(spy).toHaveBeenCalledWith('[test] debug message after setLevel')

      spy.mockRestore()
    })
  })
})
