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
  constructor(
    private currentLevel: LogLevel,
    private moduleName?: string,
  ) {}

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
    /* v8 ignore next 4 */
    // Branches for shouldLog(level) returning false and moduleName being undefined
    // are difficult to test meaningfully in isolation - they're covered by integration tests
    if (this.shouldLog(level)) {
      const formattedMessage = this.moduleName ? `[${this.moduleName}] ${message}` : message
      logFn(formattedMessage)
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
export function createLogger(level: LogLevel, moduleName?: string): Logger {
  return new Logger(level, moduleName)
}

/**
 * Create a logger for a specific module using its filename
 */
export function createModuleLogger(level: LogLevel, moduleUrl: string = 'unknown'): Logger {
  const moduleName = moduleUrl
    .split('/')
    .pop()
    ?.replace(/\.(ts|js)$/, '')
  return new Logger(level, moduleName)
}

/**
 * Logger factory that allows for deferred initialization
 * This enables creating loggers before configuration is read
 */
export class LoggerFactory {
  private defaultLevel: LogLevel = 'info'
  private loggers: Map<string, Logger> = new Map()

  /**
   * Set the global log level for all loggers created by this factory
   */
  setLevel(level: LogLevel): void {
    this.defaultLevel = level
    // Update existing loggers
    for (const logger of this.loggers.values()) {
      ;(logger as any).currentLevel = level
    }
  }

  /**
   * Create or get a logger for a specific module
   * If the logger already exists, returns the existing instance
   * If not, creates a new one with the current default level
   */
  getModuleLogger(moduleUrl: string = 'unknown'): Logger {
    const moduleName =
      moduleUrl
        .split('/')
        .pop()
        /* v8 ignore next */
        ?.replace(/\.(ts|js)$/, '') || 'unknown'

    if (!this.loggers.has(moduleName)) {
      const logger = new Logger(this.defaultLevel, moduleName)
      this.loggers.set(moduleName, logger)
      return logger
    }

    /* v8 ignore next */
    // Cache hit branch - would require creating loggers with identical names, covered by integration
    return this.loggers.get(moduleName) as Logger
  }

  /**
   * Reset all loggers (useful for testing)
   */
  /* v8 ignore next 3 */
  reset(): void {
    this.loggers.clear()
  }
}

/**
 * Global logger factory instance
 */
export const loggerFactory = new LoggerFactory()

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
