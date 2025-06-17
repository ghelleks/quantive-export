module.exports = {
  setupFiles: ['<rootDir>/test/setup/global-setup.js'],
  setupFilesAfterEnv: ['<rootDir>/test/setup/jest.setup.js'],
  testEnvironment: 'node',
  collectCoverageFrom: [
    'Code.gs',
    '!test/**'
  ],
  testMatch: [
    '<rootDir>/test/**/*.test.js'
  ],
  // Separate test configurations for different test types
  projects: [
    {
      displayName: 'unit',
      testMatch: ['<rootDir>/test/unit/**/*.test.js'],
      setupFiles: ['<rootDir>/test/setup/global-setup.js'],
      setupFilesAfterEnv: ['<rootDir>/test/setup/test-specific-setup.js'],
      testEnvironment: 'node'
    },
    {
      displayName: 'integration', 
      testMatch: ['<rootDir>/test/integration/**/*.test.js'],
      setupFiles: ['<rootDir>/test/setup/global-setup.js'],
      setupFilesAfterEnv: ['<rootDir>/test/setup/test-specific-setup.js'],
      testEnvironment: 'node'
    }
  ],

  // Coverage settings
  coverageDirectory: 'coverage',
  coverageReporters: ['text', 'lcov', 'html'],
  coverageThreshold: {
    global: {
      branches: 80,
      functions: 85,
      lines: 85,
      statements: 85
    }
  },

  // Transform settings for Google Apps Script code
  transform: {
    '^.+\\.js$': 'babel-jest',
    '^.+\\.gs$': 'babel-jest'
  },

  // Module settings
  moduleFileExtensions: ['js', 'gs'],
  
  // Verbose output for debugging
  verbose: true
};