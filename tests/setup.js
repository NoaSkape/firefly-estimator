// Test setup file
import { vi } from 'vitest'

// Mock environment variables for tests
process.env.SALES_TAX_RATE = '0.0825'
process.env.MONGODB_URI = 'mongodb://localhost:27017/test'
process.env.CLERK_SECRET_KEY = 'test_secret_key'
process.env.STRIPE_SECRET_KEY = 'sk_test_test'

// Mock console methods to reduce noise in tests
global.console = {
  ...console,
  log: vi.fn(),
  debug: vi.fn(),
  info: vi.fn(),
  warn: vi.fn(),
  error: vi.fn(),
}

// Mock fetch globally
global.fetch = vi.fn()

// Mock localStorage
global.localStorage = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  clear: vi.fn(),
}

// Mock window.location
Object.defineProperty(window, 'location', {
  value: {
    pathname: '/',
    search: '',
    href: 'http://localhost:3000/',
  },
  writable: true,
})

// Mock window.history
Object.defineProperty(window, 'history', {
  value: {
    back: vi.fn(),
    pushState: vi.fn(),
  },
  writable: true,
})
