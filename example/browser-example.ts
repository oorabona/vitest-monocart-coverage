/**
 * Browser example module for testing real browser functionality
 * This module demonstrates actual browser capabilities that can be tested
 */

export interface UserPreferences {
  theme: 'light' | 'dark'
  language: string
  notifications: boolean
}

export class BrowserStorage {
  private prefix: string

  constructor(prefix = 'app') {
    this.prefix = prefix
  }

  /**
   * Save user preferences to localStorage
   */
  savePreferences(preferences: UserPreferences): void {
    const key = `${this.prefix}:preferences`
    localStorage.setItem(key, JSON.stringify(preferences))
  }

  /**
   * Load user preferences from localStorage
   */
  loadPreferences(): UserPreferences | null {
    const key = `${this.prefix}:preferences`
    const stored = localStorage.getItem(key)
    
    if (!stored) {
      return null
    }

    try {
      return JSON.parse(stored) as UserPreferences
    } catch {
      // Invalid JSON, return null and clean up
      localStorage.removeItem(key)
      return null
    }
  }

  /**
   * Clear all app data from storage
   */
  clearAll(): void {
    const keys = Object.keys(localStorage)
    const appKeys = keys.filter(key => key.startsWith(`${this.prefix}:`))
    
    for (const key of appKeys) {
      localStorage.removeItem(key)
    }
  }

  /**
   * Check if storage is available and functional
   */
  isStorageAvailable(): boolean {
    try {
      const testKey = `${this.prefix}:test`
      localStorage.setItem(testKey, 'test')
      localStorage.removeItem(testKey)
      return true
    } catch {
      return false
    }
  }
}

export class DOMHelper {
  /**
   * Create a notification element
   */
  static createNotification(message: string, type: 'info' | 'warning' | 'error' = 'info'): HTMLElement {
    const notification = document.createElement('div')
    notification.className = `notification notification--${type}`
    notification.textContent = message
    
    // Add close button
    const closeBtn = document.createElement('button')
    closeBtn.textContent = '×'
    closeBtn.className = 'notification__close'
    closeBtn.onclick = () => notification.remove()
    
    notification.appendChild(closeBtn)
    return notification
  }

  /**
   * Show notification and auto-remove after delay
   */
  static showNotification(message: string, type: 'info' | 'warning' | 'error' = 'info', autoRemove = 3000): HTMLElement {
    const notification = this.createNotification(message, type)
    document.body.appendChild(notification)
    
    if (autoRemove > 0) {
      setTimeout(() => {
        if (notification.parentNode) {
          notification.remove()
        }
      }, autoRemove)
    }
    
    return notification
  }

  /**
   * Find all elements with data attributes
   */
  static findByDataAttribute(attribute: string, value?: string): NodeListOf<Element> {
    const selector = value 
      ? `[data-${attribute}="${value}"]`
      : `[data-${attribute}]`
    return document.querySelectorAll(selector)
  }
}

export class AsyncDataLoader {
  private cache = new Map<string, any>()
  private loadingPromises = new Map<string, Promise<any>>()

  /**
   * Load data with caching and deduplication
   */
  async loadData(url: string, options: RequestInit = {}): Promise<any> {
    // Return cached data if available
    if (this.cache.has(url)) {
      return this.cache.get(url)
    }

    // Return existing promise if already loading
    if (this.loadingPromises.has(url)) {
      return this.loadingPromises.get(url)
    }

    // Start loading
    const loadPromise = this.fetchData(url, options)
    this.loadingPromises.set(url, loadPromise)

    try {
      const data = await loadPromise
      this.cache.set(url, data)
      return data
    } finally {
      this.loadingPromises.delete(url)
    }
  }

  private async fetchData(url: string, options: RequestInit): Promise<any> {
    const response = await fetch(url, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
    })

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`)
    }

    return response.json()
  }

  /**
   * Clear cache
   */
  clearCache(): void {
    this.cache.clear()
  }

  /**
   * Check if data is cached
   */
  isCached(url: string): boolean {
    return this.cache.has(url)
  }
}