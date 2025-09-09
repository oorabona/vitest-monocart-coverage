// Simple math functions for browser coverage testing
export function add(a, b) {
  return a + b
}

export function multiply(a, b) {
  return a * b
}

export function divide(a, b) {
  if (b === 0) {
    throw new Error('Division by zero')
  }
  return a / b
}

export function isEven(num) {
  return num % 2 === 0
}

export function factorial(n) {
  if (n < 0) return undefined
  if (n === 0 || n === 1) return 1
  return n * factorial(n - 1)
}