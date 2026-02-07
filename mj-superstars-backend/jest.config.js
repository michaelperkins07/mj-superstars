// ============================================================
// MJ's Superstars Backend - Jest Configuration (ESM)
// ============================================================

export default {
  testEnvironment: 'node',

  // ESM support — no transform needed for native ESM
  transform: {},

  testMatch: [
    '<rootDir>/src/__tests__/**/*.test.js',
    '<rootDir>/src/**/*.test.js'
  ],

  testPathIgnorePatterns: ['/node_modules/'],

  collectCoverageFrom: [
    'src/**/*.js',
    '!src/__tests__/**',
    '!src/index.js'
  ],

  coverageThreshold: {
    global: {
      branches: 50,
      functions: 50,
      lines: 50,
      statements: 50
    }
  },

  coverageReporters: ['text', 'lcov'],
  verbose: true,
  maxWorkers: '50%',
  testTimeout: 15000,
  clearMocks: true,
  restoreMocks: true
};
