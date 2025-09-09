/**
 * Browser test to validate Vitest browser mode with Monocart coverage
 * This test imports actual source files to generate meaningful coverage data
 */

import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest'
import { AsyncDataLoader, BrowserStorage, DOMHelper } from '../example/browser-example.ts'

describe('Browser Environment', () => {
  test('should detect browser environment', () => {
    expect(typeof window).toBe('object')
    expect(typeof document).toBe('object')
    expect(typeof navigator).toBe('object')
  })

  test('should have DOM manipulation capabilities', () => {
    // Create an element
    const div = document.createElement('div')
    div.textContent = 'Test content'
    div.className = 'test-class'

    // Add to DOM
    document.body.appendChild(div)

    // Verify it's in DOM
    const found = document.querySelector('.test-class')
    expect(found).toBe(div)
    expect(found?.textContent).toBe('Test content')

    // Clean up
    document.body.removeChild(div)
  })

  test('should support CSS styles with coverage', () => {
    // Add a style element to test CSS coverage
    const style = document.createElement('style')
    style.textContent = `
      .coverage-test {
        color: blue;
        background-color: yellow;
        padding: 10px;
      }
      .unused-class {
        display: none;
      }
    `
    document.head.appendChild(style)

    const div = document.createElement('div')
    div.className = 'coverage-test'
    div.textContent = 'CSS Coverage Test'

    document.body.appendChild(div)

    const computed = window.getComputedStyle(div)
    expect(computed.color).toMatch(/blue|rgb\(0,\s*0,\s*255\)/)
    expect(computed.backgroundColor).toMatch(/yellow|rgb\(255,\s*255,\s*0\)/)

    // Clean up
    document.body.removeChild(div)
    document.head.removeChild(style)
  })
})

// Sample functions to test coverage
function coveredFunction() {
  return 'This function will be covered'
}

function partiallyTestedFunction(condition: boolean) {
  if (condition) {
    return 'covered branch'
  } else {
    return 'uncovered branch' // This won't be tested
  }
}

function _uncoveredFunction() {
  return 'This function will not be covered'
}

describe('Source Code Coverage Testing', () => {
  test('should support basic math operations for coverage', () => {
    // Simple math functions to generate coverage
    const add = (a: number, b: number) => a + b
    const classify = (num: number) => (num % 2 === 0 ? 'even' : 'odd')

    expect(add(1, 2)).toBe(3)
    expect(classify(2)).toBe('even')
    expect(classify(3)).toBe('odd')

    const div = document.createElement('div')
    document.body.appendChild(div)
    div.style.color = 'rgb(0, 128, 0)'
    const color = window.getComputedStyle(div).color
    expect(color).toMatch(/rgb\(0,\s*128,\s*0\)/)
    document.body.removeChild(div)
  })

  test('should test local functions for coverage', () => {
    // This will cover coveredFunction
    expect(coveredFunction()).toBe('This function will be covered')

    // This will partially cover partiallyTestedFunction
    expect(partiallyTestedFunction(true)).toBe('covered branch')

    // uncoveredFunction is never called, so it should show as uncovered
  })

  test('should import and test external source files', async () => {
    // Import the math module to get it instrumented for coverage
    const math = await import('../example/math.js')

    // Test basic operations - this will create coverage data
    expect(math.add(1, 2)).toBe(3)
    expect(math.multiply(3, 4)).toBe(12)
    expect(math.divide(10, 2)).toBe(5)

    // Test utility functions
    expect(math.isEven(2)).toBe(true)
    expect(math.isEven(3)).toBe(false)

    // Test factorial with various inputs
    expect(math.factorial(0)).toBe(1)
    expect(math.factorial(5)).toBe(120)
    expect(math.factorial(-1)).toBe(undefined)

    // Test error case
    expect(() => math.divide(5, 0)).toThrow('Division by zero')
  })
})

describe('BrowserStorage', () => {
  let storage: BrowserStorage

  beforeEach(() => {
    storage = new BrowserStorage('test')
    // Clean up before each test
    storage.clearAll()
  })

  afterEach(() => {
    // Clean up after each test
    storage.clearAll()
  })

  test('should save and load preferences', () => {
    const preferences = {
      theme: 'dark' as const,
      language: 'en',
      notifications: true,
    }

    storage.savePreferences(preferences)
    const loaded = storage.loadPreferences()

    expect(loaded).toEqual(preferences)
  })

  test('should return null for missing preferences', () => {
    const loaded = storage.loadPreferences()
    expect(loaded).toBeNull()
  })

  test('should handle invalid JSON gracefully', () => {
    // Manually set invalid JSON
    localStorage.setItem('test:preferences', 'invalid-json{')

    const loaded = storage.loadPreferences()
    expect(loaded).toBeNull()

    // Should clean up invalid data
    expect(localStorage.getItem('test:preferences')).toBeNull()
  })

  test('should clear all app data', () => {
    storage.savePreferences({
      theme: 'light',
      language: 'fr',
      notifications: false,
    })

    localStorage.setItem('test:other', 'value')
    localStorage.setItem('other:data', 'keep')

    storage.clearAll()

    expect(storage.loadPreferences()).toBeNull()
    expect(localStorage.getItem('test:other')).toBeNull()
    expect(localStorage.getItem('other:data')).toBe('keep')
  })

  test('should detect storage availability', () => {
    expect(storage.isStorageAvailable()).toBe(true)
  })

  test('should handle storage unavailability', () => {
    // Mock localStorage to throw an error
    const originalSetItem = localStorage.setItem
    localStorage.setItem = vi.fn().mockImplementation(() => {
      throw new Error('Storage disabled')
    })

    expect(storage.isStorageAvailable()).toBe(false)

    // Restore original localStorage
    localStorage.setItem = originalSetItem
  })
})

