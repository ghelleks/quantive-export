/**
 * Jest Global Setup
 * 
 * Sets up gas-mock-globals and test environment for all tests
 */

// Import gas-mock-globals to provide Google Apps Script mocks
require('gas-mock-globals');

// Import fetch mock for HTTP request mocking
require('jest-fetch-mock').enableMocks();

// Import credential manager for integration tests
const { getCredentialManager } = require('./credentials');

// Load the Google Apps Script code
const { loadGoogleAppsScriptCode } = require('./code-loader');

// Load Code.gs after mocks are set up
try {
  console.log('🔄 Loading Code.gs classes...');
  const loadResult = loadGoogleAppsScriptCode();
  console.log('✅ Code.gs loaded successfully from jest.setup.js');
} catch (error) {
  console.error('❌ Failed to load Code.gs in jest.setup.js:', error.message);
  console.error('Stack trace:', error.stack);
}

// Global test utilities
global.testUtils = {
  credentialManager: getCredentialManager(),
  
  // Helper to skip tests if no real credentials
  skipIfNoCredentials: function(testDescription) {
    if (!this.credentialManager.canRunIntegrationTests()) {
      test.skip(`${testDescription} - SKIPPED: No valid credentials`);
      return true;
    }
    return false;
  },
  
  // Helper to get mock session data
  getMockSessions: function() {
    return [
      { id: '12345678-abcd-1234-efgh-123456789012', name: 'Q4 2024 OKRs' },
      { id: '87654321-dcba-4321-hgfe-210987654321', name: 'Development Goals' },
      { id: '11111111-2222-3333-4444-555555555555', name: 'Test Session' },
      { id: '99999999-8888-7777-6666-555555555555', name: 'Special Characters & Symbols!' }
    ];
  },
  
  // Helper to get mock API responses
  getMockApiResponse: function(sessions = null) {
    return {
      ok: true,
      status: 200,
      json: async () => sessions || this.getMockSessions()
    };
  }
};

// Configure console to be less verbose during tests
const originalConsoleLog = console.log;
console.log = (...args) => {
  // Only show logs that don't start with [Mock or [GAS
  if (!args[0] || (!args[0].toString().startsWith('[Mock') && !args[0].toString().startsWith('[GAS'))) {
    originalConsoleLog(...args);
  }
};

// Setup global timeout for integration tests
if (process.env.API_TEST_TIMEOUT) {
  jest.setTimeout(parseInt(process.env.API_TEST_TIMEOUT));
}

// Global test hooks
beforeEach(() => {
  // Reset fetch mocks before each test
  fetch.resetMocks();
  
  // Clear any existing properties in mock PropertiesService
  if (global.PropertiesService && global.PropertiesService.getScriptProperties) {
    const props = global.PropertiesService.getScriptProperties();
    if (props.deleteAllProperties) {
      props.deleteAllProperties();
    }
  }
});

afterEach(() => {
  // Clean up after each test
  jest.clearAllMocks();
});