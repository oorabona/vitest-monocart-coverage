/**
 * Logging utility for the Monocart coverage provider
 * Provides a clean interface for level-based logging with hierarchy checks
 */

type LogLevel = 'debug' | 'info' | 'warn' | 'error'

/**
 * Log level hierarchy - higher numbers indicate higher priority
 * debug < info < warn < error
 */
const LOG_LEVELS: Record<LogLevel, number> = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
} as const

/**
 * Logger utility class that encapsulates log level checking logic
 */
export class Logger {
  constructor(private currentLevel: LogLevel) {}

  /**
   * Check if a message should be logged based on the current logging level
   * @param targetLevel The level of the message to potentially log
   * @returns true if the message should be logged, false otherwise
   */
  shouldLog(targetLevel: LogLevel): boolean {
    return LOG_LEVELS[this.currentLevel] <= LOG_LEVELS[targetLevel]
  }

  /**
   * Log a message if the current logging level allows it
   * @param level The level of the message
   * @param message The message to log
   * @param logFn The logging function to use (defaults to console.log)
   */
  logIf(level: LogLevel, message: string, logFn: (msg: string) => void = console.log): void {
    if (this.shouldLog(level)) {
      logFn(message)
    }
  }

  /**
   * Conditional logging helpers for specific levels
   */
  /* v8 ignore next 3 */
  debug(message: string): void {
    this.logIf('debug', message)
  }

  info(message: string): void {
    this.logIf('info', message)
  }

  warn(message: string): void {
    this.logIf('warn', message, console.warn)
  }

  /* v8 ignore next 3 */
  error(message: string): void {
    this.logIf('error', message, console.error)
  }
}

/**
 * Create a logger instance with the specified level
 */
export function createLogger(level: LogLevel): Logger {
  return new Logger(level)
}

/**
 * Standalone utility function to check if logging should occur at a specific level
 * Useful for conditional blocks that need to do more than just log a simple message
 */
export function shouldLogAtLevel(
  currentLevel: LogLevel | undefined,
  targetLevel: LogLevel,
): boolean {
  if (!currentLevel) {
    return false // If no logging level is set, don't log
  }
  return LOG_LEVELS[currentLevel] <= LOG_LEVELS[targetLevel]
}