describe('DOMHelper', () => {
  afterEach(() => {
    // Clean up DOM after each test
    document.querySelectorAll('.notification').forEach(el => {
      el.remove()
    })
    document.querySelectorAll('[data-test]').forEach(el => {
      el.remove()
    })
  })

  test('should create notification element', () => {
    const notification = DOMHelper.createNotification('Test message', 'info')

    expect(notification.tagName).toBe('DIV')
    expect(notification.className).toBe('notification notification--info')
    expect(notification.textContent).toContain('Test message')

    const closeBtn = notification.querySelector('.notification__close')
    expect(closeBtn).toBeTruthy()
  })

  test('should handle close button click', () => {
    const notification = DOMHelper.createNotification('Test close', 'info')
    document.body.appendChild(notification)

    expect(document.body.contains(notification)).toBe(true)

    const closeBtn = notification.querySelector('.notification__close') as HTMLButtonElement
    closeBtn.click()

    expect(document.body.contains(notification)).toBe(false)
  })

  test('should show notification in DOM', () => {
    const notification = DOMHelper.showNotification('Test', 'warning', 0)

    expect(document.body.contains(notification)).toBe(true)
    expect(notification.className).toContain('notification--warning')
  })

  test('should auto-remove notifications', async () => {
    const notification = DOMHelper.showNotification('Auto-remove', 'error', 100)

    expect(document.body.contains(notification)).toBe(true)

    // Wait for auto-removal
    await new Promise(resolve => setTimeout(resolve, 150))

    expect(document.body.contains(notification)).toBe(false)
  })

  test('should handle notification already removed before timeout', async () => {
    const notification = DOMHelper.showNotification('Manual remove', 'info', 100)

    expect(document.body.contains(notification)).toBe(true)

    // Manually remove notification before timeout
    notification.remove()
    expect(document.body.contains(notification)).toBe(false)

    // Wait for timeout to execute (should handle missing parentNode gracefully)
    await new Promise(resolve => setTimeout(resolve, 150))

    // Should not throw error and notification should still be gone
    expect(document.body.contains(notification)).toBe(false)
  })

  test('should find elements by data attribute', () => {
    // Create test elements
    const div1 = document.createElement('div')
    div1.setAttribute('data-test', 'value1')
    document.body.appendChild(div1)

    const div2 = document.createElement('div')
    div2.setAttribute('data-test', 'value2')
    document.body.appendChild(div2)

    const div3 = document.createElement('div')
    div3.setAttribute('data-other', 'value3')
    document.body.appendChild(div3)

    // Test finding by attribute only
    const allTestElements = DOMHelper.findByDataAttribute('test')
    expect(allTestElements.length).toBe(2)

    // Test finding by attribute and value
    const specificElement = DOMHelper.findByDataAttribute('test', 'value1')
    expect(specificElement.length).toBe(1)
    expect(specificElement[0]).toBe(div1)
  })
})

describe('AsyncDataLoader', () => {
  let loader: AsyncDataLoader

  beforeEach(() => {
    loader = new AsyncDataLoader()

    // Mock fetch for browser environment
    Object.defineProperty(globalThis, 'fetch', {
      value: vi.fn(),
      writable: true,
      configurable: true,
    })
  })

  test('should load and cache data', async () => {
    const mockData = { id: 1, name: 'test' }
    fetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve(mockData),
    })

    const result = await loader.loadData('/api/test')

    expect(result).toEqual(mockData)
    expect(loader.isCached('/api/test')).toBe(true)
  })

  test('should return cached data on subsequent calls', async () => {
    const mockData = { id: 1, name: 'test' }
    fetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve(mockData),
    })

    // First call
    const result1 = await loader.loadData('/api/test')
    // Second call (should use cache)
    const result2 = await loader.loadData('/api/test')

    expect(result1).toEqual(mockData)
    expect(result2).toEqual(mockData)
    expect(fetch).toHaveBeenCalledTimes(1)
  })

  test('should deduplicate concurrent requests', async () => {
    const mockData = { id: 1, name: 'concurrent' }

    // Mock fetch with a promise that we can resolve later
    let resolvePromise: (value: any) => void
    const fetchPromise = new Promise(resolve => {
      resolvePromise = resolve
    })

    fetch.mockReturnValueOnce(fetchPromise)

    // Make two concurrent calls - should reuse the same loading promise
    const promise1 = loader.loadData('/api/concurrent')
    const promise2 = loader.loadData('/api/concurrent')

    // Resolve the mock fetch
    resolvePromise?.({
      ok: true,
      json: () => Promise.resolve(mockData),
    })

    const [result1, result2] = await Promise.all([promise1, promise2])

    expect(result1).toEqual(mockData)
    expect(result2).toEqual(mockData)
    expect(fetch).toHaveBeenCalledTimes(1)

    // Both calls should return the same result (deduplication worked)
    expect(loader.isCached('/api/concurrent')).toBe(true)
  })

  test('should handle HTTP errors', async () => {
    fetch.mockResolvedValueOnce({
      ok: false,
      status: 404,
      statusText: 'Not Found',
    })

    await expect(loader.loadData('/api/missing')).rejects.toThrow('HTTP 404: Not Found')
  })

  test('should clear cache', async () => {
    const mockData = { id: 1, name: 'test' }
    fetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(mockData),
    })

    await loader.loadData('/api/test')
    expect(loader.isCached('/api/test')).toBe(true)

    loader.clearCache()
    expect(loader.isCached('/api/test')).toBe(false)
  })
})
